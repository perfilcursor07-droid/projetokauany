"use client";

import { useEffect, useMemo, useState } from "react";
import { api, brl } from "@/lib/api";

type TransactionType = "in" | "out";

type Transaction = {
  id: string;
  type: TransactionType;
  description: string;
  category: string | null;
  amount: number;
  occurredAt: string;
  appointmentId: string | null;
  paymentId: string | null;
  expenseId: string | null;
};

type FinancialCategory = {
  id: string;
  name: string;
  type: TransactionType;
};

type FinancialData = {
  month: string;
  summary: {
    income: number;
    outcome: number;
    balance: number;
  };
  transactions: Transaction[];
};

type FormState = {
  type: TransactionType;
  description: string;
  category: string;
  newCategory: string;
  amount: string;
  occurredAt: string;
};

type Filter = "all" | "in" | "out";

const today = new Date().toISOString().slice(0, 10);
const currentMonth = today.slice(0, 7);
const emptyForm: FormState = {
  type: "out",
  description: "",
  category: "",
  newCategory: "",
  amount: "",
  occurredAt: today,
};

export default function FinanceiroPage() {
  const [month, setMonth] = useState(currentMonth);
  const [data, setData] = useState<FinancialData | null>(null);
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [filter, setFilter] = useState<Filter>("all");

  const transactions = data?.transactions ?? [];
  const filtered = useMemo(
    () => (filter === "all" ? transactions : transactions.filter((t) => t.type === filter)),
    [transactions, filter],
  );
  const groups = useMemo(() => groupByDay(filtered), [filtered]);
  const incomeCount = transactions.filter((t) => t.type === "in").length;
  const outcomeCount = transactions.filter((t) => t.type === "out").length;

  const categoryOptions = useMemo(
    () => categories.filter((category) => category.type === form.type),
    [categories, form.type],
  );
  const amountValue = Number(form.amount.replace(",", "."));
  const amountOk = Number.isFinite(amountValue) && amountValue > 0;
  const selectedCategory =
    form.category === "__new__" ? form.newCategory.trim() : form.category.trim();
  const canSave = Boolean(form.description.trim()) && amountOk && Boolean(selectedCategory);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  async function load() {
    setError(null);
    try {
      const [financial, cats] = await Promise.all([
        api<FinancialData>(`/api/admin/financial?month=${month}`, { auth: true }),
        api<FinancialCategory[]>("/api/admin/financial/categories", { auth: true }),
      ]);
      setData(financial);
      setCategories(cats);
    } catch (e: any) {
      setError(e.message);
    }
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function saveTransaction() {
    if (!canSave) return;
    if (
      editingId &&
      !window.confirm("Aviso: editar esta movimentação altera o caixa do mês. Deseja continuar?")
    ) {
      return;
    }

    setSaving(true);
    setError(null);
    setMsg(null);
    try {
      const category = selectedCategory;
      if (form.category === "__new__") {
        await api("/api/admin/financial/categories", {
          method: "POST",
          auth: true,
          body: JSON.stringify({ name: category, type: form.type }),
        });
      }

      await api(
        editingId
          ? `/api/admin/financial/transactions/${editingId}`
          : "/api/admin/financial/transactions",
        {
          method: editingId ? "PATCH" : "POST",
          auth: true,
          body: JSON.stringify({
            type: form.type,
            description: form.description.trim(),
            category,
            amount: amountValue,
            occurredAt: form.occurredAt,
          }),
        },
      );
      setMsg(editingId ? "Movimentação atualizada." : "Movimentação registrada.");
      resetForm();
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function editTransaction(item: Transaction) {
    setEditingId(item.id);
    setForm({
      type: item.type,
      description: item.description,
      category: item.category ?? "",
      newCategory: "",
      amount: String(item.amount).replace(".", ","),
      occurredAt: dateInput(item.occurredAt),
    });
    setMsg("Revise os dados antes de salvar. Alterações afetam o caixa.");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteTransaction(item: Transaction) {
    const detail = item.paymentId
      ? "Esta entrada veio de um pagamento. Excluir remove apenas do caixa, não desfaz o pagamento."
      : "Esta ação remove a movimentação do caixa.";
    if (!window.confirm(`Aviso: ${detail}\n\nDeseja excluir mesmo assim?`)) return;

    setError(null);
    setMsg(null);
    try {
      await api(`/api/admin/financial/transactions/${item.id}`, {
        method: "DELETE",
        auth: true,
      });
      setMsg("Movimentação excluída.");
      if (editingId === item.id) resetForm();
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  const balance = data?.summary.balance ?? 0;

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <section className="flex flex-col gap-4 rounded-lg border border-accent-100 bg-white p-4 shadow-sm shadow-accent-100/40 md:flex-row md:items-center md:justify-between sm:p-5">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-accent-200 bg-accent-50 px-2.5 py-1 text-[11px] font-semibold uppercase text-accent-700">
            <WalletIcon className="h-3.5 w-3.5" />
            Financeiro
          </div>
          <h1 className="font-display text-3xl text-sand-900">Caixa do studio</h1>
          <p className="mt-1 text-sm text-sand-500">
            Acompanhe entradas, saídas e o saldo do mês.
          </p>
        </div>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-sand-500">Mês</span>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-lg border border-accent-200 bg-accent-50 px-3 py-2 text-sm font-medium text-accent-800 outline-none focus:border-accent-500"
          />
        </label>
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

      {/* Resumo compacto: entrada, saída e saldo */}
      <section className="grid gap-3 sm:grid-cols-3">
        <StatCard
          tone="in"
          label="Entradas"
          caption="o que entrou"
          value={brl(data?.summary.income ?? 0)}
          count={incomeCount}
        />
        <StatCard
          tone="out"
          label="Saídas"
          caption="o que saiu"
          value={brl(data?.summary.outcome ?? 0)}
          count={outcomeCount}
        />
        <StatCard
          tone="balance"
          label="Saldo"
          caption={`sobra em ${monthLabel(month)}`}
          value={brl(balance)}
          negative={balance < 0}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        {/* Formulário */}
        <div className="self-start rounded-lg border border-accent-100 bg-white p-4 shadow-sm shadow-accent-100/40 xl:sticky xl:top-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-xl text-sand-900">
                {editingId ? "Editar movimentação" : "Nova movimentação"}
              </h2>
              <p className="mt-1 text-sm text-sand-500">
                Registre uma entrada ou saída manual.
              </p>
            </div>
            {editingId && (
              <button
                onClick={resetForm}
                className="rounded-lg border border-sand-200 px-3 py-2 text-xs font-medium text-sand-500 hover:bg-sand-50"
              >
                Cancelar
              </button>
            )}
          </div>

          {editingId && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Editar muda os totais do caixa. Confira antes de salvar.
            </div>
          )}

          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-sand-50 p-1">
              <TypeButton
                active={form.type === "in"}
                label="Entrada"
                tone="in"
                onClick={() => setForm({ ...form, type: "in", category: "", newCategory: "" })}
              />
              <TypeButton
                active={form.type === "out"}
                label="Saída"
                tone="out"
                onClick={() => setForm({ ...form, type: "out", category: "", newCategory: "" })}
              />
            </div>

            <Field
              label="Descrição"
              value={form.description}
              onChange={(description) => setForm({ ...form, description })}
              placeholder={form.type === "in" ? "Ex.: Venda avulsa" : "Ex.: Compra de esmaltes"}
            />

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-sand-600">Categoria</span>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value, newCategory: "" })}
                className="w-full rounded-lg border border-sand-300 px-3 py-2.5 text-sm outline-none focus:border-accent-500"
              >
                <option value="">Selecione uma categoria</option>
                {categoryOptions.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
                <option value="__new__">+ Adicionar nova categoria</option>
              </select>
            </label>

            {form.category === "__new__" && (
              <Field
                label="Nova categoria"
                value={form.newCategory}
                onChange={(newCategory) => setForm({ ...form, newCategory })}
                placeholder={form.type === "in" ? "Ex.: Produtos vendidos" : "Ex.: Materiais"}
              />
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Valor"
                value={form.amount}
                onChange={(amount) => setForm({ ...form, amount })}
                placeholder="0,00"
                inputMode="decimal"
              />
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-sand-600">Data</span>
                <input
                  type="date"
                  value={form.occurredAt}
                  onChange={(e) => setForm({ ...form, occurredAt: e.target.value })}
                  className="w-full rounded-lg border border-sand-300 px-3 py-2.5 text-sm outline-none focus:border-accent-500"
                />
              </label>
            </div>

            <button
              onClick={saveTransaction}
              disabled={saving || !canSave}
              className="w-full rounded-lg bg-accent-600 py-3 text-sm font-medium text-white transition hover:bg-accent-700 disabled:opacity-40"
            >
              {saving
                ? "Salvando..."
                : editingId
                  ? "Salvar edição"
                  : form.type === "in"
                    ? "Adicionar entrada"
                    : "Adicionar saída"}
            </button>
          </div>
        </div>

        {/* Extrato */}
        <div className="overflow-hidden rounded-lg border border-accent-100 bg-white shadow-sm shadow-accent-100/40">
          <div className="flex flex-col gap-3 border-b border-accent-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-xl text-sand-900">Extrato do mês</h2>
              <p className="mt-0.5 text-sm text-sand-500">
                {filtered.length} movimenta{filtered.length === 1 ? "ção" : "ções"}
              </p>
            </div>
            <div className="flex gap-1 rounded-lg bg-sand-50 p-1">
              <FilterButton label="Tudo" active={filter === "all"} onClick={() => setFilter("all")} />
              <FilterButton label="Entradas" active={filter === "in"} onClick={() => setFilter("in")} />
              <FilterButton label="Saídas" active={filter === "out"} onClick={() => setFilter("out")} />
            </div>
          </div>

          {!data && !error && <p className="p-6 text-sm text-sand-400">Carregando...</p>}
          {data && filtered.length === 0 && (
            <div className="flex flex-col items-center gap-2 p-10 text-center">
              <WalletIcon className="h-6 w-6 text-accent-300" />
              <p className="text-sm text-sand-400">Nenhuma movimentação neste filtro.</p>
            </div>
          )}

          {groups.map((group) => (
            <div key={group.key}>
              <div className="flex items-center justify-between bg-sand-50/70 px-4 py-2">
                <span className="text-xs font-semibold text-sand-600">{group.label}</span>
                <span
                  className={`text-xs font-semibold ${
                    group.subtotal < 0 ? "text-red-600" : "text-emerald-700"
                  }`}
                >
                  {group.subtotal >= 0 ? "+" : "-"} {brl(Math.abs(group.subtotal))}
                </span>
              </div>
              {group.items.map((item) => (
                <div
                  key={item.id}
                  className="group flex items-center gap-3 border-b border-accent-50 px-4 py-3 last:border-0 hover:bg-sand-50/50"
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      item.type === "in"
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-red-50 text-red-500"
                    }`}
                  >
                    {item.type === "in" ? (
                      <ArrowDownIcon className="h-4 w-4" />
                    ) : (
                      <ArrowUpIcon className="h-4 w-4" />
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-sand-900">{item.description}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      {item.category && (
                        <span className="rounded-full bg-accent-50 px-2 py-0.5 text-[11px] font-medium text-accent-700">
                          {item.category}
                        </span>
                      )}
                      {(item.paymentId || item.appointmentId) && (
                        <span className="rounded-full bg-sand-100 px-2 py-0.5 text-[11px] font-medium text-sand-500">
                          automático
                        </span>
                      )}
                    </div>
                  </div>

                  <span
                    className={`shrink-0 font-display text-lg ${
                      item.type === "in" ? "text-emerald-700" : "text-red-600"
                    }`}
                  >
                    {item.type === "in" ? "+" : "-"} {brl(item.amount)}
                  </span>

                  <div className="flex shrink-0 gap-1 opacity-0 transition group-hover:opacity-100 max-sm:opacity-100">
                    <button
                      onClick={() => editTransaction(item)}
                      title="Editar"
                      className="rounded-lg border border-accent-100 p-1.5 text-accent-700 hover:bg-accent-50"
                    >
                      <EditIcon className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => deleteTransaction(item)}
                      title="Excluir"
                      className="rounded-lg border border-red-100 p-1.5 text-red-600 hover:bg-red-50"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ----------------------------- helpers UI ----------------------------- */

function FilterButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
        active ? "bg-white text-accent-700 shadow-sm" : "text-sand-500 hover:text-sand-800"
      }`}
    >
      {label}
    </button>
  );
}

function TypeButton({
  active,
  label,
  tone,
  onClick,
}: {
  active: boolean;
  label: string;
  tone: "in" | "out";
  onClick: () => void;
}) {
  const activeCls =
    tone === "in" ? "bg-white text-emerald-700 shadow-sm" : "bg-white text-red-600 shadow-sm";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
        active ? activeCls : "text-sand-500 hover:text-sand-800"
      }`}
    >
      {label}
    </button>
  );
}

function StatCard({
  tone,
  label,
  caption,
  value,
  count,
  negative,
}: {
  tone: "in" | "out" | "balance";
  label: string;
  caption: string;
  value: string;
  count?: number;
  negative?: boolean;
}) {
  const iconWrap =
    tone === "in"
      ? "bg-emerald-50 text-emerald-600"
      : tone === "out"
        ? "bg-red-50 text-red-500"
        : "bg-sand-100 text-sand-700";
  const valueCls =
    tone === "in"
      ? "text-emerald-700"
      : tone === "out"
        ? "text-red-600"
        : negative
          ? "text-red-600"
          : "text-sand-900";

  return (
    <div className="rounded-lg border border-accent-100 bg-white p-3.5 shadow-sm shadow-accent-100/40">
      <div className="flex items-center gap-2">
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconWrap}`}>
          {tone === "in" ? (
            <ArrowDownIcon className="h-4 w-4" />
          ) : tone === "out" ? (
            <ArrowUpIcon className="h-4 w-4" />
          ) : (
            <WalletIcon className="h-4 w-4" />
          )}
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-sand-800">{label}</p>
          <p className="text-[11px] text-sand-400">{caption}</p>
        </div>
        {count != null && (
          <span className="rounded-full bg-sand-100 px-2 py-0.5 text-[11px] font-semibold text-sand-500">
            {count}
          </span>
        )}
      </div>
      <p className={`mt-2 font-display text-xl leading-tight ${valueCls}`}>{value}</p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-sand-600">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        className="w-full rounded-lg border border-sand-300 px-3 py-2.5 text-sm outline-none placeholder:text-sand-400 focus:border-accent-500"
      />
    </label>
  );
}

/* ----------------------------- helpers dados ----------------------------- */

type DayGroup = { key: string; label: string; items: Transaction[]; subtotal: number };

function groupByDay(items: Transaction[]): DayGroup[] {
  const map = new Map<string, Transaction[]>();
  for (const item of items) {
    const key = dateInput(item.occurredAt);
    const arr = map.get(key) ?? [];
    arr.push(item);
    map.set(key, arr);
  }
  return Array.from(map.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([key, list]) => ({
      key,
      label: dayLabel(key),
      items: list,
      subtotal: list.reduce((s, t) => s + (t.type === "in" ? t.amount : -t.amount), 0),
    }));
}

function dateInput(iso: string) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dayLabel(key: string) {
  const todayKey = dateInput(new Date().toISOString());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yKey = dateInput(yesterday.toISOString());
  if (key === todayKey) return "Hoje";
  if (key === yKey) return "Ontem";
  const [y, m, d] = key.split("-");
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

function monthLabel(month: string) {
  const [y, m] = month.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

/* ----------------------------- ícones ----------------------------- */

function IconBase({ children, className = "h-5 w-5" }: { children: React.ReactNode; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}
function WalletIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
      <path d="M16 12h4" />
      <path d="M3 9h13" />
    </IconBase>
  );
}
function ArrowUpIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M12 19V5" />
      <path d="m6 11 6-6 6 6" />
    </IconBase>
  );
}
function ArrowDownIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M12 5v14" />
      <path d="m6 13 6 6 6-6" />
    </IconBase>
  );
}
function EditIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </IconBase>
  );
}
function TrashIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M6 6l1 14h10l1-14" />
    </IconBase>
  );
}
