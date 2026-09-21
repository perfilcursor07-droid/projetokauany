"use client";

import { useEffect, useState } from "react";
import { api, brl, formatTime } from "@/lib/api";

type Dashboard = {
  today: {
    count: number;
    expectedRevenue: number;
    receivedDeposits: number;
    toReceive: number;
  };
  next: {
    time: string;
    client: string;
    service: string;
    total: number;
    depositPaid: boolean;
  } | null;
  appointments: {
    id: string;
    time: string;
    client: string;
    service: string;
    status: string;
  }[];
};

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  pending_payment: { label: "Aguardando sinal", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  confirmed: { label: "Confirmado", cls: "bg-accent-50 text-accent-700 border-accent-200" },
  completed: { label: "Concluído", cls: "bg-sand-100 text-sand-600 border-sand-200" },
  cancelled: { label: "Cancelado", cls: "bg-sand-50 text-sand-400 border-sand-200" },
  no_show: { label: "Faltou", cls: "bg-red-50 text-red-600 border-red-200" },
  expired: { label: "Expirado", cls: "bg-sand-50 text-sand-400 border-sand-200" },
};

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Dashboard>("/api/admin/dashboard", { auth: true })
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!data) return <p className="text-sand-400">Carregando…</p>;

  const maxFinancial = Math.max(
    data.today.expectedRevenue,
    data.today.receivedDeposits,
    data.today.toReceive,
    1,
  );
  const receivedPct = Math.min(100, (data.today.receivedDeposits / maxFinancial) * 100);
  const pendingPct = Math.min(100, (data.today.toReceive / maxFinancial) * 100);
  const expectedPct = Math.min(100, (data.today.expectedRevenue / maxFinancial) * 100);
  const completionPct =
    data.today.expectedRevenue > 0
      ? Math.min(100, (data.today.receivedDeposits / data.today.expectedRevenue) * 100)
      : 0;

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-accent-100 bg-white p-4 shadow-sm shadow-accent-100/40">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-accent-200 bg-accent-50 px-2.5 py-1 text-[11px] font-semibold uppercase text-accent-700">
              <CalendarIcon className="h-3.5 w-3.5" />
              Resumo do dia
            </div>
            <h1 className="font-display text-2xl leading-tight text-sand-900">
              Hoje
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-5 text-sand-500">
              Visão rápida dos atendimentos, recebimentos e próximos horários.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:min-w-[280px]">
            <MiniMetric label="Recebido" value={brl(data.today.receivedDeposits)} tone="rose" />
            <MiniMetric label="A receber" value={brl(data.today.toReceive)} />
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          icon={UsersIcon}
          label="Atendimentos"
          value={String(data.today.count)}
          hint="Marcados para hoje"
        />
        <Stat
          icon={WalletIcon}
          label="Previsto"
          value={brl(data.today.expectedRevenue)}
          hint="Receita total do dia"
        />
        <Stat
          icon={CheckIcon}
          label="Recebido"
          value={brl(data.today.receivedDeposits)}
          hint="Sinais e concluídos"
        />
        <Stat
          icon={ClockIcon}
          label="A receber"
          value={brl(data.today.toReceive)}
          hint="Saldo pendente"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border border-accent-100 bg-white p-4 shadow-sm shadow-accent-100/40">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl text-sand-900">Financeiro de hoje</h2>
              <p className="mt-0.5 text-xs text-sand-500">Previsto, recebido e saldo pendente</p>
            </div>
            <ChartIcon className="h-5 w-5 text-accent-600" />
          </div>

          <div className="grid gap-5 md:grid-cols-[150px_1fr] md:items-center">
            <DonutChart percent={completionPct} label="recebido" />
            <div className="space-y-3">
              <FinanceBar
                label="Previsto"
                value={brl(data.today.expectedRevenue)}
                percent={expectedPct}
                color="bg-accent-300"
              />
              <FinanceBar
                label="Recebido"
                value={brl(data.today.receivedDeposits)}
                percent={receivedPct}
                color="bg-accent-600"
              />
              <FinanceBar
                label="A receber"
                value={brl(data.today.toReceive)}
                percent={pendingPct}
                color="bg-rose-300"
              />
            </div>
          </div>
        </div>

        {data.next ? (
          <div className="rounded-lg border border-accent-100 bg-white p-4 shadow-sm shadow-accent-100/40">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-600 text-white">
                  <ClockIcon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-sand-400">Próximo atendimento</p>
                  <p className="mt-0.5 text-sm font-semibold text-sand-900">{data.next.client}</p>
                </div>
            </div>
              <p className="font-display text-3xl leading-none text-accent-700">
                {formatTime(data.next.time)}
              </p>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-accent-100 bg-accent-50 px-3 py-2.5">
              <div>
                <p className="text-sm font-medium text-sand-900">{data.next.service}</p>
                <p className="text-xs text-sand-500">Valor {brl(data.next.total)}</p>
              </div>
                {data.next.depositPaid ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-200 bg-accent-50 px-2.5 py-1 text-xs font-semibold text-accent-700">
                    <CheckIcon className="h-4 w-4" />
                    Sinal pago
                  </span>
                ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                    <ClockIcon className="h-4 w-4" />
                    Aguardando sinal
                  </span>
                )}
              </div>
            </div>
        ) : (
          <div className="rounded-lg border border-accent-100 bg-white p-4 shadow-sm">
            <div className="flex h-full min-h-32 flex-col justify-center">
              <p className="text-xs font-semibold uppercase text-accent-700">Próximo atendimento</p>
              <p className="mt-2 font-display text-2xl text-sand-900">Sem horários hoje</p>
              <p className="mt-1 text-sm text-sand-500">Quando houver agendamento, ele aparece aqui.</p>
            </div>
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl text-sand-900">Agenda de hoje</h2>
            <p className="mt-0.5 text-sm text-sand-500">Atendimentos em ordem de horário</p>
          </div>
          <span className="hidden rounded-full border border-accent-200 bg-accent-50 px-3 py-1 text-xs font-semibold text-accent-700 sm:inline-flex">
            {data.appointments.length} itens
          </span>
        </div>
        <div className="overflow-hidden rounded-lg border border-accent-100 bg-white shadow-sm shadow-accent-100/40">
        {data.appointments.length === 0 && (
          <div className="flex items-center gap-3 p-5 text-sm text-sand-400">
            <CalendarIcon className="h-5 w-5 text-accent-400" />
            Nenhum atendimento para hoje.
          </div>
        )}
        {data.appointments.map((a) => {
          const st = STATUS_LABEL[a.status] ?? { label: a.status, cls: "bg-sand-50 border-sand-200" };
          return (
            <div
              key={a.id}
              className="flex flex-col gap-3 border-b border-accent-50 px-4 py-3 transition last:border-0 hover:bg-accent-50 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 min-w-16 items-center justify-center rounded-lg border border-accent-100 bg-accent-50 font-display text-lg text-accent-700">
                  {formatTime(a.time)}
                </span>
                <div>
                  <p className="text-sm font-semibold text-sand-900">{a.client}</p>
                  <p className="mt-0.5 text-sm text-sand-500">{a.service}</p>
                </div>
              </div>
              <span className={`w-fit rounded-full border px-3 py-1.5 text-xs font-semibold ${st.cls}`}>
                {st.label}
              </span>
            </div>
          );
        })}
        </div>
      </section>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: (props: { className?: string }) => JSX.Element;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-lg border border-accent-100 bg-white p-3.5 shadow-sm shadow-accent-100/30 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-50 text-accent-700">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-[11px] font-semibold uppercase text-sand-400">{label}</p>
      <p className="mt-1 font-display text-[1.35rem] leading-tight text-sand-900">{value}</p>
      <p className="mt-1 text-xs text-sand-500">{hint}</p>
    </div>
  );
}

