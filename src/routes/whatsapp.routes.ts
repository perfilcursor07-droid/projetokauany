import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  connectWhatsapp,
  disconnectWhatsapp,
  getWhatsappStatus,
  sendText,
} from '../modules/whatsapp/whatsapp.service.js';
import { prisma } from '../lib/prisma.js';

function businessIdOf(req: FastifyRequest): bigint {
  return BigInt(req.user.businessId);
}

export async function whatsappRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  // Inicia a conexao (gera o QR Code para leitura).
  app.post('/connect', async (req) => {
    const businessId = businessIdOf(req);
    await connectWhatsapp(businessId);
    return getWhatsappStatus(businessId);
  });

  // Status atual + QR (o painel faz polling deste endpoint).
  app.get('/status', async (req) => {
    return getWhatsappStatus(businessIdOf(req));
  });

  // Desconecta e limpa a sessao.
  app.post('/disconnect', async (req) => {
    await disconnectWhatsapp(businessIdOf(req));
    return { status: 'disconnected' };
  });

  // Envio de teste (para validar a conexao).
  app.post('/test', async (req, reply) => {
    const parsed = z
      .object({ to: z.string().min(8), message: z.string().min(1).max(1000) })
      .safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Dados invalidos' });
    }
    const result = await sendText(businessIdOf(req), parsed.data.to, parsed.data.message);
    if (!result.ok) return reply.code(400).send({ message: result.error });
    return { sent: true, message: 'Mensagem aceita pelo WhatsApp' };
  });

  // Historico recente da fila. "sent" significa que o WhatsApp aceitou o
  // envio; a biblioteca nao garante confirmacao de entrega no aparelho.
  app.get('/notifications', async (req) => {
    const businessId = businessIdOf(req);
    const [business, notifications] = await Promise.all([
      prisma.business.findUnique({
        where: { id: businessId },
        select: { phone: true },
      }),
      prisma.notificationJob.findMany({
        where: { businessId, channel: 'whatsapp' },
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: {
          id: true,
          triggerKey: true,
          toPhone: true,
          body: true,
          status: true,
          error: true,
          createdAt: true,
          sentAt: true,
        },
      }),
    ]);

    return {
      mode: getWhatsappStatus(businessId).mode,
      studioPhone: business?.phone ?? null,
      notifications: notifications.map((item) => ({
        ...item,
        id: item.id.toString(),
      })),
    };
  });

  // Marca uma mensagem como enviada (usado no modo manual, apos abrir o wa.me).
  app.post('/notifications/:id/sent', async (req, reply) => {
    const parsed = z.object({ id: z.coerce.bigint() }).safeParse(req.params);
    if (!parsed.success) return reply.code(400).send({ message: 'Notificacao invalida' });

    const notification = await prisma.notificationJob.findFirst({
      where: { id: parsed.data.id, businessId: businessIdOf(req), channel: 'whatsapp' },
      select: { id: true },
    });
    if (!notification) return reply.code(404).send({ message: 'Notificacao nao encontrada' });

    await prisma.notificationJob.update({
      where: { id: notification.id },
      data: { status: 'sent', sentAt: new Date(), error: null },
    });
    return { marked: true };
  });

  // O reenvio so recoloca na fila uma notificacao pertencente ao negocio.
  app.post('/notifications/:id/retry', async (req, reply) => {
    const parsed = z.object({ id: z.coerce.bigint() }).safeParse(req.params);
    if (!parsed.success) return reply.code(400).send({ message: 'Notificacao invalida' });

    const notification = await prisma.notificationJob.findFirst({
      where: { id: parsed.data.id, businessId: businessIdOf(req), channel: 'whatsapp' },
      select: { id: true },
    });
    if (!notification) return reply.code(404).send({ message: 'Notificacao nao encontrada' });

    await prisma.notificationJob.update({
      where: { id: notification.id },
      data: { status: 'pending', scheduledFor: new Date(), sentAt: null, error: null },
    });
    return { queued: true };
  });
}
