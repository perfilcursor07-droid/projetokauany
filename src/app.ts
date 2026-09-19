import Fastify, { type FastifyRequest, type FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { ZodError } from 'zod';
import { env } from './config/env.js';
import { authRoutes } from './routes/auth.routes.js';
import { publicRoutes } from './routes/public.routes.js';
import { adminRoutes } from './routes/admin.routes.js';
import { webhookRoutes } from './routes/webhooks.routes.js';
import { whatsappRoutes } from './routes/whatsapp.routes.js';

export function buildApp() {
  const app = Fastify({
    logger: {
      transport:
        env.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } }
          : undefined,
    },
  });

  app.register(cors, { origin: true });

  app.register(jwt, { secret: env.JWT_SECRET });

  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ message: 'Nao autorizado' });
    }
  });

  // Healthcheck.
  app.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }));

  // Rotas.
  app.register(authRoutes, { prefix: '/api/auth' });
  app.register(publicRoutes, { prefix: '/api/public' });
  app.register(adminRoutes, { prefix: '/api/admin' });
  app.register(whatsappRoutes, { prefix: '/api/admin/whatsapp' });
  app.register(webhookRoutes, { prefix: '/api/webhooks' });

  // Tratamento de erros.
  app.setErrorHandler((error, _req, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({ message: 'Dados invalidos', issues: error.flatten() });
    }
    reply.log.error(error);
    const status = (error as { statusCode?: number }).statusCode ?? 500;
    return reply.code(status >= 400 && status < 600 ? status : 500).send({
      message: status >= 500 ? 'Erro interno' : error.message,
    });
  });

  return app;
}
