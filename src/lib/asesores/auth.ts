import { verifyPin } from "@/lib/asesores/pin-server";
import {
  asesorSessionLookupIds,
  findSeedAsesor,
  mergeAsesorDesarrollosWithSeed,
} from "@/lib/asesores/seed-match";
import type { AsesorSession } from "@/lib/asesores/types";
import { asesores as fallbackAsesores } from "@/lib/data";
import {
  getInvesttiSimuladorDemoSession,
  getInvesttiSimuladorDesarrolloIds,
  INVESTTI_SIMULADOR_DEMO_ASESOR_ID,
  matchesInvesttiSimuladorPin,
} from "@/lib/portal/investti-simulador";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

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
  desarrollosIds: mergeAsesorDesarrollosWithSeed(row.id, row.desarrollos_ids ?? [], row.email),
});

export const authenticateInvesttiSimuladorByPin = async (
  pin: string,
): Promise<{ asesor: AsesorSession; source: "investti-demo" | "supabase" | "fallback" } | null> => {
  if (matchesInvesttiSimuladorPin(pin)) {
    return {
      asesor: getInvesttiSimuladorDemoSession(),
      source: "investti-demo",
    };
  }

  const investtiIds = getInvesttiSimuladorDesarrolloIds();
  const result = await authenticateAsesorByPin(pin, { desarrolloIds: investtiIds });
  if (!result) {
    return null;
  }

  return {
    asesor: {
      ...result.asesor,
      desarrollosIds: result.asesor.desarrollosIds.filter((id) => investtiIds.includes(id)),
    },
    source: result.source,
  };
};

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

  if (process.env.NODE_ENV === "production") {
    return null;
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

export const getAsesorSessionById = async (id: string): Promise<AsesorSession | null> => {
  if (id === INVESTTI_SIMULADOR_DEMO_ASESOR_ID) {
    return getInvesttiSimuladorDemoSession();
  }

  const supabase = createSupabaseServiceClient();

  if (supabase) {
    for (const lookupId of asesorSessionLookupIds(id)) {
      const { data, error } = await supabase
        .from("asesores")
        .select("id, nombre, email, rol, activo, desarrollos_ids")
        .eq("id", lookupId)
        .eq("activo", true)
        .maybeSingle();

      if (!error && data) {
        const session = toSession(data as AsesorAuthRow);
        const seedAsesor = findSeedAsesor(session.id, session.email);
        if (seedAsesor) {
          session.desarrollosIds = Array.from(
            new Set([...session.desarrollosIds, ...seedAsesor.desarrollosIds]),
          );
        }
        return session;
      }
    }
  }

  if (process.env.NODE_ENV === "production") {
    return null;
  }

  const fallback = fallbackAsesores.find((item) => item.id === id && item.activo);
  if (!fallback) {
    return null;
  }

  return {
    id: fallback.id,
    nombre: fallback.nombre,
    email: fallback.email,
    rol: fallback.rol,
    desarrollosIds: fallback.desarrollosIds,
  };
};
