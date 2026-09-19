import {
  initAuthCreds,
  BufferJSON,
  proto,
  type AuthenticationCreds,
  type AuthenticationState,
} from '@whiskeysockets/baileys';
import { prisma } from '../../lib/prisma.js';

// Armazena o estado de autenticacao do Baileys no MySQL (tabela whatsapp_auth),
// em vez de usar useMultiFileAuthState (arquivos). Assim a VPS pode reiniciar
// que a sessao continua conectada.
export async function useSQLAuthState(businessId: bigint): Promise<{
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
  clear: () => Promise<void>;
}> {
  async function readData(key: string): Promise<any> {
    const row = await prisma.whatsappAuth.findUnique({
      where: { businessId_key: { businessId, key } },
    });
    if (!row) return null;
    return JSON.parse(row.value, BufferJSON.reviver);
  }

  async function writeData(key: string, value: unknown): Promise<void> {
    const data = JSON.stringify(value, BufferJSON.replacer);
    await prisma.whatsappAuth.upsert({
      where: { businessId_key: { businessId, key } },
      create: { businessId, key, value: data },
      update: { value: data },
    });
  }

  async function removeData(key: string): Promise<void> {
    await prisma.whatsappAuth.deleteMany({ where: { businessId, key } });
  }

  const creds: AuthenticationCreds = (await readData('creds')) || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data: { [id: string]: any } = {};
          await Promise.all(
            ids.map(async (id) => {
              let value = await readData(`${type}-${id}`);
              if (type === 'app-state-sync-key' && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value);
              }
              data[id] = value;
            }),
          );
          return data;
        },
        set: async (data) => {
          const tasks: Promise<void>[] = [];
          for (const category in data) {
            const cat = (data as any)[category];
            for (const id in cat) {
              const value = cat[id];
              const key = `${category}-${id}`;
              tasks.push(value ? writeData(key, value) : removeData(key));
            }
          }
          await Promise.all(tasks);
        },
      },
    },
    saveCreds: () => writeData('creds', creds),
    clear: async () => {
      await prisma.whatsappAuth.deleteMany({ where: { businessId } });
    },
  };
}

// Ha credenciais salvas para este negocio? (usado para reconectar no boot)
export async function hasSavedSession(businessId: bigint): Promise<boolean> {
  const row = await prisma.whatsappAuth.findUnique({
    where: { businessId_key: { businessId, key: 'creds' } },
  });
  return !!row;
}
