"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: HomeIcon },
  { href: "/admin/agenda", label: "Agenda", icon: CalendarIcon },
  { href: "/admin/horarios", label: "Horários", icon: ClockIcon },
  { href: "/admin/servicos", label: "Serviços", icon: SparkleIcon },
  { href: "/admin/clientes", label: "Clientes", icon: UsersIcon },
  { href: "/admin/financeiro", label: "Financeiro", icon: MoneyIcon },
  { href: "/admin/whatsapp", label: "WhatsApp", icon: ChatIcon },
  { href: "/admin/bio", label: "Bio", icon: LinkIcon },
  { href: "/admin/configuracoes", label: "Configurações", icon: SettingsIcon },
];

type AdminSettings = {
  name: string;
  logoUrl: string | null;
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settings, setSettings] = useState<AdminSettings | null>(null);

  const isLogin = pathname === "/admin/login";

  useEffect(() => {
    if (isLogin) {
      setReady(true);
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) router.replace("/admin/login");
    else setReady(true);
  }, [isLogin, pathname, router]);

  useEffect(() => {
    const saved = localStorage.getItem("admin-sidebar-collapsed");
    setCollapsed(saved === "true");
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!ready || isLogin) return;
    api<AdminSettings>("/api/admin/settings", { auth: true })
      .then(setSettings)
      .catch(() => undefined);
  }, [isLogin, ready]);

  function toggleCollapsed() {
    setCollapsed((current) => {
      localStorage.setItem("admin-sidebar-collapsed", String(!current));
      return !current;
    });
  }

  function logout() {
    localStorage.removeItem("token");
    router.replace("/admin/login");
  }

  if (isLogin) return <>{children}</>;
  if (!ready) return null;

  return (
    <div className="min-h-screen bg-white text-sand-900">
      {mobileOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-sand-900/35 backdrop-blur-[1px] md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[17rem] max-w-[86vw] flex-col border-r border-accent-100 bg-white px-3.5 py-4 shadow-xl shadow-accent-100/60 transition-[width,transform] duration-200 md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "md:w-16 md:px-2" : "md:w-56"}`}
      >
        <div className={`mb-5 flex items-center gap-2.5 px-1 ${collapsed ? "md:justify-center md:px-0" : ""}`}>
          {settings?.logoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={settings.logoUrl}
              alt="Logo"
              className="h-9 w-9 shrink-0 rounded-xl border border-accent-100 object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-600">
              <SparkleIcon className="h-4 w-4" />
            </div>
          )}
          <div className={`min-w-0 ${collapsed ? "md:hidden" : ""}`}>
            <p className="truncate text-[13px] font-bold leading-5 text-sand-900">
              {settings?.name || "Painel"}
            </p>
            <p className="truncate text-[11px] font-medium text-accent-600">Painel administrativo</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1.5 overflow-y-auto pr-0.5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`group relative flex min-h-10 items-center gap-3 overflow-hidden rounded-lg px-2.5 text-xs font-semibold transition ${
                  collapsed ? "md:justify-center md:px-0" : ""
                } ${
                  active
                    ? "bg-accent-50 text-accent-700 shadow-sm shadow-accent-100/70"
                    : "text-sand-500 hover:bg-accent-50/70 hover:text-accent-700"
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center transition ${
                    active
                      ? "text-accent-700"
                      : "text-sand-400 group-hover:text-accent-600"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className={`truncate ${collapsed ? "md:hidden" : ""}`}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <button
          onClick={logout}
          title={collapsed ? "Sair" : undefined}
          className={`mt-4 flex min-h-10 items-center gap-3 rounded-lg border border-transparent px-2.5 text-left text-xs font-semibold text-sand-500 transition hover:bg-red-50 hover:text-red-600 ${
            collapsed ? "md:justify-center md:px-0" : ""
          }`}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center">
            <LogoutIcon className="h-4 w-4" />
          </span>
          <span className={collapsed ? "md:hidden" : ""}>Sair</span>
        </button>

        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          className="mx-auto mt-3 hidden h-9 w-9 items-center justify-center rounded-lg border border-accent-100 bg-accent-50 text-accent-600 shadow-sm transition hover:bg-accent-100 hover:text-accent-800 md:flex"
        >
          {collapsed ? <ChevronRightIcon className="h-4 w-4" /> : <ChevronLeftIcon className="h-4 w-4" />}
        </button>
      </aside>

      <div className={`min-h-screen transition-[padding] duration-200 ${collapsed ? "md:pl-16" : "md:pl-56"}`}>
        <header className="sticky top-0 z-20 border-b border-accent-100 bg-white/90 px-4 py-3 shadow-sm shadow-accent-100/60 backdrop-blur md:hidden">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-accent-100 bg-accent-50 text-accent-700 shadow-sm"
              aria-label="Abrir menu"
            >
              <MenuIcon className="h-4 w-4" />
            </button>
            <div>
              <p className="text-center text-sm font-bold text-sand-900">
                {settings?.name || "Painel"}
              </p>
              <p className="text-xs font-medium text-accent-600">Painel administrativo</p>
            </div>
            <button
              onClick={logout}
              className="rounded-lg border border-accent-100 bg-white p-2 text-accent-700 shadow-sm"
              aria-label="Sair"
            >
              <LogoutIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl p-3 sm:p-5 lg:p-7">{children}</main>
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

function HomeIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10.5V21h14V10.5" />
      <path d="M9 21v-6h6v6" />
    </IconBase>
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

function ClockIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </IconBase>
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

function UsersIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M16 20v-1.5c0-1.7-1.8-3-4-3s-4 1.3-4 3V20" />
      <circle cx="12" cy="9" r="3" />
      <path d="M4 19v-1c0-1.3 1.1-2.4 2.7-2.8" />
      <path d="M20 19v-1c0-1.3-1.1-2.4-2.7-2.8" />
      <path d="M6.5 11.5a2.3 2.3 0 1 1 1-4.4" />
      <path d="M17.5 11.5a2.3 2.3 0 1 0-1-4.4" />
    </IconBase>
  );
}

function MoneyIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M4 7h16v10H4z" />
      <path d="M7 10h.01" />
      <path d="M17 14h.01" />
      <circle cx="12" cy="12" r="2.5" />
    </IconBase>
  );
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M21 11.5a7.5 7.5 0 0 1-10.9 6.7L4 20l1.8-5.1A7.5 7.5 0 1 1 21 11.5Z" />
    </IconBase>
  );
}

function LinkIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M10 13a5 5 0 0 0 7.1.2l2.1-2.1a5 5 0 0 0-7.1-7.1L11 5.1" />
      <path d="M14 11a5 5 0 0 0-7.1-.2l-2.1 2.1a5 5 0 0 0 7.1 7.1L13 18.9" />
    </IconBase>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M19.4 15a1.8 1.8 0 0 0 .4 2l.1.1-2 3.4-.2-.1a1.8 1.8 0 0 0-2.1.4l-.1.1a1.8 1.8 0 0 0-.5 1.1H9a1.8 1.8 0 0 0-.5-1.1l-.1-.1a1.8 1.8 0 0 0-2.1-.4l-.2.1-2-3.4.1-.1a1.8 1.8 0 0 0 .4-2V15a1.8 1.8 0 0 0-1.4-1.3H3v-3.4h.2A1.8 1.8 0 0 0 4.6 9v-.1a1.8 1.8 0 0 0-.4-2l-.1-.1 2-3.4.2.1a1.8 1.8 0 0 0 2.1-.4l.1-.1A1.8 1.8 0 0 0 9 2h6a1.8 1.8 0 0 0 .5 1.1l.1.1a1.8 1.8 0 0 0 2.1.4l.2-.1 2 3.4-.1.1a1.8 1.8 0 0 0-.4 2V9a1.8 1.8 0 0 0 1.4 1.3h.2v3.4h-.2a1.8 1.8 0 0 0-1.4 1.3Z" />
    </IconBase>
  );
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
      <path d="M14 4h4a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-4" />
    </IconBase>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </IconBase>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="m15 18-6-6 6-6" />
    </IconBase>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="m9 18 6-6-6-6" />
    </IconBase>
  );
}
