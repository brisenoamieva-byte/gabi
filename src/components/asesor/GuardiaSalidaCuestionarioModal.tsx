"use client";

import { useMemo, useState } from "react";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import type { AsesorGuardiaHoy } from "@/lib/asesores/guardias-service";
import {
  GUARDIA_SALIDA_MEDIO_CONTACTO_OPTIONS,
  GUARDIA_SALIDA_TIPO_PROSPECTO_OPTIONS,
  type GuardiaSalidaProspectoInput,
} from "@/lib/comercial/guardia-salida-cuestionario";
import { getMexicoCityDateInput } from "@/lib/comercial/format-lead-date";

type GuardiaSalidaCuestionarioModalProps = {
  guardia: AsesorGuardiaHoy;
  asesorId: string;
  desarrolloId: string;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    atendioCitasVisitas: boolean;
    prospectos: GuardiaSalidaProspectoInput[];
  }) => Promise<void>;
};

type ProspectoDraft = {
  tipoProspecto: string;
  nombre: string;
  telefono: string;
  email: string;
  medioContacto: string;
  esCrossSelling: "" | "si" | "no";
  presupuestoDisponible: "" | "si" | "no";
  intencionApartarInmediato: "" | "si" | "no";
  decisorVisita: "" | "si" | "no";
  comentariosGenerales: string;
  vioPublicidadRedes: "" | "si" | "no";
  fechaAtencion: string;
};

const inputClass =
  "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-[#201044] focus:outline-none focus:ring-2 focus:ring-[#201044]/15";

const emptyProspectoDraft = (): ProspectoDraft => ({
  tipoProspecto: "",
  nombre: "",
  telefono: "",
  email: "",
  medioContacto: "",
  esCrossSelling: "",
  presupuestoDisponible: "",
  intencionApartarInmediato: "",
  decisorVisita: "",
  comentariosGenerales: "",
  vioPublicidadRedes: "",
  fechaAtencion: getMexicoCityDateInput(),
});

const parseSiNo = (value: "" | "si" | "no", label: string): boolean => {
  if (value === "si") {
    return true;
  }
  if (value === "no") {
    return false;
  }
  throw new Error(`Responde sí o no: ${label}`);
};

const draftToInput = (draft: ProspectoDraft): GuardiaSalidaProspectoInput => ({
  tipoProspecto: draft.tipoProspecto as GuardiaSalidaProspectoInput["tipoProspecto"],
  nombre: draft.nombre.trim(),
  telefono: draft.telefono.trim(),
  email: draft.email.trim(),
  medioContacto: draft.medioContacto as GuardiaSalidaProspectoInput["medioContacto"],
  esCrossSelling: parseSiNo(draft.esCrossSelling, "¿Es Cross Selling?"),
  presupuestoDisponible: parseSiNo(
    draft.presupuestoDisponible,
    "¿El prospecto tiene el presupuesto necesario y disponible para comprar en el desarrollo?",
  ),
  intencionApartarInmediato: parseSiNo(
    draft.intencionApartarInmediato,
    "¿El prospecto tiene intención de apartar de inmediato?",
  ),
  decisorVisita: parseSiNo(
    draft.decisorVisita,
    "¿El prospecto que atendió la visita es quien tomará la decisión final de comprar?",
  ),
  comentariosGenerales: draft.comentariosGenerales.trim(),
  vioPublicidadRedes: parseSiNo(
    draft.vioPublicidadRedes,
    "¿El prospecto ha visto publicidad del desarrollo en redes sociales?",
  ),
  fechaAtencion: draft.fechaAtencion,
});

