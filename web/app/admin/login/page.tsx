"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const r = await api<{ token: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem("token", r.token);
      router.replace("/admin");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#fbfaf8] text-sand-900">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden min-h-screen flex-col justify-between border-r border-accent-100 bg-sand-900 px-10 py-9 text-white lg:flex xl:px-14">
          <div className="absolute inset-0 bg-[linear-gradient(140deg,rgba(241,67,126,0.28),rgba(38,34,30,0)_42%),linear-gradient(0deg,rgba(255,255,255,0.06),rgba(255,255,255,0))]" />
          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/10 shadow-sm">
              <SparkleIcon className="h-5 w-5 text-accent-200" />
            </div>
            <div>
              <p className="text-sm font-bold tracking-wide">Studio Nails</p>
              <p className="text-xs font-medium text-white/55">Painel administrativo</p>
            </div>
          </div>

          <div className="relative z-10 max-w-xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-accent-100">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
              Agenda online ativa
            </div>
            <h1 className="font-display text-5xl leading-[1.02] text-white">
              Organize sua agenda com calma, clareza e beleza.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-white/64">
              Acesse horários, clientes, pagamentos e configurações do studio em um painel pensado
              para o ritmo do atendimento.
            </p>
          </div>

          <div className="relative z-10 grid grid-cols-3 gap-3">
            <LoginMetric label="Hoje" value="Agenda" />
            <LoginMetric label="Pix" value="Sinais" />
            <LoginMetric label="Bio" value="Links" />
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
      <form
        onSubmit={submit}
            className="w-full max-w-md rounded-2xl border border-accent-100 bg-white/95 p-6 shadow-xl shadow-accent-100/50 backdrop-blur sm:p-8"
      >
            <div className="mb-8">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-50 text-accent-700 ring-1 ring-accent-100">
                    <SparkleIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-sand-900">Studio Nails</p>
                    <p className="text-xs font-medium text-sand-500">Acesso seguro</p>
                  </div>
                </div>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold uppercase text-emerald-700">
                  Online
                </span>
              </div>

              <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent-600">
                Bem-vinda de volta
              </p>
              <h1 className="mt-2 font-display text-3xl leading-tight text-sand-900">
                Entre no painel
              </h1>
              <p className="mt-2 text-sm leading-6 text-sand-500">
                Gerencie sua agenda, atendimentos e recebimentos em poucos cliques.
              </p>
        </div>

        {error && (
              <div className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                {error}
          </div>
        )}

            <label className="mb-4 block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-sand-500">
                E-mail
              </span>
              <div className="relative">
                <MailIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-sand-400" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="seuemail@studio.com"
                  className="w-full rounded-xl border border-sand-200 bg-sand-50/70 px-11 py-3 text-sm font-medium text-sand-900 outline-none transition placeholder:text-sand-400 focus:border-accent-300 focus:bg-white focus:ring-4 focus:ring-accent-100"
          />
              </div>
        </label>
            <label className="mb-6 block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-sand-500">
                Senha
              </span>
              <div className="relative">
                <LockIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-sand-400" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="Digite sua senha"
                  className="w-full rounded-xl border border-sand-200 bg-sand-50/70 px-11 py-3 text-sm font-medium text-sand-900 outline-none transition placeholder:text-sand-400 focus:border-accent-300 focus:bg-white focus:ring-4 focus:ring-accent-100"
          />
              </div>
        </label>

        <button
          disabled={loading}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-sand-900 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-sand-900/15 transition hover:-translate-y-0.5 hover:bg-accent-700 hover:shadow-accent-700/25 disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-sand-400 disabled:shadow-none"
        >
              {loading ? "Entrando..." : "Entrar"}
              <ArrowRightIcon className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </button>

            <p className="mt-6 text-center text-xs leading-5 text-sand-400">
              Use o e-mail e senha cadastrados para administrar o studio.
            </p>
      </form>
        </section>
      </div>
    </main>
  );
}

function LoginMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/10 p-4 backdrop-blur">
      <p className="text-xs font-semibold uppercase text-white/45">{label}</p>
      <p className="mt-1 text-lg font-bold text-white">{value}</p>
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

function SparkleIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" />
      <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" />
    </IconBase>
  );
}

function MailIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M4 6h16v12H4z" />
      <path d="m4 7 8 6 8-6" />
    </IconBase>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </IconBase>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </IconBase>
  );
}
