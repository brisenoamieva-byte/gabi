"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarClock, Copy, Link2, RefreshCw, Share2, X } from "lucide-react";
import { SHARE_EXPIRY_PRESETS, type ShareExpiryPresetId } from "@/lib/propuestas/share-constants";
import { formatShareExpiry, isShareExpired } from "@/lib/propuestas/share-format";

type ShareInfo = {
  token: string;
  estudioSlug: string;
  tituloCliente: string | null;
  activo: boolean;
  expiresAt: string | null;
  createdAt?: string;
};

type EstudioSharePanelProps = {
  slug: string;
  operatorEmail?: string;
  titulo: string;
};

export function EstudioSharePanel({ slug, operatorEmail, titulo }: EstudioSharePanelProps) {
  const [open, setOpen] = useState(false);
  const [share, setShare] = useState<ShareInfo | null>(null);
  const [codigo, setCodigo] = useState<string | null>(null);
  const [expiryPreset, setExpiryPreset] = useState<ShareExpiryPresetId>("30");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<"link" | "code" | null>(null);

  const shareUrl = share
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/estudios/v/${share.token}`
    : "";

  const loadShare = useCallback(async () => {
    if (!operatorEmail) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ slug, operatorEmail });
      const response = await fetch(`/api/estudios/share?${params}`);
      const data = (await response.json()) as { share?: ShareInfo | null; error?: string };
      if (!response.ok) {
        setError(data.error ?? "No se pudo cargar el acceso.");
        return;
      }
      setShare(data.share ?? null);
    } catch {
      setError("Error de conexión.");
    } finally {
      setLoading(false);
    }
  }, [operatorEmail, slug]);

  useEffect(() => {
    if (open) void loadShare();
  }, [open, loadShare]);

  const postAction = async (
    action: "create" | "regenerate" | "revoke" | "update_expiry",
    extra?: { expiryPreset?: ShareExpiryPresetId },
  ) => {
    if (!operatorEmail) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/estudios/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          operatorEmail,
          action,
          expiryPreset: extra?.expiryPreset ?? expiryPreset,
        }),
      });
      const data = (await response.json()) as {
        share?: ShareInfo;
        codigo?: string;
        error?: string;
      };

      if (!response.ok) {
        setError(data.error ?? "No se pudo completar la acción.");
        return;
      }

      if (action === "revoke") {
        setShare(null);
        setCodigo(null);
        return;
      }

      if (data.share) setShare(data.share);
      if (data.codigo) setCodigo(data.codigo);
    } catch {
      setError("Error de conexión.");
    } finally {
      setLoading(false);
    }
  };

  const copyText = async (text: string, kind: "link" | "code") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setError("No se pudo copiar al portapapeles.");
    }
  };

  const expiryLabel = formatShareExpiry(share?.expiresAt);
  const expired = isShareExpired(share?.expiresAt);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="gabi-no-print fixed bottom-24 right-4 z-40 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-[12px] font-semibold text-slate-700 shadow-lg transition hover:shadow-xl md:bottom-6 md:right-6"
      >
        <Share2 className="h-4 w-4 text-[#6cc24a]" />
        Compartir
      </button>

      {open ? (
        <div className="gabi-no-print fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center">
          <div
            className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl"
            role="dialog"
            aria-labelledby="estudio-share-title"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Acceso desarrollador
                </p>
                <h2 id="estudio-share-title" className="text-lg font-bold text-slate-800">
                  Compartir estudio
                </h2>
                <p className="mt-1 text-sm text-slate-500">{titulo}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-slate-200 p-2 text-slate-500"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              <p className="text-sm leading-relaxed text-slate-600">
                Enlace privado + PIN de 6 dígitos. El desarrollador solo verá esta presentación y
                podrá exportar PDF; no accede al resto de Gabi.
              </p>

              {error ? <p className="text-sm font-semibold text-red-500">{error}</p> : null}

              {!share ? (
                <div className="space-y-3">
                  <label className="block">
                    <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                      Vigencia del enlace
                    </span>
                    <select
                      value={expiryPreset}
                      onChange={(e) => setExpiryPreset(e.target.value as ShareExpiryPresetId)}
                      className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800"
                    >
                      {SHARE_EXPIRY_PRESETS.map((preset) => (
                        <option key={preset.id} value={preset.id}>
                          {preset.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    disabled={loading || !operatorEmail}
                    onClick={() => void postAction("create")}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    <Link2 className="h-4 w-4" />
                    {loading ? "Generando…" : "Generar enlace privado"}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div
                    className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 ${
                      expired ? "border-red-200 bg-red-50" : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <CalendarClock
                      className={`mt-0.5 h-4 w-4 shrink-0 ${expired ? "text-red-500" : "text-slate-500"}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                        Vigencia
                      </p>
                      <p
                        className={`text-sm font-semibold ${expired ? "text-red-700" : "text-slate-800"}`}
                      >
                        {expiryLabel}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-end gap-2">
                    <label className="min-w-[10rem] flex-1">
                      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                        Cambiar vigencia
                      </span>
                      <select
                        value={expiryPreset}
                        onChange={(e) => setExpiryPreset(e.target.value as ShareExpiryPresetId)}
                        className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-[12px]"
                      >
                        {SHARE_EXPIRY_PRESETS.map((preset) => (
                          <option key={preset.id} value={preset.id}>
                            {preset.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => void postAction("update_expiry", { expiryPreset })}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-[12px] font-semibold text-slate-700 disabled:opacity-50"
                    >
                      Aplicar
                    </button>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      Enlace
                    </p>
                    <p className="mt-1 break-all text-sm font-medium text-slate-800">{shareUrl}</p>
                    <button
                      type="button"
                      onClick={() => void copyText(shareUrl, "link")}
                      className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-700"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      {copied === "link" ? "Copiado" : "Copiar enlace"}
                    </button>
                  </div>

                  {codigo ? (
                    <div className="rounded-xl border border-[#6cc24a]/30 bg-[#6cc24a]/5 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                        PIN de acceso (guárdalo ahora)
                      </p>
                      <p className="mt-2 font-mono text-3xl font-bold tracking-[0.35em] text-slate-800">
                        {codigo}
                      </p>
                      <button
                        type="button"
                        onClick={() => void copyText(codigo, "code")}
                        className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-700"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        {copied === "code" ? "Copiado" : "Copiar PIN"}
                      </button>
                      <p className="mt-2 text-[11px] text-slate-500">
                        El PIN no se vuelve a mostrar. Regenera uno nuevo si lo perdiste.
                      </p>
                    </div>
                  ) : (
                    <p className="text-[12px] text-slate-500">
                      Enlace activo. Regenera el PIN si necesitas compartirlo de nuevo.
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => void postAction("regenerate")}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[12px] font-semibold text-slate-700 disabled:opacity-50"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Nuevo PIN
                    </button>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => void postAction("revoke")}
                      className="rounded-lg border border-red-200 px-3 py-2 text-[12px] font-semibold text-red-600 disabled:opacity-50"
                    >
                      Revocar acceso
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
