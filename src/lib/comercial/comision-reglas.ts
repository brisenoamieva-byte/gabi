export type ComisionPagoTrigger = "enganche_expediente" | "escrituracion" | "contado";

export type ComisionPagoRegla = {
  id: string;
  porcentajePago: number;
  trigger: ComisionPagoTrigger;
  requisitos: string;
};

export type ComisionReglaDesarrollo = {
  /** Nombre comercial (Anexos.xlsx). */
  nombre: string;
  /** IDs en GABI cuando existen. */
  desarrolloIds: string[];
  comisionPct: number | null;
  comisionNota?: string;
  /** % enganche para considerar "cubierto" (ej. 30). null = validación manual. */
  enganchePctRequerido: number | null;
  pagos: ComisionPagoRegla[];
};

/** Reglas de comisión BBR — Anexos.xlsx (A1 + A2). */
export const COMISION_REGLAS: ComisionReglaDesarrollo[] = [
  {
    nombre: "Cañadas del Arroyo",
    desarrolloIds: [],
    comisionPct: 4,
    enganchePctRequerido: 30,
    pagos: [{ id: "100-enganche", porcentajePago: 100, trigger: "enganche_expediente", requisitos: "Enganche cubierto (30%) y expediente completo." }],
  },
  {
    nombre: "Cañadas del Valle",
    desarrolloIds: [],
    comisionPct: 4,
    enganchePctRequerido: 30,
    pagos: [{ id: "100-enganche", porcentajePago: 100, trigger: "enganche_expediente", requisitos: "Enganche cubierto (30%) y expediente completo." }],
  },
  {
    nombre: "Cañadas La Porta",
    desarrolloIds: [],
    comisionPct: 4,
    enganchePctRequerido: 30,
    pagos: [{ id: "100-enganche", porcentajePago: 100, trigger: "enganche_expediente", requisitos: "Enganche cubierto (30%) y expediente completo." }],
  },
  {
    nombre: "La Ceiba Bosque Urbano",
    desarrolloIds: [],
    comisionPct: 4,
    enganchePctRequerido: null,
    pagos: [
      { id: "40-enganche", porcentajePago: 40, trigger: "enganche_expediente", requisitos: "Enganche cubierto y expediente completo. El 60% restante a escrituración." },
      { id: "60-escritura", porcentajePago: 60, trigger: "escrituracion", requisitos: "Pago del 60% restante a escrituración." },
    ],
  },
  {
    nombre: "Lago de Juriquilla",
    desarrolloIds: [],
    comisionPct: 4,
    enganchePctRequerido: null,
    pagos: [{ id: "100-enganche", porcentajePago: 100, trigger: "enganche_expediente", requisitos: "Enganche cubierto y expediente completo." }],
  },
  {
    nombre: "Manjarrés de Mexiquito",
    desarrolloIds: [],
    comisionPct: 4,
    enganchePctRequerido: null,
    pagos: [{ id: "100-enganche", porcentajePago: 100, trigger: "enganche_expediente", requisitos: "Enganche cubierto y expediente completo." }],
  },
  {
    nombre: "Misión La Gavia",
    desarrolloIds: [],
    comisionPct: 4,
    enganchePctRequerido: null,
    pagos: [
      { id: "50-enganche", porcentajePago: 50, trigger: "enganche_expediente", requisitos: "Enganche cubierto y expediente completo. El 50% restante a escrituración." },
      { id: "50-escritura", porcentajePago: 50, trigger: "escrituracion", requisitos: "Pago del 50% restante a escrituración." },
    ],
  },
  {
    nombre: "Pasaje Álamos",
    desarrolloIds: ["pasaje-alamos"],
    comisionPct: 4,
    enganchePctRequerido: null,
    pagos: [
      { id: "60-enganche", porcentajePago: 60, trigger: "enganche_expediente", requisitos: "Enganche cubierto y expediente completo. El 40% restante a escrituración." },
      { id: "40-escritura", porcentajePago: 40, trigger: "escrituracion", requisitos: "Pago del 40% restante a escrituración." },
      { id: "100-contado", porcentajePago: 100, trigger: "contado", requisitos: "Pago de contado y expediente completo." },
    ],
  },
  {
    nombre: "Simaté Parque Residencial",
    desarrolloIds: [],
    comisionPct: 4,
    enganchePctRequerido: 30,
    pagos: [{ id: "100-enganche", porcentajePago: 100, trigger: "enganche_expediente", requisitos: "Enganche cubierto (30%) y expediente completo." }],
  },
  {
    nombre: "La Vista Residencial",
    desarrolloIds: ["la-vista-residencial"],
    comisionPct: 3,
    enganchePctRequerido: null,
    pagos: [
      { id: "50-enganche", porcentajePago: 50, trigger: "enganche_expediente", requisitos: "Enganche cubierto y expediente completo. El 50% restante a escrituración." },
      { id: "50-escritura", porcentajePago: 50, trigger: "escrituracion", requisitos: "Pago del 50% restante a escrituración." },
    ],
  },
  {
    nombre: "Latitud La Victoria",
    desarrolloIds: [],
    comisionPct: 3,
    enganchePctRequerido: null,
    pagos: [
      { id: "60-enganche", porcentajePago: 60, trigger: "enganche_expediente", requisitos: "Enganche cubierto y expediente completo. El 40% restante a escrituración." },
      { id: "40-escritura", porcentajePago: 40, trigger: "escrituracion", requisitos: "Pago del 40% restante a escrituración." },
    ],
  },
  {
    nombre: "PuntOlivo",
    desarrolloIds: [],
    comisionPct: 2.5,
    enganchePctRequerido: null,
    pagos: [
      { id: "75-enganche", porcentajePago: 75, trigger: "enganche_expediente", requisitos: "Enganche cubierto y expediente completo. El 25% restante a escrituración." },
      { id: "25-escritura", porcentajePago: 25, trigger: "escrituracion", requisitos: "Pago del 25% restante a escrituración." },
    ],
  },
  {
    nombre: "Aldea Campestre",
    desarrolloIds: [],
    comisionPct: 2,
    enganchePctRequerido: 20,
    pagos: [{ id: "100-enganche", porcentajePago: 100, trigger: "enganche_expediente", requisitos: "Enganche cubierto (20%) y expediente completo." }],
  },
  {
    nombre: "Urban Valley",
    desarrolloIds: [],
    comisionPct: null,
    comisionNota: "2–4 años: 50% de 2 meses de renta. 5+ años: 50% de 3 meses de renta.",
    enganchePctRequerido: null,
    pagos: [],
  },
  {
    nombre: "Ceiba Outdoor shops",
    desarrolloIds: [],
    comisionPct: null,
    comisionNota: "2–4 años: 50% de 2 meses de renta. 5+ años: 50% de 3 meses de renta.",
    enganchePctRequerido: null,
    pagos: [],
  },
];

