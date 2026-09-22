"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api, brl, formatDateTime, formatTime } from "@/lib/api";

type DashboardAppointment = {
  id: string;
  time: string;
  client: string;
  phone: string;
  service: string;
  status: string;
  paymentStatus: string;
  total: number;
  deposit: number;
};

type Dashboard = {
  today: {
    count: number;
    completed: number;
    remaining: number;
    pendingDeposit: number;
    needsStatus: number;
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
    appointments: DashboardAppointment[];
  };
  next: {
    id: string;
    time: string;
    client: string;
    phone: string;
    service: string;
    total: number;
    deposit: number;
    depositPaid: boolean;
  } | null;
  appointments: DashboardAppointment[];
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

  const upcoming = useMemo(() => {
    if (!data) return [];
    const now = Date.now();
    return data.week.appointments
      .filter((appointment) => {
        return (
          new Date(appointment.time).getTime() >= now &&
          ["confirmed", "pending_payment"].includes(appointment.status)
        );
      })
      .slice(0, 5);
  }, [data]);

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Não foi possível carregar a dashboard: {error}
      </div>
    );
  }
  if (!data) return <DashboardSkeleton />;

  const todayKey = localDateKey(new Date());
  const hasAttention = data.today.pendingDeposit > 0 || data.today.needsStatus > 0;

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 border-b border-accent-100 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-accent-700">{formatLongDate(new Date())}</p>
          <h1 className="mt-1 font-display text-3xl text-sand-900">Visão de hoje</h1>
          <p className="mt-1 text-sm text-sand-500">Sua agenda, recebimentos e pendências em um só lugar.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/agenda?date=${todayKey}&novo=1`}
            className="inline-flex items-center gap-2 rounded-lg bg-accent-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-accent-700"
          >
            <PlusIcon className="h-4 w-4" />
            Novo agendamento
          </Link>
          <Link
            href={`/admin/agenda?date=${todayKey}`}
            className="inline-flex items-center gap-2 rounded-lg border border-accent-200 bg-white px-4 py-2.5 text-sm font-semibold text-accent-800 hover:bg-accent-50"
          >
            <CalendarIcon className="h-4 w-4" />
            Abrir agenda
          </Link>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-lg border border-accent-200 bg-white p-4 shadow-sm shadow-accent-100/30 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase text-accent-700">Próximo atendimento</p>
            {data.next && <span className="text-xs text-sand-400">{timeUntil(data.next.time)}</span>}
          </div>
          {data.next ? (
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-16 w-20 shrink-0 items-center justify-center rounded-lg bg-accent-50 font-display text-2xl text-accent-800">
                  {formatTime(data.next.time)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold text-sand-900">{data.next.client}</p>
                  <p className="truncate text-sm text-sand-500">{data.next.service}</p>
                  <p className="mt-1 text-xs text-sand-400">{formatPhone(data.next.phone)}</p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-accent-50 pt-3 sm:block sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0 sm:text-right">
                <p className="font-display text-xl text-sand-900">{brl(data.next.total)}</p>
                <PaymentPill paid={data.next.depositPaid} deposit={data.next.deposit} />
              </div>
            </div>
          ) : (
            <EmptyState icon={CheckIcon} text="Nenhum atendimento restante hoje." />
          )}
        </div>

        <div className={`rounded-lg border p-4 sm:p-5 ${hasAttention ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
          <div className="flex items-center gap-2">
            {hasAttention ? <AlertIcon className="h-5 w-5 text-amber-700" /> : <CheckIcon className="h-5 w-5 text-emerald-700" />}
            <h2 className={`font-semibold ${hasAttention ? "text-amber-900" : "text-emerald-900"}`}>
              {hasAttention ? "Precisa de atenção" : "Tudo em dia"}
            </h2>
          </div>
          {hasAttention ? (
            <div className="mt-3 space-y-2 text-sm text-amber-900">
              {data.today.pendingDeposit > 0 && (
                <p><strong>{data.today.pendingDeposit}</strong> agendamento{data.today.pendingDeposit === 1 ? "" : "s"} aguardando sinal hoje.</p>
              )}
              {data.today.needsStatus > 0 && (
                <p><strong>{data.today.needsStatus}</strong> atendimento{data.today.needsStatus === 1 ? "" : "s"} passado{data.today.needsStatus === 1 ? "" : "s"} sem conclusão.</p>
              )}
            </div>
          ) : (
            <p className="mt-2 text-sm text-emerald-800">Nenhuma pendência na agenda de hoje.</p>
          )}
          <Link href={`/admin/agenda?date=${todayKey}`} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-sand-800 hover:text-accent-700">
            Revisar agenda <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat icon={UsersIcon} label="Atendimentos" value={String(data.today.count)} hint={`${data.today.remaining} ainda hoje`} />
        <Stat icon={CheckIcon} label="Concluídos" value={String(data.today.completed)} hint="Atendimentos finalizados" />
        <Stat icon={WalletIcon} label="Recebido hoje" value={brl(data.today.receivedDeposits)} hint={`Previsto ${brl(data.today.expectedRevenue)}`} />
        <Stat icon={ClockIcon} label="A receber" value={brl(data.today.toReceive)} hint="Saldo dos atendimentos" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <div className="rounded-lg border border-accent-100 bg-white shadow-sm shadow-accent-100/30">
          <SectionHeader
            title="Agenda de hoje"
            subtitle={`${data.appointments.length} atendimento${data.appointments.length === 1 ? "" : "s"}`}
            href={`/admin/agenda?date=${todayKey}`}
          />
          <div className="divide-y divide-accent-50">
            {data.appointments.length === 0 ? (
              <EmptyState icon={CalendarIcon} text="Nenhum atendimento para hoje." />
            ) : (
              data.appointments.map((appointment) => <TodayRow key={appointment.id} appointment={appointment} />)
            )}
          </div>
        </div>

        <div className="rounded-lg border border-accent-100 bg-white p-4 shadow-sm shadow-accent-100/30 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-xl text-sand-900">Esta semana</h2>
              <p className="mt-0.5 text-sm text-sand-500">{formatWeekRange(data.week.start, data.week.end)}</p>
            </div>
            <span className="rounded-full bg-accent-50 px-2.5 py-1 text-xs font-semibold text-accent-700">{data.week.count} agendados</span>
          </div>

          <dl className="mt-5 divide-y divide-accent-50 border-y border-accent-50">
            <SummaryRow label="Concluídos" value={String(data.week.completed)} />
            <SummaryRow label="Sinais pagos" value={String(data.week.depositPaid)} />
            <SummaryRow label="Sinais pendentes" value={String(data.week.pendingDeposit)} attention={data.week.pendingDeposit > 0} />
          </dl>

          <div className="mt-5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-sand-500">Recebido</span>
              <strong className="text-emerald-700">{brl(data.week.received)}</strong>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-sand-500">A receber</span>
              <strong className="text-sand-900">{brl(data.week.toReceive)}</strong>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-sand-100">
              <div className="h-full rounded-full bg-accent-600" style={{ width: `${paymentProgress(data.week.received, data.week.expectedRevenue)}%` }} />
            </div>
            <p className="mt-2 text-xs text-sand-400">Total previsto: {brl(data.week.expectedRevenue)}</p>
          </div>

          <Link href="/admin/financeiro" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-700 hover:text-accent-800">
            Ver financeiro <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="rounded-lg border border-accent-100 bg-white shadow-sm shadow-accent-100/30">
        <SectionHeader title="Próximos da semana" subtitle="Os próximos horários confirmados ou aguardando sinal" href="/admin/agenda" />
        <div className="divide-y divide-accent-50">
          {upcoming.length === 0 ? (
            <EmptyState icon={ClockIcon} text="Nenhum próximo atendimento nesta semana." />
          ) : (
            upcoming.map((appointment) => <UpcomingRow key={appointment.id} appointment={appointment} />)
          )}
        </div>
      </section>
    </div>
  );
}

