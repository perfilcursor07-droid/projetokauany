import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3333),
  HOST: z.string().default('0.0.0.0'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL e obrigatorio'),

  PUBLIC_API_URL: z.string().url().default('http://localhost:3333'),

  JWT_SECRET: z.string().min(10, 'Defina um JWT_SECRET forte'),
  JWT_EXPIRES_IN: z.string().default('1d'),

  // 'pagbank' = cobranca Pix real | 'fake' = modo de teste (simula pagamento)
  PAYMENTS_MODE: z.enum(['pagbank', 'fake']).default('pagbank'),
  PAGBANK_BASE_URL: z.string().url().default('https://sandbox.api.pagseguro.com'),
  PAGBANK_TOKEN: z.string().min(1, 'Defina o PAGBANK_TOKEN'),

  RESERVATION_MINUTES: z.coerce.number().default(5),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('\n[env] Variaveis de ambiente invalidas:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
