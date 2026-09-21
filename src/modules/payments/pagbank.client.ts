import { env } from '../../config/env.js';

// ===========================================================================
// Cliente da Orders API do PagBank (PagSeguro) - foco em cobranca Pix.
// Docs: https://developer.pagbank.com.br/reference/criar-pedido
// ===========================================================================

const BASE = env.PAGBANK_BASE_URL.replace(/\/$/, '');

interface PagBankLink {
  rel: string;
  href: string;
  media?: string;
  type?: string;
}

interface PagBankQrCode {
  id: string;
  expiration_date?: string;
  amount?: { value: number };
  text: string;
  links?: PagBankLink[];
}

interface PagBankCharge {
  id: string;
  reference_id?: string;
  status: string; // AUTHORIZED, PAID, DECLINED, CANCELED, etc.
  paid_at?: string;
  qr_code?: PagBankQrCode;
  links?: PagBankLink[];
}

export interface PagBankOrder {
  id: string;
  reference_id?: string;
  qr_codes?: PagBankQrCode[];
  charges?: PagBankCharge[];
  [key: string]: unknown;
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.PAGBANK_TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init.headers ?? {}),
    },
  });

  const body = await res.text();
  const data = body ? JSON.parse(body) : {};

  if (!res.ok) {
    const message =
      data?.error_messages?.map((e: any) => e.description).join('; ') ||
      `PagBank retornou ${res.status}`;
    const err = new Error(message) as Error & { status?: number; body?: unknown };
    err.status = res.status;
    err.body = data;
    throw err;
  }

  return data as T;
}

// --- Melhor esforco para separar o telefone no formato do PagBank. ----------
function parsePhone(raw?: string | null) {
  if (!raw) return undefined;
  const digits = raw.replace(/\D/g, '');
  // Espera-se algo como 55 + DDD(2) + numero(8-9).
  const local = digits.startsWith('55') ? digits.slice(2) : digits;
  if (local.length < 10) return undefined;
  return [
    {
      country: '55',
      area: local.slice(0, 2),
      number: local.slice(2),
      type: 'MOBILE' as const,
    },
  ];
}

export interface CreatePixOrderParams {
  referenceId: string;
  amountCents: number;
  description: string;
  customer: {
    name: string;
    email?: string | null;
    phone?: string | null;
    taxId?: string | null;
  };
  expiresInMinutes: number;
  notificationUrl: string;
}

export async function createPixOrder(params: CreatePixOrderParams): Promise<PagBankOrder> {
  const expiration = new Date(Date.now() + params.expiresInMinutes * 60_000);
  const expirationDate = expiration.toISOString();

  const email =
    params.customer.email?.trim() ||
    `${(params.customer.phone || 'cliente').replace(/\D/g, '')}@naoinformado.com`;
  const taxId = (params.customer.taxId || env.PAGBANK_CUSTOMER_TAX_ID).replace(/\D/g, '');

  const body: Record<string, unknown> = {
    reference_id: params.referenceId,
    customer: {
      name: params.customer.name,
      email,
      ...(taxId ? { tax_id: taxId } : {}),
      ...(parsePhone(params.customer.phone) ? { phones: parsePhone(params.customer.phone) } : {}),
    },
    items: [
      {
        reference_id: params.referenceId,
        name: params.description,
        quantity: 1,
        unit_amount: params.amountCents,
      },
    ],
    charges: [
      {
        reference_id: params.referenceId,
        description: params.description,
        amount: {
          value: params.amountCents,
          currency: 'BRL',
        },
        payment_method: {
          type: 'PIX',
          pix: {
            expiration_date: expirationDate,
          },
        },
      },
    ],
    notification_urls: [params.notificationUrl],
  };

  return request<PagBankOrder>('/orders', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function getOrder(orderId: string): Promise<PagBankOrder> {
  return request<PagBankOrder>(`/orders/${orderId}`, { method: 'GET' });
}

// --- Helpers para extrair dados uteis da resposta. --------------------------
export function extractQrCode(order: PagBankOrder) {
  const charge = order.charges?.find((c) => c.qr_code) ?? order.charges?.[0];
  const qr = charge?.qr_code ?? order.qr_codes?.[0];
  if (!qr) return null;
  const image =
    charge?.links?.find((l) => l.media === 'image/png' || /PNG/i.test(l.rel))?.href ??
    qr.links?.find((l) => l.media === 'image/png' || /PNG/i.test(l.rel))?.href ??
    null;
  return {
    text: qr.text,
    imageUrl: image,
    expirationDate: qr.expiration_date ?? null,
  };
}

// Um pedido Pix esta pago quando existe uma charge com status PAID.
export function isOrderPaid(order: PagBankOrder): boolean {
  return (order.charges ?? []).some((c) => c.status === 'PAID');
}

export function getPaidCharge(order: PagBankOrder): PagBankCharge | undefined {
  return (order.charges ?? []).find((c) => c.status === 'PAID');
}