function SectionHeader({ title, subtitle, href }: { title: string; subtitle: string; href: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-accent-50 px-4 py-3.5 sm:px-5">
      <div>
        <h2 className="font-display text-xl text-sand-900">{title}</h2>
        <p className="mt-0.5 text-sm text-sand-500">{subtitle}</p>
      </div>
      <Link href={href} aria-label={`Ver ${title.toLowerCase()}`} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-accent-700 hover:bg-accent-50">
        <ArrowRightIcon className="h-5 w-5" />
      </Link>
    </div>
  );
}

function TodayRow({ appointment }: { appointment: DashboardAppointment }) {
  const status = statusOf(appointment.status);
  const agendaDate = localDateKey(new Date(appointment.time));
  return (
    <Link href={`/admin/agenda?date=${agendaDate}`} className="grid gap-3 px-4 py-3.5 transition hover:bg-accent-50 sm:grid-cols-[76px_1fr_auto] sm:items-center sm:px-5">
      <span className="flex h-11 items-center justify-center rounded-lg bg-accent-50 font-display text-lg text-accent-800">{formatTime(appointment.time)}</span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-sand-900">{appointment.client}</p>
        <p className="truncate text-sm text-sand-500">{appointment.service} · {formatPhone(appointment.phone)}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <PaymentPill
          paid={appointment.paymentStatus === "paid" || appointment.status === "completed"}
          deposit={appointment.deposit}
        />
        <span className={`w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${status.cls}`}>{status.label}</span>
      </div>
    </Link>
  );
}

function UpcomingRow({ appointment }: { appointment: DashboardAppointment }) {
  const status = statusOf(appointment.status);
  const agendaDate = localDateKey(new Date(appointment.time));
  return (
    <Link href={`/admin/agenda?date=${agendaDate}`} className="grid gap-2 px-4 py-3.5 text-sm transition hover:bg-accent-50 sm:grid-cols-[150px_1fr_auto] sm:items-center sm:px-5">
      <p className="font-semibold text-sand-900">{formatDateTime(appointment.time)}</p>
      <div className="min-w-0">
        <p className="truncate font-semibold text-sand-900">{appointment.client}</p>
        <p className="truncate text-xs text-sand-500">{appointment.service}</p>
      </div>
      <span className={`w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${status.cls}`}>{status.label}</span>
    </Link>
  );
}

