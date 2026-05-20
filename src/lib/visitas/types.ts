export type VisitaTipo = "lead_registrado" | "recorrido_completado";

export type VisitaRecord = {
  id: string;
  tipo: VisitaTipo;
  desarrolloId: string;
  asesorId: string;
  asesorNombre: string | null;
  clienteNombre: string | null;
  clienteEmail: string | null;
  clienteTelefono: string | null;
  medioContacto: string | null;
  clusterId: string | null;
  clusterNombre: string | null;
  prototipoId: string | null;
  prototipoNombre: string | null;
  precioFinal: number | null;
  etapaAlcanzada: number | null;
  crmStatus: string | null;
  crmId: string | null;
  occurredAt: string;
};

export type VisitaInput = {
  tipo: VisitaTipo;
  desarrolloId: string;
  asesorId: string;
  asesorNombre?: string;
  clienteNombre?: string;
  clienteEmail?: string;
  clienteTelefono?: string;
  medioContacto?: string;
  clusterId?: string;
  clusterNombre?: string;
  prototipoId?: string;
  prototipoNombre?: string;
  precioFinal?: number;
  etapaAlcanzada?: number;
  crmStatus?: string;
  crmId?: string;
  payload?: Record<string, unknown>;
};

export type VisitasResumen = {
  leads: number;
  recorridosCompletados: number;
  total: number;
  crmSincronizados: number;
  porAsesor: Array<{ asesorId: string; asesorNombre: string; count: number }>;
  recientes: VisitaRecord[];
};
