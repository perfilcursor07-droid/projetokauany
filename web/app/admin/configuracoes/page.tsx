"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

type Settings = {
  name: string;
  logoUrl: string | null;
  phone: string | null;
  slug: string | null;
};

const MAX_LOGO_BYTES = 500 * 1024; // 500 KB

function normalizeSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export default function ConfiguracoesPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api<Settings>("/api/admin/settings", { auth: true })
      .then((s) => {
        setName(s.name);
        setPhone(s.phone ?? "");
        setLogoUrl(s.logoUrl);
        setSlug(s.slug ?? "");
      })
      .catch((e) => setError(e.message));
  }, []);

  function onPickLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Selecione um arquivo de imagem.");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setError("Imagem muito grande (máx. 500 KB). Use uma menor.");
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => setLogoUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function save() {
    setSaving(true);
    setError(null);
    setMsg(null);
    try {
      const saved = await api<Settings>("/api/admin/settings", {
        method: "PUT",
        auth: true,
        body: JSON.stringify({
          name: name.trim(),
          slug: normalizeSlug(slug),
          phone: phone || null,
          logoUrl,
        }),
      });
      setSlug(saved.slug ?? "");
      setMsg("Configurações salvas.");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section className="rounded-lg border border-accent-100 bg-white p-4 shadow-sm shadow-accent-100/40 sm:p-5">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-accent-200 bg-accent-50 px-2.5 py-1 text-[11px] font-semibold uppercase text-accent-700">
          Identidade
        </div>
        <h1 className="font-display text-3xl text-sand-900">Configurações</h1>
        <p className="mt-1 text-sm text-sand-500">Nome, logo e link público do seu studio.</p>
      </section>

      {error && (
        <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}
      {msg && (
        <div className="mb-4 rounded-lg border border-accent-200 bg-accent-50 px-4 py-3 text-sm text-accent-700">
          {msg}
        </div>
      )}

      <div className="space-y-6 rounded-lg border border-accent-100 bg-white p-6 shadow-sm shadow-accent-100/40">
        {/* Logo */}
        <div>
          <span className="mb-2 block text-xs font-medium text-sand-600">Logomarca</span>
          <div className="flex items-center gap-4">
            {logoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={logoUrl}
                alt="Logo"
              className="h-20 w-20 rounded-2xl border border-accent-100 object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-dashed border-accent-200 bg-accent-50 font-display text-3xl text-accent-700">
                {(name.trim().charAt(0) || "S").toUpperCase()}
              </div>
            )}
            <div className="flex flex-col gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={onPickLogo}
                className="hidden"
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="rounded-lg border border-accent-200 bg-accent-50 px-4 py-2 text-sm font-medium text-accent-700 hover:bg-accent-100"
              >
                Enviar imagem
              </button>
              {logoUrl && (
                <button
                  onClick={() => setLogoUrl(null)}
                  className="text-xs text-sand-400 hover:text-sand-700"
                >
                  Remover logo
                </button>
              )}
            </div>
          </div>
          <p className="mt-2 text-xs text-sand-400">
            PNG ou JPG, quadrada de preferência. Máx. 500 KB.
          </p>
        </div>

        <div className="border-t border-sand-100" />

        <div className="space-y-5">
          {/* Nome */}
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-sand-600">
              Nome do studio
            </span>
            <input
              value={name}
              onChange={(e) => {
                const nextName = e.target.value;
                setName(nextName);
                if (!slug) setSlug(normalizeSlug(nextName));
              }}
              placeholder="Ex.: Studio Flora"
              className="w-full rounded-lg border border-sand-300 px-4 py-2.5 outline-none focus:border-accent-500"
            />
          </label>

          {/* Slug */}
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-sand-600">
              Link público
            </span>
            <div className="flex overflow-hidden rounded-lg border border-sand-300 focus-within:border-accent-500">
              <span className="flex items-center border-r border-sand-200 bg-sand-50 px-3 text-sm text-sand-400">
                /
              </span>
              <input
                value={slug}
                onChange={(e) => setSlug(normalizeSlug(e.target.value))}
                placeholder="studio-flora"
                className="min-w-0 flex-1 px-4 py-2.5 outline-none"
              />
            </div>
            <p className="mt-1 text-xs text-sand-400">
              Esse é o endereço que as clientes usam para agendar.
            </p>
          </label>

          {/* Telefone */}
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-sand-600">
              WhatsApp / telefone
            </span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="5563999999999"
              className="w-full rounded-lg border border-sand-300 px-4 py-2.5 outline-none focus:border-accent-500"
            />
          </label>
        </div>

        <button
          onClick={save}
          disabled={saving || name.trim().length < 2 || normalizeSlug(slug).length < 2}
          className="rounded-lg bg-accent-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-accent-700 disabled:opacity-40"
        >
          {saving ? "Salvando…" : "Salvar alterações"}
        </button>
      </div>
    </div>
  );
}
