export type CapturaLogStatus =
  | "created"
  | "updated"
  | "duplicate"
  | "ignored"
  | "rejected"
  | "error";

export type CapturaLogRow = {
  id: string;
  fuente: string;
  status: CapturaLogStatus;
  desarrolloId: string;
  campanaId: string | null;
  campanaNombre: string | null;
  prospectoId: string | null;
  parseurDocumentId: string | null;
  contactoHint: string | null;
  errorMessage: string | null;
  createdAt: string;
};

export const capturaLogStatusLabel: Record<CapturaLogStatus, string> = {
  created: "Creado",
  updated: "Actualizado",
  duplicate: "Duplicado",
  ignored: "Ignorado",
  rejected: "Rechazado",
  error: "Error",
};

export const capturaLogStatusColor: Record<CapturaLogStatus, string> = {
  created: "bg-emerald-100 text-emerald-800",
  updated: "bg-sky-100 text-sky-800",
  duplicate: "bg-amber-100 text-amber-900",
  ignored: "bg-slate-100 text-slate-600",
  rejected: "bg-orange-100 text-orange-900",
  error: "bg-red-100 text-red-800",
};
