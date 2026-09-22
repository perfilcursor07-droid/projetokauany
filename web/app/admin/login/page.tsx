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
    <main className="flex min-h-screen items-center justify-center bg-white px-4 py-8 text-sand-900 sm:px-6">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-accent-100 bg-white p-6 shadow-xl shadow-accent-100/50 sm:p-8"
      >
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-50 text-accent-700 ring-1 ring-accent-100">
            <SparkleIcon className="h-6 w-6" />
          </div>

          <p className="text-sm font-bold text-sand-900">Studio Flora</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-accent-600">
            Painel administrativo
          </p>
          <h1 className="mt-4 font-display text-3xl leading-tight text-sand-900">
            Entrar
          </h1>
          <p className="mt-2 text-sm leading-6 text-sand-500">
            Acesse sua agenda, clientes e pagamentos.
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
          className="group flex w-full items-center justify-center gap-2 rounded-xl bg-accent-700 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-accent-700/20 transition hover:-translate-y-0.5 hover:bg-sand-900 disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-sand-400 disabled:shadow-none"
        >
          {loading ? "Entrando..." : "Entrar no painel"}
          <ArrowRightIcon className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </button>

        <div className="mt-6 border-t border-accent-50 pt-4 text-center text-xs leading-5 text-sand-400">
          <p>Desenvolvido por Erick Vinicius</p>
          <p>Versão 1.0</p>
        </div>
      </form>
    </main>
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

