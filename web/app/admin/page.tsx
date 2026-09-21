"use client";

import { useEffect, useState } from "react";
import { api, brl, formatDateTime, formatTime } from "@/lib/api";

type Dashboard = {
  today: {
    count: number;
    expectedRevenue: number;
    receivedDeposits: number;
    toReceive: number;
  };
  week: {
    start: string;
    end: string;
    count: number;
    depositPaid: number;
    pendingDeposit: number;
    completed: number;
    expectedRevenue: number;
    received: number;
    toReceive: number;
    appointments: {
      id: string;
      time: string;
      client: string;
      phone: string;
      service: string;
      status: string;
      paymentStatus: string;
      total: number;
      deposit: number;
    }[];
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
  completed: { label: "Concluído", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cancelled: { label: "Cancelado", cls: "bg-sand-50 text-sand-500 border-sand-200" },
  no_show: { label: "Faltou", cls: "bg-red-50 text-red-600 border-red-200" },
  expired: { label: "Expirado", cls: "bg-sand-50 text-sand-500 border-sand-200" },
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
  if (!data) return <p className="text-sand-400">Carregando...</p>;

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-accent-100 bg-white p-5 shadow-sm shadow-accent-100/40">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-accent-200 bg-accent-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-accent-700">
              <CalendarIcon className="h-3.5 w-3.5" />
              Painel do studio
            </div>
            <h1 className="font-display text-2xl leading-tight text-sand-900">Resumo geral</h1>
            <p className="mt-1 text-sm text-sand-500">
              Veja rapidamente o dia de hoje e quem agendou nesta semana.
            </p>
          </div>

          {data.next ? (
            <div className="rounded-2xl border border-accent-100 bg-accent-50 px-4 py-3 xl:min-w-[360px]">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-accent-700">
                Próximo atendimento
              </p>
              <div className="mt-2 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-sand-900">{data.next.client}</p>
                  <p className="truncate text-xs text-sand-500">{data.next.service}</p>
                </div>
                <p className="font-display text-3xl leading-none text-accent-700">
                  {formatTime(data.next.time)}
                </p>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-sand-600">{brl(data.next.total)}</span>
                <PaymentPill paid={data.next.depositPaid} />
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-sand-100 bg-sand-50 px-4 py-3 xl:min-w-[320px]">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-sand-400">
                Próximo atendimento
              </p>
              <p className="mt-1 text-sm font-semibold text-sand-800">Nenhum horário restante hoje</p>
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={UsersIcon} label="Hoje" value={String(data.today.count)} hint="Atendimentos" />
        <Stat icon={WalletIcon} label="A receber hoje" value={brl(data.today.toReceive)} hint="Saldo pendente" />
        <Stat icon={CalendarIcon} label="Semana" value={String(data.week.count)} hint="Agendamentos" />
        <Stat icon={CheckIcon} label="Sinais pagos" value={String(data.week.depositPaid)} hint="Nesta semana" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <div className="rounded-2xl border border-accent-100 bg-white shadow-sm shadow-accent-100/40">
          <SectionHeader
            title="Agenda de hoje"
            subtitle={`${data.appointments.length} atendimento${data.appointments.length === 1 ? "" : "s"}`}
          />
          <div className="divide-y divide-accent-50">
            {data.appointments.length === 0 ? (
              <EmptyState icon={ClockIcon} text="Nenhum atendimento para hoje." />
            ) : (
              data.appointments.map((appointment) => <TodayRow key={appointment.id} appointment={appointment} />)
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-accent-100 bg-white p-4 shadow-sm shadow-accent-100/40">
          <h2 className="font-display text-xl text-sand-900">Financeiro</h2>
          <p className="mt-1 text-sm text-sand-500">Resumo simples de valores.</p>

          <div className="mt-4 space-y-3">
            <FinancialRow
              title="Hoje"
              expected={data.today.expectedRevenue}
              received={data.today.receivedDeposits}
              pending={data.today.toReceive}
            />
            <FinancialRow
              title="Semana"
              expected={data.week.expectedRevenue}
              received={data.week.received}
              pending={data.week.toReceive}
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-accent-100 bg-white shadow-sm shadow-accent-100/40">
        <SectionHeader
          title="Resumo da semana"
          subtitle={`${formatWeekRange(data.week.start, data.week.end)} · ${data.week.completed} concluído${data.week.completed === 1 ? "" : "s"} · ${data.week.pendingDeposit} sinal${data.week.pendingDeposit === 1 ? "" : "is"} pendente${data.week.pendingDeposit === 1 ? "" : "s"}`}
        />

        <div className="divide-y divide-accent-50">
          {data.week.appointments.length === 0 ? (
            <EmptyState icon={CalendarIcon} text="Nenhum atendimento nesta semana." />
          ) : (
            data.week.appointments.map((appointment) => (
              <WeekAppointmentRow key={appointment.id} appointment={appointment} />
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="border-b border-accent-50 px-4 py-3">
      <h2 className="font-display text-xl text-sand-900">{title}</h2>
      <p className="mt-0.5 text-sm text-sand-500">{subtitle}</p>
    </div>
  );
}

function TodayRow({ appointment }: { appointment: Dashboard["appointments"][number] }) {
  const status = STATUS_LABEL[appointment.status] ?? {
    label: appointment.status,
    cls: "bg-sand-50 text-sand-500 border-sand-200",
  };

  return (
    <div className="flex flex-col gap-3 px-4 py-3 transition hover:bg-accent-50 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-11 min-w-16 items-center justify-center rounded-xl border border-accent-100 bg-accent-50 font-display text-lg text-accent-700">
          {formatTime(appointment.time)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-sand-900">{appointment.client}</p>
          <p className="truncate text-sm text-sand-500">{appointment.service}</p>
        </div>
      </div>
      <span className={`w-fit rounded-full border px-3 py-1.5 text-xs font-semibold ${status.cls}`}>
        {status.label}
      </span>
    </div>
  );
}

function WeekAppointmentRow({
  appointment,
}: {
  appointment: Dashboard["week"]["appointments"][number];
}) {
  const status = STATUS_LABEL[appointment.status] ?? {
    label: appointment.status,
    cls: "bg-sand-50 text-sand-500 border-sand-200",
  };
  const paid = appointment.paymentStatus === "paid" || appointment.status === "completed";

  return (
    <div className="grid gap-3 px-4 py-3 text-sm transition hover:bg-accent-50 lg:grid-cols-[150px_1fr_145px_145px] lg:items-center">
      <div>
        <p className="font-semibold text-sand-900">{formatDateTime(appointment.time)}</p>
        <p className="text-xs text-sand-400">{appointment.phone}</p>
      </div>
      <div className="min-w-0">
        <p className="truncate font-semibold text-sand-900">{appointment.client}</p>
        <p className="truncate text-xs text-sand-500">{appointment.service}</p>
      </div>
      <span className={`w-fit rounded-full border px-3 py-1.5 text-xs font-semibold ${status.cls}`}>
        {status.label}
      </span>
      <div className="lg:text-right">
        <PaymentPill paid={paid} />
        <p className="mt-1 text-xs text-sand-400">
          {brl(appointment.deposit)} de {brl(appointment.total)}
        </p>
      </div>
    </div>
  );
}

function PaymentPill({ paid }: { paid: boolean }) {
  return paid ? (
    <span className="inline-flex w-fit rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
      Sinal pago
    </span>
  ) : (
    <span className="inline-flex w-fit rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
      Sinal pendente
    </span>
  );
}

function FinancialRow({
  title,
  expected,
  received,
  pending,
}: {
  title: string;
  expected: number;
  received: number;
  pending: number;
}) {
  return (
    <div className="rounded-xl border border-accent-100 bg-accent-50/50 p-3">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-sand-900">{title}</p>
        <p className="text-xs font-medium text-sand-500">Previsto {brl(expected)}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-white p-3">
          <p className="text-[11px] font-semibold uppercase text-sand-400">Recebido</p>
          <p className="mt-1 font-display text-lg text-accent-700">{brl(received)}</p>
        </div>
        <div className="rounded-lg bg-white p-3">
          <p className="text-[11px] font-semibold uppercase text-sand-400">A receber</p>
          <p className="mt-1 font-display text-lg text-sand-900">{brl(pending)}</p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, text }: { icon: (props: { className?: string }) => JSX.Element; text: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-6 text-sm text-sand-400">
      <Icon className="h-5 w-5 text-accent-400" />
      {text}
    </div>
  );
}

function formatWeekRange(start: string, end: string) {
  const fmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" });
  return `${fmt.format(new Date(start))} até ${fmt.format(new Date(end))}`;
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
    <div className="rounded-2xl border border-accent-100 bg-white p-4 shadow-sm shadow-accent-100/30">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-accent-50 text-accent-700">
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-sand-400">{label}</p>
      <p className="mt-1 font-display text-2xl leading-tight text-sand-900">{value}</p>
      <p className="mt-1 text-xs text-sand-500">{hint}</p>
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
