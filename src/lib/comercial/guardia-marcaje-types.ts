import type { GuardiaTurno } from "@/lib/comercial/guardias";

export const GUARDIA_MARCAJE_TIPOS = ["entrada", "salida"] as const;
export type GuardiaMarcajeTipo = (typeof GUARDIA_MARCAJE_TIPOS)[number];

export type GuardiaMarcajeRecord = {
  id: string;
  asignacionId: string;
  asesorId: string;
  desarrolloId: string;
  fecha: string;
  turno: GuardiaTurno;
  tipo: GuardiaMarcajeTipo;
  registradoAt: string;
  lat: number;
  lng: number;
  accuracyMetros: number | null;
  distanciaMetros: number;
  dentroRadio: boolean;
};

export type GuardiaMarcajeResumen = {
  tipo: GuardiaMarcajeTipo;
  registradoAt: string;
  distanciaMetros: number;
  dentroRadio: boolean;
};

export const guardiaMarcajeTipoLabel: Record<GuardiaMarcajeTipo, string> = {
  entrada: "Entrada",
  salida: "Salida",
};
