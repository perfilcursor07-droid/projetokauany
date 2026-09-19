import { prisma } from '../../lib/prisma.js';
import { isConnected, sendText } from './whatsapp.service.js';

// Worker leve que consome a fila notification_jobs e envia pelo WhatsApp.
// Roda dentro do processo da API. Se o WhatsApp cair, os jobs ficam pendentes
// e sao reenviados quando reconectar.
//
// Anti-bloqueio: processa poucos por ciclo e espaca os envios (o proprio
// sendText ja adiciona presenca "digitando" + pausas aleatorias).

const TICK_MS = 10_000; // verifica a fila a cada 10s
const BATCH = 3; // no maximo 3 mensagens por ciclo
const GAP_MIN = 4_000; // intervalo minimo entre mensagens
const GAP_MAX = 9_000;

let running = false;
let timer: NodeJS.Timeout | null = null;

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

async function tick() {
  if (running) return;
  running = true;
  try {
    const now = new Date();
    const jobs = await prisma.notificationJob.findMany({
      where: {
        status: 'pending',
        channel: 'whatsapp',
        scheduledFor: { lte: now },
      },
      orderBy: { scheduledFor: 'asc' },
      take: BATCH,
    });

    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i]!;

      // Sem conexao para esse negocio: deixa pendente para a proxima.
      if (!isConnected(job.businessId)) continue;

      const result = await sendText(job.businessId, job.toPhone, job.body);

      if (result.ok) {
        await prisma.notificationJob.update({
          where: { id: job.id },
          data: { status: 'sent', sentAt: new Date(), error: null },
        });
      } else {
        await prisma.notificationJob.update({
          where: { id: job.id },
          data: { status: 'failed', error: result.error ?? 'erro desconhecido' },
        });
      }

      // Espaca o proximo envio (anti-bloqueio).
      if (i < jobs.length - 1) await delay(rand(GAP_MIN, GAP_MAX));
    }
  } catch {
    /* nao derruba o worker por causa de um ciclo */
  } finally {
    running = false;
  }
}

export function startNotificationWorker() {
  if (timer) return;
  timer = setInterval(() => void tick(), TICK_MS);
}

export function stopNotificationWorker() {
  if (timer) clearInterval(timer);
  timer = null;
}
