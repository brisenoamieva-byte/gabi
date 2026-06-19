import type { AdminRol } from "@/lib/admin/types";

export type EquipoTab = "comercial" | "admin";

export type AdminLinkByAsesor = Record<
  string,
  { activo: boolean; rol: AdminRol; email: string }
>;
