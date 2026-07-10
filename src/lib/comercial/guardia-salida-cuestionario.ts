import { normalizeMedioPublicitarioSelect } from "@/lib/comercial/apartado-form-options";
import {
  computePerfilCalificacionLead,
  type PerfilamientoVisitaAnswers,
  type PerfilamientoVisitaRecord,
} from "@/lib/comercial/perfilamiento-post-visita";
import { validateProspectoTelefono } from "@/lib/comercial/prospecto-telefono";

export const GUARDIA_SALIDA_TIPO_PROSPECTO_OPTIONS = [
  { value: "pase", label: "Pase" },
  { value: "cita-programada", label: "Cita programada" },
  { value: "cita-programada-virtual", label: "Cita programada (virtual)" },
  { value: "inmobiliaria-con-prospecto", label: "Inmobiliaria con prospecto" },
  { value: "inmobiliaria-sin-prospecto", label: "Inmobiliaria sin prospecto" },
] as const;

export type GuardiaSalidaTipoProspecto =
  (typeof GUARDIA_SALIDA_TIPO_PROSPECTO_OPTIONS)[number]["value"];

export const GUARDIA_SALIDA_MEDIO_CONTACTO_OPTIONS = [
  { value: "inmobiliaria-asesor-externo", label: "Inmobiliaria / Asesor externo" },
  { value: "contacto-directo", label: "Contacto Directo" },
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "desarrollador", label: "Desarrollador" },
  { value: "google", label: "Google" },
  { value: "pase-senaletica", label: "Pase (señalética en sitio)" },
  { value: "espectacular-publipuente", label: "Espectacular / Publipuente" },
  { value: "eventos-activaciones", label: "Eventos / Activaciones" },
  { value: "stand", label: "Stand" },
  { value: "portal-especializado", label: "Portal Especializado" },
  { value: "pagina-web", label: "Página web" },
  { value: "radio", label: "Radio" },
  { value: "webinar", label: "Webinar" },
  { value: "referido", label: "Referido" },
  { value: "tiktok", label: "TikTok" },
] as const;

export type GuardiaSalidaMedioContacto =
  (typeof GUARDIA_SALIDA_MEDIO_CONTACTO_OPTIONS)[number]["value"];

export type GuardiaSalidaProspectoInput = {
  tipoProspecto: GuardiaSalidaTipoProspecto;
  nombre: string;
  telefono: string;
  email: string;
  medioContacto: GuardiaSalidaMedioContacto;
  esCrossSelling: boolean;
  presupuestoDisponible: boolean;
  intencionApartarInmediato: boolean;
  decisorVisita: boolean;
  comentariosGenerales: string;
  vioPublicidadRedes: boolean;
  fechaAtencion: string;
};

export type GuardiaSalidaCuestionarioInput = {
  atendioCitasVisitas: boolean;
  prospectos?: GuardiaSalidaProspectoInput[];
};

const TIPO_PROSPECTO_SET = new Set(GUARDIA_SALIDA_TIPO_PROSPECTO_OPTIONS.map((item) => item.value));
const MEDIO_CONTACTO_SET = new Set(GUARDIA_SALIDA_MEDIO_CONTACTO_OPTIONS.map((item) => item.value));

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const labelForTipoProspecto = (value: string) =>
  GUARDIA_SALIDA_TIPO_PROSPECTO_OPTIONS.find((item) => item.value === value)?.label ?? value;

const labelForMedioContacto = (value: string) =>
  GUARDIA_SALIDA_MEDIO_CONTACTO_OPTIONS.find((item) => item.value === value)?.label ?? value;

const assertBoolean = (value: unknown, field: string): value is boolean => {
  if (typeof value !== "boolean") {
    throw new Error(`Responde sí o no: ${field}`);
  }
  return true;
};

const assertRequiredText = (value: unknown, field: string): string => {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) {
    throw new Error(`${field} es obligatorio.`);
  }
  return text;
};

const assertDateYmd = (value: unknown): string => {
  const text = assertRequiredText(value, "Fecha de atención");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new Error("Fecha de atención inválida.");
  }
  return text;
};

