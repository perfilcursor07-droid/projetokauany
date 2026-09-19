import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { confirmPaymentByOrderId } from '../modules/payments/payments.service.js';

export async function webhookRoutes(app: FastifyInstance) {
  // PagBank chama esta URL quando o status do pedido muda (ex.: Pix pago).
  app.post('/pagbank', async (req, reply) => {
    const payload = (req.body ?? {}) as Record<string, unknown>;

    // O pedido (order) vem com id no topo. Charges/qr_codes ficam aninhados.
    const orderId = typeof payload.id === 'string' ? payload.id : null;
    const referenceId =
      typeof payload.reference_id === 'string' ? payload.reference_id : null;

    // Sempre registra o webhook bruto para auditoria/reprocessamento.
    await prisma.$executeRaw`
      INSERT INTO payment_webhooks
        (provider, provider_order_id, reference_id, payload, signature_valid, processed)
      VALUES
        ('pagbank', ${orderId}, ${referenceId},
         ${JSON.stringify(payload)}, ${Boolean(req.headers['x-authenticity-token'])}, FALSE)
    `;

    // Sempre respondemos 200 rapido (PagBank reenvia em caso de erro).
    if (!orderId) {
      return reply.code(200).send({ received: true, note: 'sem order id' });
    }

    try {
      const result = await confirmPaymentByOrderId(orderId);
      await prisma.$executeRaw`
        UPDATE payment_webhooks SET processed = TRUE WHERE provider_order_id = ${orderId}
      `;
      req.log.info({ orderId, result }, 'webhook pagbank processado');
    } catch (err) {
      req.log.error({ err, orderId }, 'falha ao processar webhook pagbank');
      // Nao retornamos erro: evitamos loop de reenvio; reprocessa via log.
    }

    return reply.code(200).send({ received: true });
  });
}
