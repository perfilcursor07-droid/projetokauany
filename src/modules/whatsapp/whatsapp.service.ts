import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers,
  type WASocket,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import QRCode from 'qrcode';
import pino from 'pino';
import { prisma } from '../../lib/prisma.js';
import { useSQLAuthState, hasSavedSession } from './auth-store.js';

type ConnStatus = 'disconnected' | 'connecting' | 'connected';

interface ConnState {
  sock: WASocket | null;
  status: ConnStatus;
  qr: string | null; // data URL
  phoneNumber: string | null;
  reconnectAttempts: number;
  starting: boolean;
}

const logger = pino({ level: 'silent' });
const connections = new Map<string, ConnState>();

function keyOf(businessId: bigint) {
  return businessId.toString();
}

function getState(businessId: bigint): ConnState {
  const k = keyOf(businessId);
  let s = connections.get(k);
  if (!s) {
    s = {
      sock: null,
      status: 'disconnected',
      qr: null,
      phoneNumber: null,
      reconnectAttempts: 0,
      starting: false,
    };
    connections.set(k, s);
  }
  return s;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

async function persistSession(
  businessId: bigint,
  data: { status: ConnStatus; phoneNumber?: string | null; lastQr?: string | null },
) {
  await prisma.whatsappSession.upsert({
    where: { businessId },
    create: {
      businessId,
      status: data.status,
      phoneNumber: data.phoneNumber ?? null,
      lastQr: data.lastQr ?? null,
      connectedAt: data.status === 'connected' ? new Date() : null,
    },
    update: {
      status: data.status,
      ...(data.phoneNumber !== undefined ? { phoneNumber: data.phoneNumber } : {}),
      ...(data.lastQr !== undefined ? { lastQr: data.lastQr } : {}),
      ...(data.status === 'connected' ? { connectedAt: new Date() } : {}),
    },
  });
}

export async function connectWhatsapp(businessId: bigint): Promise<ConnStatus> {
  const state = getState(businessId);
  if (state.status === 'connected') return 'connected';
  if (state.starting) return state.status;
  state.starting = true;

  const { state: authState, saveCreds, clear } = await useSQLAuthState(businessId);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: authState,
    logger,
    printQRInTerminal: false,
    // Nome de dispositivo realista ajuda a evitar bloqueio.
    browser: Browsers.appropriate('Chrome'),
    markOnlineOnConnect: false, // nao "sequestra" as notificacoes do celular
    syncFullHistory: false,
  });

  state.sock = sock;
  state.status = 'connecting';
  state.starting = false;

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      state.qr = await QRCode.toDataURL(qr);
      state.status = 'connecting';
      await persistSession(businessId, { status: 'connecting', lastQr: state.qr }).catch(() => {});
    }

    if (connection === 'open') {
      state.status = 'connected';
      state.qr = null;
      state.reconnectAttempts = 0;
      state.phoneNumber = sock.user?.id?.split(':')[0]?.split('@')[0] ?? null;
      await persistSession(businessId, {
        status: 'connected',
        phoneNumber: state.phoneNumber,
        lastQr: null,
      }).catch(() => {});
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;

      state.status = 'disconnected';
      state.sock = null;

      if (loggedOut) {
        // Sessao encerrada no celular: limpa credenciais para novo QR.
        await clear().catch(() => {});
        state.qr = null;
        await persistSession(businessId, { status: 'disconnected', phoneNumber: null, lastQr: null }).catch(() => {});
        return;
      }

      // Reconexao com backoff (evita marteladas que geram bloqueio).
      state.reconnectAttempts += 1;
      if (state.reconnectAttempts <= 5) {
        const wait = Math.min(30_000, 2_000 * state.reconnectAttempts);
        await persistSession(businessId, { status: 'connecting' }).catch(() => {});
        setTimeout(() => connectWhatsapp(businessId).catch(() => {}), wait);
      } else {
        await persistSession(businessId, { status: 'disconnected' }).catch(() => {});
      }
    }
  });

  return state.status;
}

export async function disconnectWhatsapp(businessId: bigint): Promise<void> {
  const state = getState(businessId);
  const { clear } = await useSQLAuthState(businessId);
  try {
    await state.sock?.logout();
  } catch {
    /* ignora */
  }
  state.sock = null;
  state.status = 'disconnected';
  state.qr = null;
  state.phoneNumber = null;
  await clear().catch(() => {});
  await persistSession(businessId, { status: 'disconnected', phoneNumber: null, lastQr: null }).catch(() => {});
}

export function getWhatsappStatus(businessId: bigint) {
  const state = getState(businessId);
  return {
    status: state.status,
    phoneNumber: state.phoneNumber,
    qr: state.qr,
  };
}

export function isConnected(businessId: bigint): boolean {
  return getState(businessId).status === 'connected';
}

// Normaliza um telefone BR para JID e confirma se existe no WhatsApp.
async function resolveJid(sock: WASocket, phone: string): Promise<string | null> {
  let digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  if (!digits.startsWith('55') && digits.length <= 11) digits = '55' + digits;

  const [result] = await sock.onWhatsApp(digits).catch(() => [] as any);
  if (result?.exists) return result.jid;
  return null;
}

// Envio humanizado: presenca "digitando" + pausas aleatorias (anti-bloqueio).
export async function sendText(
  businessId: bigint,
  phone: string,
  text: string,
): Promise<{ ok: boolean; error?: string }> {
  const state = getState(businessId);
  if (state.status !== 'connected' || !state.sock) {
    return { ok: false, error: 'WhatsApp desconectado' };
  }

  const sock = state.sock;
  const jid = await resolveJid(sock, phone);
  if (!jid) return { ok: false, error: 'Numero nao encontrado no WhatsApp' };

  try {
    await sock.presenceSubscribe(jid);
    await delay(rand(400, 900));
    await sock.sendPresenceUpdate('composing', jid);
    // Tempo de "digitacao" proporcional ao tamanho da mensagem.
    await delay(Math.min(6000, 800 + text.length * rand(20, 45)));
    await sock.sendPresenceUpdate('paused', jid);
    await sock.sendMessage(jid, { text });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

// No boot: reconecta negocios que ja tem sessao salva.
export async function reconnectSavedSessions(): Promise<void> {
  const businesses = await prisma.business.findMany({ where: { active: true }, select: { id: true } });
  for (const b of businesses) {
    if (await hasSavedSession(b.id)) {
      connectWhatsapp(b.id).catch(() => {});
    }
  }
}
