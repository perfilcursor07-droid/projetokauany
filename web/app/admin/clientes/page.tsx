"use client";

import { useEffect, useState } from "react";
import { api, brl, formatDateTime } from "@/lib/api";

type Client = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  noShowCount: number;
  cancelCount: number;
};

type Detail = {
  client: Client;
  totalSpent: number;
  history: { id: string; date: string; service: string; amount: number; status: string }[];
};

export default function ClientesPage() {
  const [items, setItems] = useState<Client[]>([]);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    try {
      setItems(await api<Client[]>(`/api/admin/clients?q=${encodeURIComponent(q)}`, { auth: true }));
    } catch (e: any) {
      setError(e.message);
    }
  }
  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [q]);

  async function open(id: string) {
    setSelected(await api<Detail>(`/api/admin/clients/${id}`, { auth: true }));
  }

  async function deleteClient() {
    if (!selected) return;
    const ok = window.confirm(`Excluir ${selected.client.name} da lista de clientes? O histórico antigo continua salvo.`);
    if (!ok) return;

    setDeleting(true);
    setError(null);
    try {
      await api(`/api/admin/clients/${selected.client.id}`, { method: "DELETE", auth: true });
      setSelected(null);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeleting(false);
    }
  }

  const totalNoShows = items.reduce((sum, c) => sum + c.noShowCount, 0);
  const totalCancels = items.reduce((sum, c) => sum + c.cancelCount, 0);

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-accent-100 bg-white p-4 shadow-sm shadow-accent-100/40">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-accent-200 bg-accent-50 px-2.5 py-1 text-[11px] font-semibold uppercase text-accent-700">
              <UsersIcon className="h-3.5 w-3.5" />
              Cadastro
            </div>
            <h1 className="font-display text-2xl text-sand-900">Clientes</h1>
            <p className="mt-1 text-sm text-sand-500">
              Lista completa para consultar contato, faltas, cancelamentos e histórico.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:min-w-[360px]">
            <Summary label="Clientes" value={String(items.length)} />
            <Summary label="Faltas" value={String(totalNoShows)} tone="warn" />
            <Summary label="Cancel." value={String(totalCancels)} tone="rose" />
          </div>
        </div>
      </section>

      <div className="rounded-lg border border-accent-100 bg-white p-3 shadow-sm shadow-accent-100/40">
        <label className="relative block">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent-400" />
          <input
            placeholder="Buscar por nome ou telefone..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full rounded-lg border border-accent-100 bg-white px-9 py-2.5 text-sm outline-none placeholder:text-sand-400 focus:border-accent-300 focus:bg-white"
          />
        </label>
      </div>

      {error && <p className="mb-4 text-red-600">{error}</p>}

      <section className="overflow-hidden rounded-lg border border-accent-100 bg-white shadow-sm shadow-accent-100/40">
        <div className="grid grid-cols-[1.4fr_1fr_0.8fr_120px] gap-3 border-b border-accent-100 bg-accent-50 px-4 py-2.5 text-[11px] font-semibold uppercase text-accent-700 max-lg:hidden">
          <span>Cliente</span>
          <span>Contato</span>
          <span>Ocorrências</span>
          <span className="text-right">Ação</span>
        </div>

        {items.map((c) => {
          const active = selected?.client.id === c.id;
          return (
            <button
              key={c.id}
              onClick={() => open(c.id)}
              className={`grid w-full gap-3 border-b border-accent-50 px-4 py-3 text-left transition last:border-0 hover:bg-accent-50 lg:grid-cols-[1.4fr_1fr_0.8fr_120px] lg:items-center ${
                active ? "bg-accent-50" : ""
              }`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-100 font-display text-base text-accent-700">
                  {c.name.trim().charAt(0).toUpperCase() || "C"}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-sand-900">{c.name}</p>
                  <p className="text-xs text-sand-400">Cliente #{c.id}</p>
                </div>
              </div>

              <div className="min-w-0 text-sm">
                <p className="truncate font-medium text-sand-700">{c.phone}</p>
                <p className="truncate text-xs text-sand-400">{c.email || "Sem e-mail"}</p>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                <Badge label={`${c.noShowCount} faltas`} tone={c.noShowCount > 0 ? "danger" : "muted"} />
                <Badge label={`${c.cancelCount} canc.`} tone={c.cancelCount > 0 ? "warn" : "muted"} />
              </div>

              <span className="inline-flex items-center justify-start gap-1.5 text-xs font-semibold text-accent-700 lg:justify-end">
                Histórico
                <ChevronIcon className="h-3.5 w-3.5" />
              </span>
            </button>
          );
        })}

        {items.length === 0 && (
          <div className="flex items-center gap-3 p-6 text-sm text-sand-400">
            <UsersIcon className="h-5 w-5 text-accent-400" />
            Nenhuma cliente encontrada.
          </div>
        )}
      </section>

      {selected && (
        <section className="rounded-lg border border-accent-100 bg-white p-4 shadow-sm shadow-accent-100/40">
          <div className="flex flex-col gap-3 border-b border-accent-50 pb-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent-600 font-display text-lg text-white">
                {selected.client.name.trim().charAt(0).toUpperCase() || "C"}
              </span>
              <div>
                <h2 className="font-display text-xl text-sand-900">{selected.client.name}</h2>
                <p className="text-sm text-sand-500">{selected.client.phone}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-lg border border-accent-200 bg-accent-50 px-3 py-1.5 text-sm font-semibold text-accent-700">
                Total gasto: {brl(selected.totalSpent)}
              </span>
              <span className="rounded-lg border border-sand-200 bg-sand-50 px-3 py-1.5 text-sm font-medium text-sand-600">
                {selected.client.noShowCount} faltas
              </span>
              <span className="rounded-lg border border-sand-200 bg-sand-50 px-3 py-1.5 text-sm font-medium text-sand-600">
                {selected.client.cancelCount} cancelamentos
              </span>
              <button
                type="button"
                onClick={deleteClient}
                disabled={deleting}
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
              >
                {deleting ? "Excluindo..." : "Excluir cliente"}
              </button>
            </div>
          </div>

          <div className="mt-4">
            <h3 className="mb-3 text-sm font-semibold text-sand-900">Histórico de atendimentos</h3>
            <div className="overflow-hidden rounded-lg border border-accent-100">
              {selected.history.map((h) => (
                <div
                  key={h.id}
                  className="grid gap-2 border-b border-accent-50 px-4 py-3 text-sm last:border-0 md:grid-cols-[1fr_1.2fr_140px]"
                >
                  <span className="font-medium text-sand-700">{formatDateTime(h.date)}</span>
                  <span className="text-sand-500">{h.service}</span>
                  <span className="font-semibold text-sand-900 md:text-right">{brl(h.amount)}</span>
                </div>
              ))}
              {selected.history.length === 0 && (
                <p className="p-4 text-sm text-sand-400">Sem atendimentos ainda.</p>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function Summary({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warn" | "rose";
}) {
  const cls =
    tone === "warn"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : tone === "rose"
        ? "border-accent-200 bg-accent-50 text-accent-700"
        : "border-accent-100 bg-white text-sand-900";
  return (
    <div className={`rounded-lg border p-3 ${cls}`}>
      <p className="text-[11px] font-semibold uppercase opacity-70">{label}</p>
      <p className="mt-1 font-display text-xl leading-tight">{value}</p>
    </div>
  );
}

function Badge({ label, tone }: { label: string; tone: "muted" | "warn" | "danger" }) {
  const cls =
    tone === "danger"
      ? "border-red-200 bg-red-50 text-red-600"
      : tone === "warn"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-sand-200 bg-sand-50 text-sand-500";
  return <span className={`rounded-full border px-2.5 py-1 font-medium ${cls}`}>{label}</span>;
}

function IconBase({
  children,
  className = "h-5 w-5",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M16 20v-1.5c0-1.7-1.8-3-4-3s-4 1.3-4 3V20" />
      <circle cx="12" cy="9" r="3" />
      <path d="M4 19v-1c0-1.3 1.1-2.4 2.7-2.8" />
      <path d="M20 19v-1c0-1.3-1.1-2.4-2.7-2.8" />
    </IconBase>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </IconBase>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="m9 18 6-6-6-6" />
    </IconBase>
  );
}