function SiNoField({
  fieldId,
  label,
  value,
  onChange,
  required = true,
}: {
  fieldId: string;
  label: string;
  value: "" | "si" | "no";
  onChange: (value: "si" | "no") => void;
  required?: boolean;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 block text-xs font-semibold text-slate-600">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </legend>
      <div className="flex gap-4">
        {(["si", "no"] as const).map((option) => (
          <label key={option} className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="radio"
              name={fieldId}
              checked={value === option}
              onChange={() => onChange(option)}
              className="accent-[#201044]"
            />
            {option === "si" ? "Sí" : "No"}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function ProspectoSalidaForm({
  index,
  draft,
  canRemove,
  onChange,
  onRemove,
}: {
  index: number;
  draft: ProspectoDraft;
  canRemove: boolean;
  onChange: (next: ProspectoDraft) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-[#201044]">Prospecto o visitante {index + 1}</p>
        {canRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Quitar
          </button>
        ) : null}
      </div>

      <div className="space-y-3">
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-slate-600">
            Tipo de prospecto <span className="text-red-500">*</span>
          </span>
          <select
            value={draft.tipoProspecto}
            onChange={(event) => onChange({ ...draft, tipoProspecto: event.target.value })}
            className={inputClass}
          >
            <option value="">Selecciona…</option>
            {GUARDIA_SALIDA_TIPO_PROSPECTO_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-slate-600">
            Nombre completo del prospecto <span className="text-red-500">*</span>
          </span>
          <input
            value={draft.nombre}
            onChange={(event) => onChange({ ...draft, nombre: event.target.value })}
            className={inputClass}
            placeholder="Nombre y apellido"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-slate-600">
              Teléfono a 10 dígitos <span className="text-red-500">*</span>
            </span>
            <input
              value={draft.telefono}
              onChange={(event) => onChange({ ...draft, telefono: event.target.value })}
              className={inputClass}
              inputMode="numeric"
              placeholder="4421234567"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-slate-600">
              Correo electrónico <span className="text-red-500">*</span>
            </span>
            <input
              type="email"
              value={draft.email}
              onChange={(event) => onChange({ ...draft, email: event.target.value })}
              className={inputClass}
              placeholder="correo@ejemplo.com"
            />
          </label>
        </div>

        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-slate-600">
            Medio de contacto <span className="text-red-500">*</span>
          </span>
          <select
            value={draft.medioContacto}
            onChange={(event) => onChange({ ...draft, medioContacto: event.target.value })}
            className={inputClass}
          >
            <option value="">Selecciona…</option>
            {GUARDIA_SALIDA_MEDIO_CONTACTO_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <SiNoField
          fieldId={`prospecto-${index}-cross`}
          label="¿Es Cross Selling?"
          value={draft.esCrossSelling}
          onChange={(value) => onChange({ ...draft, esCrossSelling: value })}
        />
        <SiNoField
          fieldId={`prospecto-${index}-presupuesto`}
          label="¿El prospecto tiene el presupuesto necesario y disponible para comprar en el desarrollo?"
          value={draft.presupuestoDisponible}
          onChange={(value) => onChange({ ...draft, presupuestoDisponible: value })}
        />
        <SiNoField
          fieldId={`prospecto-${index}-apartar`}
          label="¿El prospecto tiene intención de apartar de inmediato?"
          value={draft.intencionApartarInmediato}
          onChange={(value) => onChange({ ...draft, intencionApartarInmediato: value })}
        />
        <SiNoField
          fieldId={`prospecto-${index}-decisor`}
          label="¿El prospecto que atendió la visita es quien tomará la decisión final de comprar?"
          value={draft.decisorVisita}
          onChange={(value) => onChange({ ...draft, decisorVisita: value })}
        />

        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-slate-600">
            Comentarios generales <span className="text-red-500">*</span>
          </span>
          <textarea
            value={draft.comentariosGenerales}
            onChange={(event) => onChange({ ...draft, comentariosGenerales: event.target.value })}
            className={`${inputClass} min-h-[88px]`}
            placeholder="Independientemente del medio de contacto."
          />
        </label>

        <SiNoField
          fieldId={`prospecto-${index}-publicidad`}
          label="¿El prospecto ha visto publicidad del desarrollo en redes sociales?"
          value={draft.vioPublicidadRedes}
          onChange={(value) => onChange({ ...draft, vioPublicidadRedes: value })}
        />

        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-slate-600">
            Fecha efectiva en la que atendiste al pase/visita/inmobiliaria{" "}
            <span className="text-red-500">*</span>
          </span>
          <input
            type="date"
            value={draft.fechaAtencion}
            onChange={(event) => onChange({ ...draft, fechaAtencion: event.target.value })}
            className={inputClass}
          />
        </label>
      </div>
    </div>
  );
}

export function GuardiaSalidaCuestionarioModal({
  guardia,
  submitting,
  onClose,
  onSubmit,
}: GuardiaSalidaCuestionarioModalProps) {
  const [atendioCitasVisitas, setAtendioCitasVisitas] = useState<"" | "si" | "no">("");
  const [prospectos, setProspectos] = useState<ProspectoDraft[]>([emptyProspectoDraft()]);
  const [error, setError] = useState("");

  const showProspectos = atendioCitasVisitas === "si";

  const title = useMemo(
    () => `Cuestionario de salida · ${guardia.turnoLabel}`,
    [guardia.turnoLabel],
  );

  const handleSubmit = async () => {
    setError("");

    try {
      if (atendioCitasVisitas !== "si" && atendioCitasVisitas !== "no") {
        throw new Error("Responde si atendiste citas o visitas.");
      }

      const atendio = atendioCitasVisitas === "si";
      const payload = {
        atendioCitasVisitas: atendio,
        prospectos: atendio ? prospectos.map((draft) => draftToInput(draft)) : [],
      };

      await onSubmit(payload);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Revisa el cuestionario.");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#6cc24a]">
              Salida de guardia
            </p>
            <h2 className="text-xl font-black text-[#201044]">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">
              Completa el cuestionario antes de registrar tu salida con GPS.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <SiNoField
            fieldId="atendio-citas-visitas"
            label="¿Atendiste citas o visitas?"
            value={atendioCitasVisitas}
            onChange={(value) => {
              setAtendioCitasVisitas(value);
              if (value === "si" && !prospectos.length) {
                setProspectos([emptyProspectoDraft()]);
              }
            }}
          />

          {showProspectos ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Registra los datos de cada persona que atendiste durante tu guardia.
              </p>
              {prospectos.map((draft, index) => (
                <ProspectoSalidaForm
                  key={index}
                  index={index}
                  draft={draft}
                  canRemove={prospectos.length > 1}
                  onChange={(next) =>
                    setProspectos((current) =>
                      current.map((item, itemIndex) => (itemIndex === index ? next : item)),
                    )
                  }
                  onRemove={() =>
                    setProspectos((current) => current.filter((_, itemIndex) => itemIndex !== index))
                  }
                />
              ))}
              <button
                type="button"
                onClick={() => setProspectos((current) => [...current, emptyProspectoDraft()])}
                className="inline-flex items-center gap-2 rounded-xl border border-dashed border-[#201044]/25 px-4 py-2.5 text-sm font-semibold text-[#201044]"
              >
                <Plus className="h-4 w-4" />
                Agregar otro prospecto
              </button>
            </div>
          ) : null}

          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {error}
            </p>
          ) : null}
        </div>

        <div className="border-t border-slate-100 px-5 py-4">
          <button
            type="button"
            disabled={submitting || !atendioCitasVisitas}
            onClick={() => void handleSubmit()}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#201044] px-4 text-sm font-bold text-white disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Confirmar salida y registrar GPS
          </button>
        </div>
      </div>
    </div>
  );
}
