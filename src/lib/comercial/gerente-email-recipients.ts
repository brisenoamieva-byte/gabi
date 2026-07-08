import { isLeadershipAsesorRol, normalizeAsesorRol } from "@/lib/asesores/types";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

/** Correos de gerencia para un desarrollo (admin_profiles + asesores liderazgo). */
export async function getGerenteEmailsForDesarrollo(desarrolloId: string): Promise<string[]> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return [];
  }

  const emails = new Set<string>();

  const { data: admins } = await supabase
    .from("admin_profiles")
    .select("email, rol, desarrollos_ids, activo")
    .eq("activo", true);

  for (const row of admins ?? []) {
    const rol = row.rol as string;
    const desarrollos = (row.desarrollos_ids as string[] | null) ?? [];
    const email = (row.email as string | null)?.trim().toLowerCase();
    if (!email) {
      continue;
    }

    if (rol === "superadmin" || rol === "admin" || rol === "gerente" || rol === "director") {
      if (rol === "superadmin" || rol === "admin" || desarrollos.includes(desarrolloId)) {
        emails.add(email);
      }
    }
  }

  const { data: asesores } = await supabase
    .from("asesores")
    .select("email, rol, desarrollos_ids, activo")
    .eq("activo", true);

  for (const row of asesores ?? []) {
    const rol = normalizeAsesorRol(row.rol as string);
    if (!isLeadershipAsesorRol(rol)) {
      continue;
    }

    const desarrollos = (row.desarrollos_ids as string[] | null) ?? [];
    if (!desarrollos.includes(desarrolloId)) {
      continue;
    }

    const email = (row.email as string | null)?.trim().toLowerCase();
    if (email) {
      emails.add(email);
    }
  }

  return Array.from(emails);
}