function PaymentPill({ paid, deposit }: { paid: boolean; deposit: number }) {
  if (deposit <= 0) {
    return (
      <span className="inline-flex w-fit rounded-full border border-sand-200 bg-sand-50 px-2.5 py-1 text-xs font-semibold text-sand-600">
        Sem sinal
      </span>
    );
  }
  return paid ? (
    <span className="inline-flex w-fit rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Sinal pago</span>
  ) : (
    <span className="inline-flex w-fit rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">Sinal pendente</span>
  );
}

function SummaryRow({ label, value, attention = false }: { label: string; value: string; attention?: boolean }) {
  return (
    <div className="flex items-center justify-between py-3 text-sm">
      <dt className="text-sand-500">{label}</dt>
      <dd className={attention ? "font-semibold text-amber-700" : "font-semibold text-sand-900"}>{value}</dd>
    </div>
  );
}

function EmptyState({ icon: Icon, text }: { icon: (props: { className?: string }) => JSX.Element; text: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-6 text-sm text-sand-400 sm:px-5">
      <Icon className="h-5 w-5 text-accent-400" />
      {text}
    </div>
  );
}

function Stat({ icon: Icon, label, value, hint }: { icon: (props: { className?: string }) => JSX.Element; label: string; value: string; hint: string }) {
  return (
    <div className="rounded-lg border border-accent-100 bg-white p-4 shadow-sm shadow-accent-100/20">
      <div className="flex items-center gap-2 text-accent-700"><Icon className="h-4 w-4" /><p className="text-[11px] font-semibold uppercase">{label}</p></div>
      <p className="mt-3 font-display text-2xl leading-tight text-sand-900">{value}</p>
      <p className="mt-1 text-xs text-sand-500">{hint}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return <div className="space-y-4"><div className="h-20 animate-pulse rounded-lg bg-accent-50" /><div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{[0, 1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-lg bg-white" />)}</div><div className="h-72 animate-pulse rounded-lg bg-white" /></div>;
}

function statusOf(status: string) {
  return STATUS_LABEL[status] ?? { label: status, cls: "bg-sand-50 text-sand-500 border-sand-200" };
}

function formatWeekRange(start: string, end: string) {
  const fmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" });
  return `${fmt.format(new Date(start))} até ${fmt.format(new Date(end))}`;
}

function formatLongDate(date: Date) {
  const text = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long" }).format(date);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length !== 11) return phone;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function paymentProgress(received: number, expected: number) {
  if (expected <= 0) return 0;
  return Math.min(Math.round((received / expected) * 100), 100);
}

function timeUntil(time: string) {
  const minutes = Math.max(Math.round((new Date(time).getTime() - Date.now()) / 60000), 0);
  if (minutes < 60) return `em ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `em ${hours}h ${rest}min` : `em ${hours}h`;
}

function IconBase({ children, className = "h-5 w-5" }: { children: React.ReactNode; className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>;
}

function CalendarIcon({ className }: { className?: string }) { return <IconBase className={className}><path d="M7 3v4" /><path d="M17 3v4" /><path d="M4 8h16" /><rect x="4" y="5" width="16" height="16" rx="3" /></IconBase>; }
function UsersIcon({ className }: { className?: string }) { return <IconBase className={className}><path d="M16 20v-1.5c0-1.7-1.8-3-4-3s-4 1.3-4 3V20" /><circle cx="12" cy="9" r="3" /><path d="M4 19v-1c0-1.3 1.1-2.4 2.7-2.8" /><path d="M20 19v-1c0-1.3-1.1-2.4-2.7-2.8" /></IconBase>; }
function WalletIcon({ className }: { className?: string }) { return <IconBase className={className}><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H19v14H6.5A2.5 2.5 0 0 1 4 16.5v-9Z" /><path d="M4 8h15" /><path d="M15 12h4v4h-4a2 2 0 0 1 0-4Z" /></IconBase>; }
function CheckIcon({ className }: { className?: string }) { return <IconBase className={className}><path d="M20 6 9 17l-5-5" /></IconBase>; }
function ClockIcon({ className }: { className?: string }) { return <IconBase className={className}><circle cx="12" cy="12" r="8" /><path d="M12 8v5l3 2" /></IconBase>; }
function PlusIcon({ className }: { className?: string }) { return <IconBase className={className}><path d="M12 5v14" /><path d="M5 12h14" /></IconBase>; }
function ArrowRightIcon({ className }: { className?: string }) { return <IconBase className={className}><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></IconBase>; }
function AlertIcon({ className }: { className?: string }) { return <IconBase className={className}><path d="M12 9v4" /><path d="M12 17h.01" /><path d="M10.3 4.2 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z" /></IconBase>; }
