"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Hour = {
  weekday: number;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
};

type Block = {
  id: string;
  startAt: string;
  endAt: string;
  reason: string | null;
};

const WEEKDAYS = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

function defaultHours(): Hour[] {
  return WEEKDAYS.map((_, weekday) => ({
    weekday,
    isOpen: weekday >= 1 && weekday <= 5, // seg a sex por padrao
    openTime: "08:00",
    closeTime: "18:00",
  }));
}

export default function HorariosPage() {
  const [hours, setHours] = useState<Hour[]>(defaultHours());
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form de bloqueio
  const [bDate, setBDate] = useState("");
  const [bAllDay, setBAllDay] = useState(true);
  const [bStart, setBStart] = useState("08:00");
  const [bEnd, setBEnd] = useState("12:00");
  const [bReason, setBReason] = useState("");

  async function loadHours() {
    try {
      const rows = await api<Hour[]>("/api/admin/business-hours", { auth: true });
      const merged = defaultHours().map((d) => {
        const found = rows.find((r) => r.weekday === d.weekday);
        return found
          ? {
              weekday: d.weekday,
              isOpen: found.isOpen,
              openTime: found.openTime?.slice(0, 5) ?? "08:00",
              closeTime: found.closeTime?.slice(0, 5) ?? "18:00",
            }
          : d;
      });
      setHours(merged);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function loadBlocks() {
    try {
      setBlocks(await api<Block[]>("/api/admin/blocked-times", { auth: true }));
    } catch (e: any) {
      setError(e.message);
    }
  }

  useEffect(() => {
    loadHours();
    loadBlocks();
  }, []);

  function update(weekday: number, patch: Partial<Hour>) {
    setHours((prev) =>
      prev.map((h) => (h.weekday === weekday ? { ...h, ...patch } : h)),
    );
  }

  async function saveHours() {
    setSaving(true);
    setError(null);
    setMsg(null);
    try {
      await api("/api/admin/business-hours", {
        method: "PUT",
        auth: true,
        body: JSON.stringify(hours),
      });
      setMsg("Horários de atendimento salvos.");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function addBlock(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!bDate) {
      setError("Escolha a data do bloqueio.");
      return;
    }
    const startAt = bAllDay ? `${bDate}T00:00:00` : `${bDate}T${bStart}:00`;
    const endAt = bAllDay ? `${bDate}T23:59:00` : `${bDate}T${bEnd}:00`;
    try {
      await api("/api/admin/blocked-times", {
        method: "POST",
        auth: true,
        body: JSON.stringify({ startAt, endAt, reason: bReason || null }),
      });
      setBDate("");
      setBReason("");
      loadBlocks();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function removeBlock(id: string) {
    await api(`/api/admin/blocked-times/${id}`, { method: "DELETE", auth: true });
    loadBlocks();
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-accent-100 bg-white p-4 shadow-sm shadow-accent-100/40 sm:p-5">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-accent-200 bg-accent-50 px-2.5 py-1 text-[11px] font-semibold uppercase text-accent-700">
          Disponibilidade
        </div>
        <h1 className="font-display text-3xl text-sand-900">Horários de atendimento</h1>
        <p className="mt-1 text-sm text-sand-500">
          A agenda só oferece horários dentro do que você define aqui.
        </p>
      </section>

      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}
      {msg && (
        <div className="rounded-lg border border-accent-200 bg-accent-50 px-4 py-3 text-sm text-accent-700">
          {msg}
        </div>
      )}

      {/* Dias de atendimento */}
      <section className="rounded-lg border border-accent-100 bg-white p-5 shadow-sm shadow-accent-100/40 sm:p-6">
        <h2 className="mb-4 font-display text-lg text-sand-900">Dias de atendimento</h2>
        <div className="space-y-2">
          {hours.map((h) => (
            <div
              key={h.weekday}
              className={`flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
                h.isOpen ? "border-accent-100 bg-white" : "border-sand-100 bg-sand-50"
              }`}
            >
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={h.isOpen}
                  onChange={(e) => update(h.weekday, { isOpen: e.target.checked })}
                  className="h-4 w-4 accent-accent-600"
                />
                <span
                  className={`w-32 text-sm font-medium ${
                    h.isOpen ? "text-sand-900" : "text-sand-400"
                  }`}
                >
                  {WEEKDAYS[h.weekday]}
                </span>
              </label>

              {h.isOpen ? (
                <div className="flex items-center gap-2 text-sm text-sand-700">
                  <input
                    type="time"
                    value={h.openTime}
                    onChange={(e) => update(h.weekday, { openTime: e.target.value })}
                    className="rounded-lg border border-sand-300 px-3 py-1.5 outline-none focus:border-accent-500"
                  />
                  <span className="text-sand-400">às</span>
                  <input
                    type="time"
                    value={h.closeTime}
                    onChange={(e) => update(h.weekday, { closeTime: e.target.value })}
                    className="rounded-lg border border-sand-300 px-3 py-1.5 outline-none focus:border-accent-500"
                  />
                </div>
              ) : (
                <span className="text-sm text-sand-400">Fechado</span>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={saveHours}
          disabled={saving}
          className="mt-5 rounded-lg bg-accent-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-accent-700 disabled:opacity-40"
        >
          {saving ? "Salvando…" : "Salvar horários"}
        </button>
      </section>

      {/* Bloqueios pontuais */}
      <section className="rounded-lg border border-accent-100 bg-white p-5 shadow-sm shadow-accent-100/40 sm:p-6">
        <h2 className="mb-1 font-display text-lg text-sand-900">Bloqueios</h2>
        <p className="mb-4 text-sm text-sand-500">
          Feche um dia ou período específico (folga, feriado, consulta).
        </p>

        <form onSubmit={addBlock} className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-sand-600">Data</span>
            <input
              type="date"
              value={bDate}
              onChange={(e) => setBDate(e.target.value)}
              className="w-full rounded-lg border border-sand-300 px-4 py-2.5 outline-none focus:border-sand-500"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-sand-600">Motivo (opcional)</span>
            <input
              value={bReason}
              onChange={(e) => setBReason(e.target.value)}
              placeholder="Ex.: Consulta médica"
              className="w-full rounded-lg border border-sand-300 px-4 py-2.5 outline-none focus:border-sand-500"
            />
          </label>

          <label className="flex items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              checked={bAllDay}
              onChange={(e) => setBAllDay(e.target.checked)}
              className="h-4 w-4 accent-accent-600"
            />
            <span className="text-sm text-sand-700">Dia inteiro</span>
          </label>

          {!bAllDay && (
            <div className="flex items-center gap-2 text-sm text-sand-700 sm:col-span-2">
              <input
                type="time"
                value={bStart}
                onChange={(e) => setBStart(e.target.value)}
                className="rounded-lg border border-sand-300 px-3 py-1.5 outline-none focus:border-sand-500"
              />
              <span className="text-sand-400">às</span>
              <input
                type="time"
                value={bEnd}
                onChange={(e) => setBEnd(e.target.value)}
                className="rounded-lg border border-sand-300 px-3 py-1.5 outline-none focus:border-sand-500"
              />
            </div>
          )}

          <div className="sm:col-span-2">
            <button className="rounded-lg border border-accent-200 bg-accent-50 px-5 py-2.5 text-sm font-medium text-accent-700 hover:bg-accent-100">
              Adicionar bloqueio
            </button>
          </div>
        </form>

        <div className="mt-5 space-y-2">
          {blocks.length === 0 && (
            <p className="text-sm text-sand-400">Nenhum bloqueio cadastrado.</p>
          )}
          {blocks.map((b) => (
            <div
              key={b.id}
              className="flex items-center justify-between rounded-xl border border-accent-100 bg-accent-50/40 px-4 py-2.5 text-sm"
            >
              <span className="text-sand-700">
                {formatBlock(b.startAt, b.endAt)}
                {b.reason && <span className="text-sand-400"> · {b.reason}</span>}
              </span>
              <button
                onClick={() => removeBlock(b.id)}
                className="text-xs text-sand-400 hover:text-red-600"
              >
                Remover
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function formatBlock(startAt: string, endAt: string) {
  const s = new Date(startAt);
  const e = new Date(endAt);
  const day = s.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const isFullDay = s.getHours() === 0 && s.getMinutes() === 0 && e.getHours() >= 23;
  if (isFullDay) return `${day} · dia inteiro`;
  const hm = (d: Date) =>
    d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${day} · ${hm(s)} às ${hm(e)}`;
}
