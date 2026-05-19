import { verifyPin } from "@/lib/asesores/pin-server";
import type { AsesorSession } from "@/lib/asesores/types";
import { asesores as fallbackAsesores } from "@/lib/data";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

type AsesorAuthRow = {
  id: string;
  nombre: string;
  email: string;
  pin_hash: string;
  rol: AsesorSession["rol"];
  activo: boolean;
  desarrollos_ids: string[];
};

const toSession = (row: Omit<AsesorAuthRow, "pin_hash" | "activo">): AsesorSession => ({
  id: row.id,
  nombre: row.nombre,
  email: row.email,
  rol: row.rol,
  desarrollosIds: row.desarrollos_ids ?? [],
});

export const authenticateAsesorByPin = async (
  pin: string,
  options?: { desarrolloIds?: string[] },
): Promise<{ asesor: AsesorSession; source: "supabase" | "fallback" } | null> => {
  const supabase = createSupabaseServiceClient();

  if (supabase) {
    let query = supabase
      .from("asesores")
      .select("id, nombre, email, pin_hash, rol, activo, desarrollos_ids")
      .eq("activo", true);

    if (options?.desarrolloIds?.length) {
      query = query.overlaps("desarrollos_ids", options.desarrolloIds);
    }

    const { data, error } = await query;
    if (!error && data?.length) {
      for (const row of data as AsesorAuthRow[]) {
        if (verifyPin(pin, row.pin_hash)) {
          return {
            asesor: toSession(row),
            source: "supabase",
          };
        }
      }
    }
  }

  const fallback = fallbackAsesores.find((item) => {
    if (!item.activo || item.pin !== pin) {
      return false;
    }

    if (!options?.desarrolloIds?.length) {
      return true;
    }

    return item.desarrollosIds.some((id) => options.desarrolloIds!.includes(id));
  });

  if (!fallback) {
    return null;
  }

  return {
    asesor: {
      id: fallback.id,
      nombre: fallback.nombre,
      email: fallback.email,
      rol: fallback.rol,
      desarrollosIds: fallback.desarrollosIds,
    },
    source: "fallback",
  };
};
