export type AdminRol = "superadmin" | "gerente" | "operaciones";

export type AdminModule = "documentos" | "inventario" | "asesores" | "metricas" | "catalogo" | "usuarios" | "guion" | "sembrado" | "leads";

export type DocumentoTipo =
  | "brochure_desarrollo"
  | "brochure_cluster"
  | "disponibilidad"
  | "ficha_tecnica"
  | "otro";

export type AdminProfile = {
  id: string;
  nombre: string;
  email: string;
  rol: AdminRol;
  activo: boolean;
  desarrollosIds: string[];
};

export type DocumentoRecord = {
  id: string;
  desarrollo_id: string;
  cluster_id: string | null;
  etapa: string | null;
  prototipo_id: string | null;
  tipo: DocumentoTipo;
  nombre: string;
  nombre_archivo: string;
  storage_path: string;
  public_url: string;
  tamano_bytes: number | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
};

export const documentoTipoLabel: Record<DocumentoTipo, string> = {
  brochure_desarrollo: "Brochure comercial",
  brochure_cluster: "Brochure comercial",
  disponibilidad: "Disponibilidad",
  ficha_tecnica: "Ficha técnica",
  otro: "Otro documento",
};

export type AdminNavItem = {
  href: string;
  label: string;
  description: string;
  paso: number;
  ready: boolean;
};

export const adminNavItems: AdminNavItem[] = [
  {
    href: "/admin/documentos",
    label: "Documentos",
    description: "Brochures y PDFs comerciales",
    paso: 1,
    ready: true,
  },
  {
    href: "/admin/inventario",
    label: "Productos",
    description: "Unidades curadas para mostrar en visita",
    paso: 2,
    ready: true,
  },
  {
    href: "/admin/asesores",
    label: "Asesores",
    description: "Usuarios y accesos",
    paso: 3,
    ready: true,
  },
  {
    href: "/admin/metricas",
    label: "Métricas",
    description: "Visitas y desempeño comercial",
    paso: 4,
    ready: true,
  },
];
