"use client";

import { useEffect, useState } from "react";
import { api, brl } from "@/lib/api";

type Service = {
  id: string;
  name: string;
  description: string | null;
  price: string;
  durationMinutes: number;
  depositType: string;
  depositValue: string;
  bufferMinutes: number;
  sortOrder: number;
  active: boolean;
};

const empty = {
  name: "",
  description: "",
  price: "",
  durationMinutes: "",
  depositType: "fixed",
  depositValue: "",
  bufferMinutes: "0",
};

export default function ServicosPage() {
  const [items, setItems] = useState<Service[]>([]);
  const [form, setForm] = useState({ ...empty });
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function load() {
    try {
      setItems(await api<Service[]>("/api/admin/services", { auth: true }));
    } catch (e: any) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  function resetForm() {
    setForm({ ...empty });
    setEditingId(null);
    setShowForm(false);
  }

  function edit(s: Service) {
    setError(null);
    setEditingId(s.id);
    setShowForm(true);
    setForm({
      name: s.name,
      description: s.description ?? "",
      price: String(s.price),
      durationMinutes: String(s.durationMinutes),
      depositType: s.depositType,
      depositValue: String(s.depositValue),
      bufferMinutes: String(s.bufferMinutes),
    });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api(editingId ? `/api/admin/services/${editingId}` : "/api/admin/services", {
        method: editingId ? "PATCH" : "POST",
        auth: true,
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || null,
          price: Number(form.price),
          durationMinutes: Number(form.durationMinutes),
          depositType: form.depositType,
          depositValue: Number(form.depositValue || 0),
          bufferMinutes: Number(form.bufferMinutes || 0),
        }),
      });
      resetForm();
      load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function toggle(s: Service) {
    await api(`/api/admin/services/${s.id}`, {
      method: "PATCH",
      auth: true,
      body: JSON.stringify({ active: !s.active }),
    });
    load();
  }

  async function moveService(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const next = [...items];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    setItems(next);
    setError(null);

    try {
      await api("/api/admin/services/order", {
        method: "PUT",
        auth: true,
        body: JSON.stringify({ ids: next.map((item) => item.id) }),
      });
      await load();
    } catch (e: any) {
      setError(e.message);
      await load();
    }
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-lg border border-accent-100 bg-white p-4 shadow-sm shadow-accent-100/40 sm:p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-accent-200 bg-accent-50 px-2.5 py-1 text-[11px] font-semibold uppercase text-accent-700">
            Catálogo
          </div>
          <h1 className="font-display text-3xl text-sand-900">Serviços</h1>
          <p className="mt-1 text-sm text-sand-500">
            Configure valores, duração, intervalo e sinal de reserva.
          </p>
        </div>
        <button
          onClick={() => {
            if (showForm) resetForm();
            else setShowForm(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-accent-200/60 hover:bg-accent-700"
        >
          {showForm ? (
            <>
              <CloseIcon className="h-4 w-4" />
              Fechar
            </>
          ) : (
            <>
              <PlusIcon className="h-4 w-4" />
              Novo serviço
            </>
          )}
        </button>
      </section>

      {error && <p className="mb-4 text-red-600">{error}</p>}

      {showForm && (
        <form onSubmit={save} className="rounded-lg border border-accent-100 bg-white p-5 shadow-sm shadow-accent-100/40">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl text-sand-900">
                {editingId ? "Editar serviço" : "Novo serviço"}
              </h2>
              <p className="mt-1 text-sm text-sand-500">
                {editingId
                  ? "Atualize os valores e salve para aplicar no catálogo."
                  : "Cadastre um serviço para aparecer na página de agendamento."}
              </p>
            </div>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-sand-300 px-3 py-2 text-xs font-semibold text-sand-600 hover:bg-sand-50"
              >
                Cancelar edição
              </button>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Nome" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <Textarea
              label="Observação"
              value={form.description}
              onChange={(v) => setForm({ ...form, description: v })}
              placeholder="Ex.: Ideal para manutenção do brilho, inclui acabamento..."
            />
            <Input label="Preço (R$)" type="number" value={form.price} onChange={(v) => setForm({ ...form, price: v })} />
            <Input label="Duração (min)" type="number" value={form.durationMinutes} onChange={(v) => setForm({ ...form, durationMinutes: v })} />
            <Input label="Intervalo após (min)" type="number" value={form.bufferMinutes} onChange={(v) => setForm({ ...form, bufferMinutes: v })} />
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-sand-600">Tipo de sinal</span>
              <select
                value={form.depositType}
                onChange={(e) => setForm({ ...form, depositType: e.target.value })}
                className="w-full rounded-lg border border-sand-300 px-4 py-2.5 outline-none focus:border-sand-500"
              >
                <option value="none">Sem sinal</option>
                <option value="fixed">Valor fixo</option>
                <option value="percentage">Percentual</option>
              </select>
            </label>
            <Input
              label={form.depositType === "percentage" ? "Sinal (%)" : "Sinal (R$)"}
              type="number"
              value={form.depositValue}
              onChange={(v) => setForm({ ...form, depositValue: v })}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="inline-flex items-center gap-2 rounded-lg bg-accent-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-700">
              <SaveIcon className="h-4 w-4" />
              {editingId ? "Salvar alterações" : "Salvar serviço"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-sand-300 px-5 py-2.5 text-sm font-medium text-sand-700 hover:bg-sand-50"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-lg border border-accent-100 bg-white shadow-sm shadow-accent-100/40">
        {items.map((s, index) => (
          <div
            key={s.id}
            className={`flex flex-col gap-4 border-b border-accent-50 px-5 py-4 transition last:border-0 hover:bg-accent-50/60 sm:flex-row sm:items-center sm:justify-between ${
              editingId === s.id ? "bg-accent-50/60" : ""
            }`}
          >
            <div>
              <p className={`font-medium ${s.active ? "text-sand-900" : "text-sand-400 line-through"}`}>
                {s.name}
              </p>
              {s.description && (
                <p className="mt-1 max-w-2xl text-sm text-sand-600">{s.description}</p>
              )}
              <p className="mt-0.5 text-xs text-sand-500">
                {s.durationMinutes}min · {brl(Number(s.price))}
                {s.depositType !== "none" &&
                  ` · sinal ${s.depositType === "percentage" ? `${s.depositValue}%` : brl(Number(s.depositValue))}`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex rounded-lg border border-sand-300">
                <button
                  type="button"
                  onClick={() => moveService(index, -1)}
                  disabled={index === 0}
                  title="Subir serviço"
                  aria-label={`Subir ${s.name}`}
                  className="inline-flex items-center justify-center px-2.5 py-1.5 text-sand-700 hover:bg-sand-50 disabled:cursor-not-allowed disabled:text-sand-300 disabled:hover:bg-transparent"
                >
                  <ArrowUpIcon className="h-3.5 w-3.5" />
                </button>
                <div className="w-px bg-sand-200" />
                <button
                  type="button"
                  onClick={() => moveService(index, 1)}
                  disabled={index === items.length - 1}
                  title="Descer serviço"
                  aria-label={`Descer ${s.name}`}
                  className="inline-flex items-center justify-center px-2.5 py-1.5 text-sand-700 hover:bg-sand-50 disabled:cursor-not-allowed disabled:text-sand-300 disabled:hover:bg-transparent"
                >
                  <ArrowDownIcon className="h-3.5 w-3.5" />
                </button>
              </div>
              <button
                onClick={() => edit(s)}
                className="inline-flex items-center gap-2 rounded-lg border border-sand-300 px-3 py-1.5 text-xs font-semibold text-sand-700 hover:bg-sand-50"
              >
                <EditIcon className="h-3.5 w-3.5" />
                Editar
              </button>
              <button
                onClick={() => toggle(s)}
                className="rounded-lg border border-sand-300 px-3 py-1.5 text-xs font-semibold text-sand-700 hover:bg-sand-50"
              >
                {s.active ? "Desativar" : "Ativar"}
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="p-6 text-sm text-sand-400">Nenhum serviço cadastrado.</p>
        )}
      </div>
    </div>
  );
}

function IconBase({
  children,
  className = "h-4 w-4",
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

function PlusIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </IconBase>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </IconBase>
  );
}

function EditIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5Z" />
    </IconBase>
  );
}

function SaveIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
      <path d="M17 21v-8H7v8" />
      <path d="M7 3v5h8" />
    </IconBase>
  );
}

function ArrowUpIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="m18 15-6-6-6 6" />
    </IconBase>
  );
}

function ArrowDownIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="m6 9 6 6 6-6" />
    </IconBase>
  );
}

function Textarea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block sm:col-span-2">
      <span className="mb-1 block text-xs font-medium text-sand-600">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full resize-none rounded-lg border border-sand-300 px-4 py-2.5 outline-none focus:border-sand-500"
      />
    </label>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-sand-600">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-sand-300 px-4 py-2.5 outline-none focus:border-sand-500"
      />
    </label>
  );
}
