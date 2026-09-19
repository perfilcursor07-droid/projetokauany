import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { resolvePublicBusiness } from '../lib/business.js';
import { getAvailableSlots } from '../modules/availability/availability.service.js';
import {
  createPublicAppointment,
  getAppointmentByToken,
  computeDeposit,
  AppointmentError,
} from '../modules/appointments/appointments.service.js';
import {
  createPixForAppointment,
  simulatePaymentByToken,
  isFakeMode,
  PaymentError,
} from '../modules/payments/payments.service.js';

export async function publicRoutes(app: FastifyInstance) {
  // --- Lista de servicos ativos ------------------------------------------
  app.get('/services', async (req, reply) => {
    const { slug } = z.object({ slug: z.string().optional() }).parse(req.query);
    const business = await resolvePublicBusiness(slug);
    if (!business) return reply.code(404).send({ message: 'Negocio nao encontrado' });

    const services = await prisma.service.findMany({
      where: { businessId: business.id, active: true },
      orderBy: { price: 'asc' },
    });

    return {
      business: {
        id: business.id,
        name: business.name,
        slug: business.slug,
        logoUrl: business.logoUrl,
      },
      services: services.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        price: Number(s.price),
        durationMinutes: s.durationMinutes,
        depositType: s.depositType,
        depositAmount: computeDeposit(s.price, s.depositType, s.depositValue),
      })),
    };
  });

  // --- Horarios disponiveis ----------------------------------------------
  app.get('/availability', async (req, reply) => {
    const schema = z.object({
      slug: z.string().optional(),
      serviceId: z.coerce.bigint(),
      professionalId: z.coerce.bigint().optional(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato YYYY-MM-DD'),
    });
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Parametros invalidos', issues: parsed.error.flatten() });
    }

    const business = await resolvePublicBusiness(parsed.data.slug);
    if (!business) return reply.code(404).send({ message: 'Negocio nao encontrado' });

    let professionalId = parsed.data.professionalId;
    if (!professionalId) {
      const prof = await prisma.professional.findFirst({
        where: { businessId: business.id, active: true },
        orderBy: { id: 'asc' },
      });
      if (!prof) return { date: parsed.data.date, slots: [] };
      professionalId = prof.id;
    }

    const slots = await getAvailableSlots({
      businessId: business.id,
      professionalId,
      serviceId: parsed.data.serviceId,
      date: parsed.data.date,
    });

    return { date: parsed.data.date, slots };
  });

  // --- Criacao do agendamento (reserva pendente de pagamento) ------------
  app.post('/appointments', async (req, reply) => {
    const schema = z.object({
      slug: z.string().optional(),
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

    const business = await resolvePublicBusiness(parsed.data.slug);
    if (!business) return reply.code(404).send({ message: 'Negocio nao encontrado' });

    try {
      const { appointment, requiresDeposit } = await createPublicAppointment({
        businessId: business.id,
        serviceId: parsed.data.serviceId,
        professionalId: parsed.data.professionalId,
        date: parsed.data.date,
        time: parsed.data.time,
        client: parsed.data.client,
        notes: parsed.data.notes,
      });

      return reply.code(201).send({
        token: appointment.token,
        status: appointment.status,
        requiresDeposit,
        appointment: {
          service: appointment.service.name,
          startAt: appointment.startAt,
          endAt: appointment.endAt,
          totalAmount: Number(appointment.totalAmount),
          depositAmount: Number(appointment.depositAmount),
        },
        // Proximo passo do fluxo, se precisar de sinal.
        next: requiresDeposit ? { action: 'pay_pix', endpoint: '/api/public/payments/pix' } : null,
      });
    } catch (err) {
      if (err instanceof AppointmentError) {
        return reply.code(err.statusCode).send({ message: err.message });
      }
      throw err;
    }
  });

  // --- Consulta do agendamento pela cliente (sem login) ------------------
  app.get('/appointments/:token', async (req, reply) => {
    const { token } = z.object({ token: z.string().uuid() }).parse(req.params);
    const appointment = await getAppointmentByToken(token);
    if (!appointment) return reply.code(404).send({ message: 'Agendamento nao encontrado' });

    const lastPayment = appointment.payments[0];
    return {
      token: appointment.token,
      status: appointment.status,
      paymentStatus: appointment.paymentStatus,
      service: appointment.service.name,
      professional: appointment.professional.name,
      startAt: appointment.startAt,
      endAt: appointment.endAt,
      totalAmount: Number(appointment.totalAmount),
      depositAmount: Number(appointment.depositAmount),
      expiresAt: appointment.expiresAt,
      payment: lastPayment
        ? {
            status: lastPayment.status,
            qrCodeText: lastPayment.qrCodeText,
            qrCodeImageUrl: lastPayment.qrCodeImageUrl,
            expiresAt: lastPayment.expiresAt,
          }
        : null,
    };
  });

  // --- Gera o Pix do sinal -----------------------------------------------
  app.post('/payments/pix', async (req, reply) => {
    const { token } = z.object({ token: z.string().uuid() }).parse(req.body);

    try {
      const { payment, appointment } = await createPixForAppointment(token);
      return {
        appointmentToken: token,
        amount: Number(payment.amount),
        expiresAt: payment.expiresAt,
        pix: {
          qrCodeText: payment.qrCodeText, // copia e cola
          qrCodeImageUrl: payment.qrCodeImageUrl,
        },
        service: appointment.service.name,
        test: isFakeMode(), // frontend mostra "Simular pagamento" quando true
      };
    } catch (err) {
      if (err instanceof PaymentError) {
        return reply.code(err.statusCode).send({ message: err.message });
      }
      throw err;
    }
  });

  // --- Simula o pagamento (apenas modo de teste) -------------------------
  app.post('/payments/simulate', async (req, reply) => {
    const { token } = z.object({ token: z.string().uuid() }).parse(req.body);
    try {
      const result = await simulatePaymentByToken(token);
      return result;
    } catch (err) {
      if (err instanceof PaymentError) {
        return reply.code(err.statusCode).send({ message: err.message });
      }
      throw err;
    }
  });
}
