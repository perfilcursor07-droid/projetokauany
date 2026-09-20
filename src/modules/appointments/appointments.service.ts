import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.js';

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && aEnd > bStart;
}

export function computeDeposit(
  price: Prisma.Decimal,
  depositType: string,
  depositValue: Prisma.Decimal
): number {
  const priceNum = Number(price);
  const depNum = Number(depositValue);
  if (depositType === 'fixed') return Math.min(depNum, priceNum);
  if (depositType === 'percentage') return Math.round(priceNum * (depNum / 100) * 100) / 100;
  return 0;
}

export interface CreateAppointmentInput {
  businessId: bigint;
  serviceId: bigint;
  professionalId?: bigint;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  client: { name: string; phone: string; email?: string | null };
  notes?: string | null;
  // Quando true (agendamento manual pelo painel), ja cria como confirmado
  // e sem exigir sinal/expiracao.
  confirm?: boolean;
}

export class AppointmentError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
  }
}

export async function expireAppointmentIfNeeded(token: string) {
  const appointment = await prisma.appointment.findUnique({ where: { token } });
  if (
    appointment?.status === 'pending_payment' &&
    appointment.expiresAt &&
    appointment.expiresAt <= new Date()
  ) {
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: 'expired', paymentStatus: 'expired' },
    });
    await prisma.payment.updateMany({
      where: { appointmentId: appointment.id, status: 'pending' },
      data: { status: 'expired' },
    });
  }
}

export async function createPublicAppointment(input: CreateAppointmentInput) {
  const { businessId, serviceId, date, time, client, notes } = input;

  const service = await prisma.service.findFirst({
    where: { id: serviceId, businessId, active: true },
  });
  if (!service) throw new AppointmentError(404, 'Servico nao encontrado');

  // Resolve profissional (usa o informado ou o primeiro ativo do negocio).
  let professionalId = input.professionalId;
  if (!professionalId) {
    const prof = await prisma.professional.findFirst({
      where: { businessId, active: true },
      orderBy: { id: 'asc' },
    });
    if (!prof) throw new AppointmentError(400, 'Nenhum profissional disponivel');
    professionalId = prof.id;
  }

  const startAt = new Date(`${date}T${time}:00`);
  if (Number.isNaN(startAt.getTime())) {
    throw new AppointmentError(400, 'Data/hora invalida');
  }
  if (startAt <= new Date()) {
    throw new AppointmentError(400, 'Nao e possivel agendar no passado');
  }
  const endAt = addMinutes(startAt, service.durationMinutes);
  const busyEnd = addMinutes(endAt, service.bufferMinutes);

  const deposit = computeDeposit(service.price, service.depositType, service.depositValue);
  const requiresDeposit = !input.confirm && deposit > 0;

  const token = randomUUID();
  const expiresAt = requiresDeposit
    ? addMinutes(new Date(), env.RESERVATION_MINUTES)
    : null;

  // Transacao: confirma que o horario ainda esta livre e cria tudo junto.
  return prisma.$transaction(async (tx) => {
    const now = new Date();

    // Reagrupa conflitos com margem para pegar sobreposicoes parciais.
    const sameDay = await tx.appointment.findMany({
      where: {
        businessId,
        professionalId,
        startAt: {
          gte: new Date(`${date}T00:00:00`),
          lte: new Date(`${date}T23:59:59`),
        },
        OR: [
          { status: { in: ['confirmed', 'completed'] } },
          {
            status: 'pending_payment',
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
        ],
      },
      include: { service: { select: { bufferMinutes: true } } },
    });

    const conflict = sameDay.some((a) =>
      overlaps(startAt, busyEnd, a.startAt, addMinutes(a.endAt, a.service?.bufferMinutes ?? 0))
    );
    if (conflict) {
      throw new AppointmentError(409, 'Este horario acabou de ser reservado. Escolha outro.');
    }

    const blocks = await tx.blockedTime.findMany({
      where: {
        businessId,
        OR: [{ professionalId }, { professionalId: null }],
        startAt: { lt: busyEnd },
        endAt: { gt: startAt },
      },
    });
    if (blocks.length > 0) {
      throw new AppointmentError(409, 'Horario indisponivel');
    }

    // Cliente: reaproveita por telefone dentro do negocio.
    let dbClient = await tx.client.findFirst({
      where: { businessId, phone: client.phone },
    });
    if (!dbClient) {
      dbClient = await tx.client.create({
        data: {
          businessId,
          name: client.name,
          phone: client.phone,
          email: client.email ?? null,
        },
      });
    }

    const appointment = await tx.appointment.create({
      data: {
        businessId,
        clientId: dbClient.id,
        professionalId: professionalId!,
        serviceId,
        token,
        startAt,
        endAt,
        totalAmount: service.price,
        depositAmount: new Prisma.Decimal(deposit),
        status: requiresDeposit ? 'pending_payment' : 'confirmed',
        paymentStatus: 'pending',
        expiresAt,
        notes: notes ?? null,
      },
      include: { service: true, client: true, professional: true },
    });

    return { appointment, requiresDeposit };
  });
}

export async function getAppointmentByToken(token: string) {
  await expireAppointmentIfNeeded(token);
  return prisma.appointment.findUnique({
    where: { token },
    include: {
      service: true,
      professional: { select: { id: true, name: true } },
      client: { select: { name: true, phone: true } },
      payments: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });
}

export async function getPublicAppointmentsByPhone(businessId: bigint, phone: string) {
  const digits = phone.replace(/\D/g, '');
  const client = await prisma.client.findFirst({
    where: { businessId, phone: digits },
  });
  if (!client) return [];

  const since = new Date();
  since.setDate(since.getDate() - 30);
  since.setHours(0, 0, 0, 0);

  const appointments = await prisma.appointment.findMany({
    where: {
      businessId,
      clientId: client.id,
      startAt: { gte: since },
      status: { not: 'removed' },
    },
    include: {
      service: true,
      professional: { select: { id: true, name: true } },
      client: { select: { name: true, phone: true } },
      payments: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { startAt: 'asc' },
    take: 10,
  });

  for (const appointment of appointments) {
    if (appointment.status === 'pending_payment') {
      await expireAppointmentIfNeeded(appointment.token);
    }
  }

  return prisma.appointment.findMany({
    where: {
      businessId,
      clientId: client.id,
      startAt: { gte: since },
      status: { not: 'removed' },
    },
    include: {
      service: true,
      professional: { select: { id: true, name: true } },
      client: { select: { name: true, phone: true } },
      payments: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { startAt: 'asc' },
    take: 10,
  });
}