export const validateGuardiaSalidaProspectoInput = (
  input: unknown,
  index: number,
): GuardiaSalidaProspectoInput => {
  if (!input || typeof input !== "object") {
    throw new Error(`Completa los datos del prospecto ${index + 1}.`);
  }

  const row = input as Record<string, unknown>;
  const tipoProspecto = typeof row.tipoProspecto === "string" ? row.tipoProspecto.trim() : "";
  if (!TIPO_PROSPECTO_SET.has(tipoProspecto as GuardiaSalidaTipoProspecto)) {
    throw new Error(`Selecciona el tipo de prospecto en el registro ${index + 1}.`);
  }

  const nombre = assertRequiredText(row.nombre, `Nombre del prospecto ${index + 1}`);
  const telefonoValidation = validateProspectoTelefono(
    typeof row.telefono === "string" ? row.telefono : "",
  );
  if (!telefonoValidation.ok) {
    throw new Error(`Prospecto ${index + 1}: ${telefonoValidation.error}`);
  }

  const email = assertRequiredText(row.email, `Correo del prospecto ${index + 1}`);
  if (!EMAIL_RE.test(email)) {
    throw new Error(`Correo inválido en el prospecto ${index + 1}.`);
  }

  const medioContacto = typeof row.medioContacto === "string" ? row.medioContacto.trim() : "";
  if (!MEDIO_CONTACTO_SET.has(medioContacto as GuardiaSalidaMedioContacto)) {
    throw new Error(`Selecciona el medio de contacto en el registro ${index + 1}.`);
  }

  assertBoolean(row.esCrossSelling, "¿Es Cross Selling?");
  assertBoolean(
    row.presupuestoDisponible,
    "¿El prospecto tiene el presupuesto necesario y disponible para comprar en el desarrollo?",
  );
  assertBoolean(row.intencionApartarInmediato, "¿El prospecto tiene intención de apartar de inmediato?");
  assertBoolean(
    row.decisorVisita,
    "¿El prospecto que atendió la visita es quien tomará la decisión final de comprar?",
  );
  assertBoolean(
    row.vioPublicidadRedes,
    "¿El prospecto ha visto publicidad del desarrollo en redes sociales?",
  );

  const comentariosGenerales = assertRequiredText(row.comentariosGenerales, "Comentarios generales");
  const fechaAtencion = assertDateYmd(row.fechaAtencion);

  return {
    tipoProspecto: tipoProspecto as GuardiaSalidaTipoProspecto,
    nombre,
    telefono: telefonoValidation.telefono,
    email: email.toLowerCase(),
    medioContacto: medioContacto as GuardiaSalidaMedioContacto,
    esCrossSelling: row.esCrossSelling as boolean,
    presupuestoDisponible: row.presupuestoDisponible as boolean,
    intencionApartarInmediato: row.intencionApartarInmediato as boolean,
    decisorVisita: row.decisorVisita as boolean,
    comentariosGenerales,
    vioPublicidadRedes: row.vioPublicidadRedes as boolean,
    fechaAtencion,
  };
};

export const validateGuardiaSalidaCuestionarioInput = (
  input: unknown,
): GuardiaSalidaCuestionarioInput => {
  if (!input || typeof input !== "object") {
    throw new Error("Completa el cuestionario de salida.");
  }

  const body = input as Record<string, unknown>;
  assertBoolean(body.atendioCitasVisitas, "¿Atendiste citas o visitas?");

  if (!body.atendioCitasVisitas) {
    return { atendioCitasVisitas: false, prospectos: [] };
  }

  if (!Array.isArray(body.prospectos) || !body.prospectos.length) {
    throw new Error("Agrega al menos un prospecto o visitante atendido.");
  }

  const prospectos = body.prospectos.map((item, index) =>
    validateGuardiaSalidaProspectoInput(item, index),
  );

  return {
    atendioCitasVisitas: true,
    prospectos,
  };
};

export const guardiaSalidaProspectoToPerfilRecord = (
  prospecto: GuardiaSalidaProspectoInput,
): PerfilamientoVisitaRecord => ({
  presupuestoDisponible: prospecto.presupuestoDisponible,
  intencionApartarInmediato: prospecto.intencionApartarInmediato,
  decisorVisita: prospecto.decisorVisita,
  vioPublicidadRedes: prospecto.vioPublicidadRedes,
});

export const guardiaSalidaProspectoToPerfilAnswers = (
  prospecto: GuardiaSalidaProspectoInput,
): PerfilamientoVisitaAnswers => ({
  presupuestoDisponible: prospecto.presupuestoDisponible,
  intencionApartarInmediato: prospecto.intencionApartarInmediato,
  decisorVisita: prospecto.decisorVisita,
  vioPublicidadRedes: prospecto.vioPublicidadRedes,
});

export const guardiaSalidaMedioContactoLabel = (value: string) => labelForMedioContacto(value);

export const guardiaSalidaTipoProspectoLabel = (value: string) => labelForTipoProspecto(value);

export const guardiaSalidaMedioContactoToProspecto = (value: GuardiaSalidaMedioContacto) => {
  const label = labelForMedioContacto(value);
  return {
    medioContacto: label,
    medioPublicitario: normalizeMedioPublicitarioSelect(label),
  };
};

export const buildGuardiaSalidaProspectoNotas = (prospecto: GuardiaSalidaProspectoInput) => {
  const lines = [
    `Registro guardia · ${labelForTipoProspecto(prospecto.tipoProspecto)}`,
    `Cross selling: ${prospecto.esCrossSelling ? "Sí" : "No"}`,
    `Comentarios: ${prospecto.comentariosGenerales}`,
  ];
  return lines.join("\n");
};

export const computeGuardiaSalidaCalificacion = (prospecto: GuardiaSalidaProspectoInput) =>
  computePerfilCalificacionLead(guardiaSalidaProspectoToPerfilRecord(prospecto));