export const getComisionReglaByDesarrolloId = (desarrolloId: string) =>
  COMISION_REGLAS.find((regla) => regla.desarrolloIds.includes(desarrolloId));

export const isEsquemaContado = (esquemaPago?: string | null) => {
  const value = esquemaPago?.toLowerCase() ?? "";
  return value.includes("contado") || value.includes("100%") || value.includes("100 %");
};

export const pickComisionPagoRegla = (
  regla: ComisionReglaDesarrollo,
  esquemaPago?: string | null,
  trigger?: ComisionPagoTrigger,
) => {
  if (trigger) {
    return regla.pagos.find((pago) => pago.trigger === trigger) ?? null;
  }
  if (isEsquemaContado(esquemaPago)) {
    return regla.pagos.find((pago) => pago.trigger === "contado") ?? regla.pagos[0] ?? null;
  }
  return regla.pagos.find((pago) => pago.trigger === "enganche_expediente") ?? regla.pagos[0] ?? null;
};

export type ComisionElegibilidad = {
  elegible: boolean;
  razones: string[];
  regla: ComisionReglaDesarrollo | null;
  pagoRegla: ComisionPagoRegla | null;
  comisionTotal: number | null;
  montoSolicitud: number | null;
};

export const evaluarElegibilidadComision = (input: {
  desarrolloId: string;
  precioVenta: number | null;
  esquemaPago?: string | null;
  engancheCubierto: boolean;
  formalizacionCompleta: boolean;
  escriturado?: boolean;
  trigger?: ComisionPagoTrigger;
}): ComisionElegibilidad => {
  const regla = getComisionReglaByDesarrolloId(input.desarrolloId);
  const razones: string[] = [];
  const trigger = input.trigger ?? (isEsquemaContado(input.esquemaPago) ? "contado" : "enganche_expediente");

  if (!regla) {
    return {
      elegible: false,
      razones: ["Sin reglas de comisión configuradas para este desarrollo en GABI."],
      regla: null,
      pagoRegla: null,
      comisionTotal: null,
      montoSolicitud: null,
    };
  }

  if (!input.formalizacionCompleta) {
    razones.push("Expediente de formalización incompleto (contrato y documentos firmados en plataforma).");
  }

  if (trigger === "escrituracion") {
    if (!input.escriturado) {
      razones.push("La unidad debe estar marcada como escriturada para este tramo.");
    }
  } else if (trigger === "contado") {
    if (!isEsquemaContado(input.esquemaPago)) {
      razones.push("El tramo de contado aplica solo a ventas de contado.");
    }
  } else if (!input.engancheCubierto) {
    razones.push("Enganche no marcado como cubierto.");
  }

  const pagoRegla = pickComisionPagoRegla(regla, input.esquemaPago, trigger);
  if (!pagoRegla) {
    razones.push("No hay regla de pago aplicable (consultar Anexos o administración).");
  }

  if (regla.comisionPct == null) {
    razones.push(`Comisión especial: ${regla.comisionNota ?? "ver Anexos"}.`);
  }

  const precio = input.precioVenta ?? 0;
  const comisionTotal =
    regla.comisionPct != null && precio > 0 ? (precio * regla.comisionPct) / 100 : null;
  const montoSolicitud =
    comisionTotal != null && pagoRegla
      ? (comisionTotal * pagoRegla.porcentajePago) / 100
      : null;

  const elegible =
    razones.length === 0 &&
    input.formalizacionCompleta &&
    pagoRegla != null &&
    (montoSolicitud ?? 0) > 0 &&
    (trigger !== "escrituracion" || Boolean(input.escriturado)) &&
    (trigger !== "contado" || isEsquemaContado(input.esquemaPago)) &&
    (trigger === "escrituracion" || trigger === "contado" || input.engancheCubierto);

  return { elegible, razones, regla, pagoRegla, comisionTotal, montoSolicitud };
};
