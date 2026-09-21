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

  // Como as mensagens de WhatsApp sao enviadas:
  //   'manual'  = links wa.me (voce toca enviar; gratis e sem risco de bloqueio)
  //   'baileys' = envio automatico via Baileys (robo; anti-bloqueio reforçado)
  WHATSAPP_MODE: z.enum(['manual', 'baileys']).default('manual'),

  // --- Anti-bloqueio do robo (modo baileys) ------------------------------
  // Limite de mensagens automaticas por dia (protege numeros novos).
  WHATSAPP_DAILY_LIMIT: z.coerce.number().default(80),
  // Janela de envio (hora local 0-23): fora disso o robo espera.
  WHATSAPP_SEND_START_HOUR: z.coerce.number().default(8),
  WHATSAPP_SEND_END_HOUR: z.coerce.number().default(21),
  // Intervalo aleatorio entre mensagens (segundos).
  WHATSAPP_MIN_GAP_SEC: z.coerce.number().default(25),
  WHATSAPP_MAX_GAP_SEC: z.coerce.number().default(75),

  // 'pagbank' = cobranca Pix real | 'fake' = modo de teste (simula pagamento)
  PAYMENTS_MODE: z.enum(['pagbank', 'fake']).default('pagbank'),
  PAGBANK_BASE_URL: z.string().url().default('https://sandbox.api.pagseguro.com'),
  PAGBANK_TOKEN: z.string().min(1, 'Defina o PAGBANK_TOKEN'),
  // Documento da conta/empresa usado quando o cliente nao informa CPF/CNPJ.
  // O PagBank exige customer.tax_id no endpoint /orders.
  PAGBANK_CUSTOMER_TAX_ID: z.string().optional().default(''),

  RESERVATION_MINUTES: z.coerce.number().default(5),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('\n[env] Variaveis de ambiente invalidas:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
