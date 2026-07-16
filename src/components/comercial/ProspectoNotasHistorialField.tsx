"use client";

import { useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import {
  appendProspectoNota,
  formatProspectoNotaAtLabel,
  parseProspectoNotasHistorial,
  sortProspectoNotasNewestFirst,
} from "@/lib/comercial/prospecto-notas-historial";

type ProspectoNotasHistorialFieldProps = {
  value: string;
  onChange: (next: string) => void;
  /** Si se define, persiste al agregar (recomendado). */
  onPersist?: (next: string) => Promise<void>;
  disabled?: boolean;
  inputClassName?: string;
  placeholder?: string;
  label?: string;
};

export function ProspectoNotasHistorialField({
  value,
  onChange,
  onPersist,
  disabled = false,
  inputClassName = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-[#201044] outline-none focus:border-[#201044]/40",
  placeholder = "Qué pasó / próximo paso…",
  label = "Notas de seguimiento",
}: ProspectoNotasHistorialFieldProps) {
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const entries = useMemo(
    () => sortProspectoNotasNewestFirst(parseProspectoNotasHistorial(value)),
    [value],
  );

  const handleAdd = async () => {
    setError("");
    let next: string;
    try {
      next = appendProspectoNota(value, draft);
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : "No se pudo agregar la nota.");
      return;
    }

    setSaving(true);
    try {
      if (onPersist) {
        await onPersist(next);
      }
      onChange(next);
      setDraft("");
    } catch (persistError) {
      setError(
        persistError instanceof Error ? persistError.message : "No se pudo guardar la nota.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-slate-600">{label}</p>
        {entries.length ? (
          <p className="text-[10px] font-medium text-slate-400">{entries.length} en historial</p>
        ) : null}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          disabled={disabled || saving}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void handleAdd();
            }
          }}
          className={`${inputClassName} min-h-9`}
          placeholder={placeholder}
        />
        <button
          type="button"
          disabled={disabled || saving || !draft.trim()}
          onClick={() => void handleAdd()}
          className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg bg-[#201044] px-3 text-xs font-bold text-white disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Agregar
        </button>
      </div>

      {error ? <p className="text-[11px] text-rose-600">{error}</p> : null}

      {entries.length ? (
        <ul className="max-h-48 space-y-1.5 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50/80 p-2">
          {entries.map((entry) => (
            <li
              key={`${entry.lineIndex}-${entry.at ?? "legado"}`}
              className="rounded-md bg-white px-2.5 py-1.5 shadow-sm ring-1 ring-slate-100"
            >
              <p
                className={`text-[10px] font-semibold uppercase tracking-wide ${
                  entry.kind === "sistema" ? "text-amber-700" : "text-slate-400"
                }`}
              >
                {formatProspectoNotaAtLabel(entry.at)}
                {entry.kind === "legado" ? " · notas previas" : null}
              </p>
              <p className="mt-0.5 text-xs leading-snug text-[#201044]">{entry.texto}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[11px] text-slate-400">Sin notas aún. Agrega la primera arriba.</p>
      )}
    </div>
  );
}
