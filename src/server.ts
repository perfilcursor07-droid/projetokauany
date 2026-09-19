import { buildApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { startNotificationWorker, stopNotificationWorker } from './modules/whatsapp/notifications.worker.js';
import { reconnectSavedSessions } from './modules/whatsapp/whatsapp.service.js';

const app = buildApp();

async function start() {
  try {
    await prisma.$connect();
    await app.listen({ port: env.PORT, host: env.HOST });
    app.log.info(`API rodando em ${env.PUBLIC_API_URL}`);

    // WhatsApp: reconecta sessoes salvas e inicia o worker de mensagens.
    startNotificationWorker();
    reconnectSavedSessions().catch((e) => app.log.warn(e, 'falha ao reconectar WhatsApp'));
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

async function shutdown() {
  stopNotificationWorker();
  await app.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

start();
