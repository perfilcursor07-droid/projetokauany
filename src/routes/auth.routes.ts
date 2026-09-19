import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function authRoutes(app: FastifyInstance) {
  app.post('/login', async (req, reply) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Dados invalidos', issues: parsed.error.flatten() });
    }

    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.active) {
      return reply.code(401).send({ message: 'Credenciais invalidas' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return reply.code(401).send({ message: 'Credenciais invalidas' });
    }

    const token = await reply.jwtSign(
      {
        sub: user.id.toString(),
        businessId: user.businessId.toString(),
        role: user.role,
        name: user.name,
      },
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    return {
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  });

  // Retorna os dados do usuario logado (util para o painel).
  app.get('/me', { preHandler: [app.authenticate] }, async (req) => {
    return { user: req.user };
  });
}
