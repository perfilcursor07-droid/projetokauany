import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import {
  createPublicAppointment,
  AppointmentError,
} from '../modules/appointments/appointments.service.js';

function businessIdOf(req: FastifyRequest): bigint {
  return BigInt(req.user.businessId);
}

export async function adminRoutes(app: FastifyInstance) {
  // Todas as rotas admin exigem autenticacao.
  app.addHook('preHandler', app.authenticate);

  // ======================= DASHBOARD ====================================
  app.get('/dashboard', async (req) => {
    const businessId = businessIdOf(req);
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(now);
    dayEnd.setHours(23, 59, 59, 999);

    const todays = await prisma.appointment.findMany({
      where: {
        businessId,
        startAt: { gte: dayStart, lte: dayEnd },
        status: { in: ['confirmed', 'completed', 'pending_payment'] },
      },
      include: { service: true, client: { select: { name: true } } },
      orderBy: { startAt: 'asc' },
    });

    const expected = todays.reduce((sum, a) => sum + Number(a.totalAmount), 0);
    const received = todays.reduce((sum, a) => {
      if (a.status === 'completed') return sum + Number(a.totalAmount);
      if (a.paymentStatus === 'paid') return sum + Number(a.depositAmount);
      return sum;
    }, 0);

    const next = todays.find((a) => a.startAt > now) ?? null;

    return {
      today: {
        count: todays.length,
        expectedRevenue: expected,
        receivedDeposits: received,
        toReceive: Math.max(expected - received, 0),
      },
      next: next
        ? {
            time: next.startAt,
            client: next.client.name,
            service: next.service.name,
            total: Number(next.totalAmount),
            depositPaid: next.paymentStatus === 'paid',
          }
        : null,
      appointments: todays.map((a) => ({
        id: a.id,
        time: a.startAt,
        client: a.client.name,
        service: a.service.name,
        status: a.status,
      })),
    };
  });

  // ======================= SERVICOS =====================================
  app.get('/services', async (req) => {
    const businessId = businessIdOf(req);
    return prisma.service.findMany({ where: { businessId }, orderBy: { name: 'asc' } });
  });

  const serviceSchema = z.object({
    name: z.string().min(2),
    description: z.string().optional().nullable(),
    price: z.number().positive(),
    depositType: z.enum(['none', 'fixed', 'percentage']).default('none'),
    depositValue: z.number().min(0).default(0),
    durationMinutes: z.number().int().positive(),
    bufferMinutes: z.number().int().min(0).default(0),
    active: z.boolean().default(true),
  });

  app.post('/services', async (req, reply) => {
    const businessId = businessIdOf(req);
    const parsed = serviceSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Dados invalidos', issues: parsed.error.flatten() });
    }
    const s = parsed.data;
    const created = await prisma.service.create({
      data: {
        businessId,
        name: s.name,
        description: s.description ?? null,
        price: new Prisma.Decimal(s.price),
        depositType: s.depositType,
        depositValue: new Prisma.Decimal(s.depositValue),
        durationMinutes: s.durationMinutes,
        bufferMinutes: s.bufferMinutes,
        active: s.active,
      },
    });
    return reply.code(201).send(created);
  });

  app.patch('/services/:id', async (req, reply) => {
    const businessId = businessIdOf(req);
    const { id } = z.object({ id: z.coerce.bigint() }).parse(req.params);
    const parsed = serviceSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Dados invalidos', issues: parsed.error.flatten() });
    }
    const existing = await prisma.service.findFirst({ where: { id, businessId } });
    if (!existing) return reply.code(404).send({ message: 'Servico nao encontrado' });

    const s = parsed.data;
    const updated = await prisma.service.update({
      where: { id },
      data: {
        ...(s.name !== undefined ? { name: s.name } : {}),
        ...(s.description !== undefined ? { description: s.description } : {}),
        ...(s.price !== undefined ? { price: new Prisma.Decimal(s.price) } : {}),
        ...(s.depositType !== undefined ? { depositType: s.depositType } : {}),
        ...(s.depositValue !== undefined ? { depositValue: new Prisma.Decimal(s.depositValue) } : {}),
        ...(s.durationMinutes !== undefined ? { durationMinutes: s.durationMinutes } : {}),
        ...(s.bufferMinutes !== undefined ? { bufferMinutes: s.bufferMinutes } : {}),
        ...(s.active !== undefined ? { active: s.active } : {}),
      },
    });
    return updated;
  });

  app.delete('/services/:id', async (req, reply) => {
    const businessId = businessIdOf(req);
    const { id } = z.object({ id: z.coerce.bigint() }).parse(req.params);
    const existing = await prisma.service.findFirst({ where: { id, businessId } });
    if (!existing) return reply.code(404).send({ message: 'Servico nao encontrado' });
    // Soft delete para nao quebrar historico de agendamentos.
    await prisma.service.update({ where: { id }, data: { active: false } });
    return { deactivated: true };
  });

  // ======================= CLIENTES =====================================
  app.get('/clients', async (req) => {
    const businessId = businessIdOf(req);
    const { q } = z.object({ q: z.string().optional() }).parse(req.query);
    return prisma.client.findMany({
      where: {
        businessId,
        ...(q ? { OR: [{ name: { contains: q } }, { phone: { contains: q } }] } : {}),
      },
      orderBy: { name: 'asc' },
      take: 200,
    });
  });

  app.get('/clients/:id', async (req, reply) => {
    const businessId = businessIdOf(req);
    const { id } = z.object({ id: z.coerce.bigint() }).parse(req.params);
    const client = await prisma.client.findFirst({ where: { id, businessId } });
    if (!client) return reply.code(404).send({ message: 'Cliente nao encontrado' });

    const history = await prisma.appointment.findMany({
      where: { clientId: id },
      include: { service: { select: { name: true } } },
      orderBy: { startAt: 'desc' },
      take: 50,
    });

    const totalSpent = history
      .filter((a) => a.status === 'completed')
      .reduce((s, a) => s + Number(a.totalAmount), 0);

    return {
      client,
      totalSpent,
      history: history.map((a) => ({
        id: a.id,
        date: a.startAt,
        service: a.service.name,
        amount: Number(a.totalAmount),
        status: a.status,
      })),
    };
  });

  // ======================= AGENDAMENTOS =================================
  app.get('/appointments', async (req) => {
    const businessId = businessIdOf(req);
    const { from, to, status } = z
      .object({
        from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        status: z.string().optional(),
      })
      .parse(req.query);

    const where: Prisma.AppointmentWhereInput = { businessId, status: { notIn: ['removed', 'expired'] } };
    if (from || to) {
      where.startAt = {
        ...(from ? { gte: new Date(`${from}T00:00:00`) } : {}),
        ...(to ? { lte: new Date(`${to}T23:59:59`) } : {}),
      };
    }
    if (status) where.status = status;

    return prisma.appointment.findMany({
      where,
      include: {
        service: { select: { name: true } },
        client: { select: { name: true, phone: true } },
        professional: { select: { name: true } },
      },
      orderBy: { startAt: 'asc' },
    });
  });

  // Criacao manual (ja confirmada, sem exigir sinal).
  app.post('/appointments', async (req, reply) => {
    const businessId = businessIdOf(req);
    const schema = z.object({
      serviceId: z.coerce.bigint(),
      professionalId: z.coerce.bigint().optional(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      time: z.string().regex(/^\d{2}:\d{2}$/),
      client: z.object({
        name: z.string().min(2),
        phone: z.string().min(8),
        email: z.string().email().optional().nullable(),
      }),
      notes: z.string().max(500).optional().nullable(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Dados invalidos', issues: parsed.error.flatten() });
    }
    try {
      const { appointment } = await createPublicAppointment({
        businessId,
        ...parsed.data,
        confirm: true,
      });
      return reply.code(201).send(appointment);
    } catch (err) {
      if (err instanceof AppointmentError) {
        return reply.code(err.statusCode).send({ message: err.message });
      }
      throw err;
    }
  });

  // Atualiza status (confirmar, concluir, cancelar, no_show).
  app.patch('/appointments/:id', async (req, reply) => {
    const businessId = businessIdOf(req);
    const { id } = z.object({ id: z.coerce.bigint() }).parse(req.params);
    const parsed = z
      .object({
        status: z
          .enum(['pending_payment', 'confirmed', 'completed', 'cancelled', 'no_show', 'expired'])
          .optional(),
        notes: z.string().max(500).optional().nullable(),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Dados invalidos', issues: parsed.error.flatten() });
    }

    const existing = await prisma.appointment.findFirst({ where: { id, businessId } });
    if (!existing) return reply.code(404).send({ message: 'Agendamento nao encontrado' });

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        ...(parsed.data.status ? { status: parsed.data.status } : {}),
        ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
      },
    });

    // Atualiza contadores da cliente em faltas/cancelamentos.
    if (parsed.data.status === 'no_show') {
      await prisma.client.update({
        where: { id: existing.clientId },
        data: { noShowCount: { increment: 1 } },
      });
    } else if (parsed.data.status === 'cancelled') {
      await prisma.client.update({
        where: { id: existing.clientId },
        data: { cancelCount: { increment: 1 } },
      });
    }

    return updated;
  });

  app.delete('/appointments/:id', async (req, reply) => {
    const businessId = businessIdOf(req);
    const { id } = z.object({ id: z.coerce.bigint() }).parse(req.params);

    const existing = await prisma.appointment.findFirst({ where: { id, businessId } });
    if (!existing) return reply.code(404).send({ message: 'Agendamento nao encontrado' });

    await prisma.appointment.update({
      where: { id },
      data: {
        status: 'removed',
        notes: existing.notes
          ? `${existing.notes}\n\nRemovido manualmente pelo painel.`
          : 'Removido manualmente pelo painel.',
      },
    });

    return { removed: true };
  });

  // ======================= HORARIOS DE FUNCIONAMENTO ====================
  app.get('/business-hours', async (req) => {
    const businessId = businessIdOf(req);
    return prisma.businessHour.findMany({ where: { businessId }, orderBy: { weekday: 'asc' } });
  });

  app.put('/business-hours', async (req, reply) => {
    const businessId = businessIdOf(req);
    const parsed = z
      .array(
        z.object({
          weekday: z.number().int().min(0).max(6),
          isOpen: z.boolean(),
          openTime: z.string().regex(/^\d{2}:\d{2}$/),
          closeTime: z.string().regex(/^\d{2}:\d{2}$/),
        })
      )
      .safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Dados invalidos', issues: parsed.error.flatten() });
    }

    for (const h of parsed.data) {
      await prisma.businessHour.upsert({
        where: { businessId_weekday: { businessId, weekday: h.weekday } },
        create: { businessId, ...h },
        update: { isOpen: h.isOpen, openTime: h.openTime, closeTime: h.closeTime },
      });
    }
    return prisma.businessHour.findMany({ where: { businessId }, orderBy: { weekday: 'asc' } });
  });

  // ======================= BLOQUEIOS ====================================
  app.get('/blocked-times', async (req) => {
    const businessId = businessIdOf(req);
    return prisma.blockedTime.findMany({ where: { businessId }, orderBy: { startAt: 'asc' } });
  });

  app.post('/blocked-times', async (req, reply) => {
    const businessId = businessIdOf(req);
    const parsed = z
      .object({
        professionalId: z.coerce.bigint().optional().nullable(),
        startAt: z.string(),
        endAt: z.string(),
        reason: z.string().max(255).optional().nullable(),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Dados invalidos', issues: parsed.error.flatten() });
    }
    const start = new Date(parsed.data.startAt);
    const end = new Date(parsed.data.endAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      return reply.code(400).send({ message: 'Periodo invalido' });
    }
    const created = await prisma.blockedTime.create({
      data: {
        businessId,
        professionalId: parsed.data.professionalId ?? null,
        startAt: start,
        endAt: end,
        reason: parsed.data.reason ?? null,
      },
    });
    return reply.code(201).send(created);
  });

  app.delete('/blocked-times/:id', async (req, reply) => {
    const businessId = businessIdOf(req);
    const { id } = z.object({ id: z.coerce.bigint() }).parse(req.params);
    const existing = await prisma.blockedTime.findFirst({ where: { id, businessId } });
    if (!existing) return reply.code(404).send({ message: 'Bloqueio nao encontrado' });
    await prisma.blockedTime.delete({ where: { id } });
    return { deleted: true };
  });

  // ======================= CONFIGURACOES / IDENTIDADE ===================
  app.get('/settings', async (req) => {
    const businessId = businessIdOf(req);
    const business = await prisma.business.findUnique({ where: { id: businessId } });
    return {
      name: business?.name ?? '',
      logoUrl: business?.logoUrl ?? null,
      phone: business?.phone ?? null,
      slug: business?.slug ?? null,
    };
  });

  app.put('/settings', async (req, reply) => {
    const businessId = businessIdOf(req);
    const parsed = z
      .object({
        name: z.string().min(2).max(150).optional(),
        // Aceita URL http(s) ou data URL de imagem (base64). Null remove a logo.
        logoUrl: z.string().max(2_000_000).nullable().optional(),
        phone: z.string().max(30).nullable().optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Dados invalidos', issues: parsed.error.flatten() });
    }
    const updated = await prisma.business.update({
      where: { id: businessId },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.logoUrl !== undefined ? { logoUrl: parsed.data.logoUrl } : {}),
        ...(parsed.data.phone !== undefined ? { phone: parsed.data.phone } : {}),
      },
    });
    return { name: updated.name, logoUrl: updated.logoUrl, phone: updated.phone };
  });

  // ======================= FINANCEIRO (resumo) ==========================
  app.get('/payments', async (req) => {
    const businessId = businessIdOf(req);
    return prisma.payment.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  });
}
