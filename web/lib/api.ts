const BASE = process.env.NEXT_PUBLIC_API_URL || "";

type ApiOptions = RequestInit & { auth?: boolean };

export async function api<T = any>(path: string, opts: ApiOptions = {}): Promise<T> {
  const headers = new Headers(opts.headers);
  if (opts.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (opts.auth && typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message = data?.message || `Erro ${res.status}`;
    throw new Error(message);
  }
  return data as T;
}

export const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

export const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
