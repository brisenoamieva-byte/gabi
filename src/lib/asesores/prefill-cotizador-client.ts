export const RECORRIDO_SNAPSHOT_KEY = "gabi_recorrido_actual";
export const COTIZADOR_PROSPECTO_KEY = "gabi_cotizador_prospecto_id";

type ProspectoCotizadorPrefill = {
  id: string;
  nombre: string;
  email?: string | null;
  telefono?: string | null;
  medio_contacto?: string | null;
};

export const prefillCotizadorFromProspecto = (prospecto: ProspectoCotizadorPrefill) => {
  try {
    const raw = localStorage.getItem(RECORRIDO_SNAPSHOT_KEY);
    const recorrido = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};

    localStorage.setItem(
      RECORRIDO_SNAPSHOT_KEY,
      JSON.stringify({
        ...recorrido,
        cliente: {
          nombre: prospecto.nombre,
          email: prospecto.email ?? "",
          telefono: prospecto.telefono ?? "",
          medioContacto: prospecto.medio_contacto ?? "",
        },
      }),
    );
    localStorage.setItem(COTIZADOR_PROSPECTO_KEY, prospecto.id);
  } catch {
    // Ignorar errores de almacenamiento local.
  }
};

export const readCotizadorProspectoId = (): string | null => {
  try {
    return localStorage.getItem(COTIZADOR_PROSPECTO_KEY);
  } catch {
    return null;
  }
};

export const clearCotizadorProspectoId = () => {
  try {
    localStorage.removeItem(COTIZADOR_PROSPECTO_KEY);
  } catch {
    // Ignorar.
  }
};