function MiniMetric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "rose";
}) {
  const cls =
    tone === "rose"
      ? "border-accent-200 bg-accent-50 text-accent-800"
      : "border-accent-100 bg-white text-sand-900";
  return (
    <div className={`rounded-lg border p-3 ${cls}`}>
      <p className="text-[11px] font-semibold uppercase opacity-70">{label}</p>
      <p className="mt-1 font-display text-xl leading-tight">{value}</p>
    </div>
  );
}

function DonutChart({ percent, label }: { percent: number; label: string }) {
  const rounded = Math.round(percent);
  return (
    <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-full bg-accent-50">
      <div
        className="flex h-28 w-28 items-center justify-center rounded-full"
        style={{
          background: `conic-gradient(#985f6f ${rounded * 3.6}deg, #f0e5e8 0deg)`,
        }}
      >
        <div className="flex h-20 w-20 flex-col items-center justify-center rounded-full bg-white text-center shadow-sm">
          <span className="font-display text-2xl leading-none text-accent-700">{rounded}%</span>
          <span className="mt-1 text-[10px] font-semibold uppercase text-sand-400">{label}</span>
        </div>
      </div>
    </div>
  );
}

function FinanceBar({
  label,
  value,
  percent,
  color,
}: {
  label: string;
  value: string;
  percent: number;
  color: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="font-medium text-sand-700">{label}</span>
        <span className="font-semibold text-sand-900">{value}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-sand-100">
        <div
          className={`h-full min-w-1 rounded-full ${color}`}
          style={{ width: `${Math.max(percent, 3)}%` }}
        />
      </div>
    </div>
  );
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
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M7 3v4" />
      <path d="M17 3v4" />
      <path d="M4 8h16" />
      <rect x="4" y="5" width="16" height="16" rx="3" />
    </IconBase>
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

function WalletIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H19v14H6.5A2.5 2.5 0 0 1 4 16.5v-9Z" />
      <path d="M4 8h15" />
      <path d="M15 12h4v4h-4a2 2 0 0 1 0-4Z" />
    </IconBase>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M20 6 9 17l-5-5" />
    </IconBase>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v5l3 2" />
    </IconBase>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="M8 15v-4" />
      <path d="M12 15V8" />
      <path d="M16 15v-6" />
    </IconBase>
  );
}
