import { type NextRequest, NextResponse } from "next/server";
import {
  persistAdminAsesorLink,
  resolveCampoAsesorSessionForAdminUser,
} from "@/lib/admin/linked-asesor-session";
import type { AdminRol } from "@/lib/admin/types";
import {
  asesorSessionCookieOptions,
  signAsesorSession,
  ASESOR_SESSION_COOKIE,
} from "@/lib/asesores/session-cookie";
import { resolveComercializadoraPortalSession } from "@/lib/portal/comercializadora-portals";
import {
  applySupabaseCookies,
  createSupabaseRouteHandlerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const defaultPortalSlug = "bbr";

const normalizeAdminRol = (rol: string): AdminRol => {
  if (rol === "admin" || rol === "superadmin") {
    return "superadmin";
  }
  if (rol === "director" || rol === "gerente") {
    return "gerente";
  }
  return "operaciones";
};

const loadAdminProfileForUser = async (userId: string) => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return null;
  }

  const { data } = await supabase
    .from("admin_profiles")
    .select("email, rol, asesor_id")
    .eq("id", userId)
    .eq("activo", true)
    .maybeSingle();

  return data as { email: string; rol: string; asesor_id: string | null } | null;
};

const resolveAsesorForAdminUser = async (user: { id: string; email?: string | null }) => {
  const profile = await loadAdminProfileForUser(user.id);
  const asesor = await resolveCampoAsesorSessionForAdminUser({
    adminUserId: user.id,
    adminEmail: profile?.email ?? user.email,
    adminRol: profile ? normalizeAdminRol(profile.rol) : undefined,
    authEmail: user.email,
  });

  if (asesor && !profile?.asesor_id) {
    await persistAdminAsesorLink(user.id, asesor.id);
  }

  return asesor;
};

/** Tras login con correo, activa sesión de asesor para el CRM de campo. */
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ asesor: null, portal: null });
  }

  const { supabase, getCookieResponse } = createSupabaseRouteHandlerClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const response = NextResponse.json({ error: "No autorizado" }, { status: 401 });
    applySupabaseCookies(response, getCookieResponse());
    return response;
  }

  const asesor = await resolveAsesorForAdminUser(user);
  if (!asesor) {
    const response = NextResponse.json({ asesor: null, portal: null });
    applySupabaseCookies(response, getCookieResponse());
    return response;
  }

  const portal = resolveComercializadoraPortalSession(defaultPortalSlug);
  const response = NextResponse.json({ asesor, portal });
  applySupabaseCookies(response, getCookieResponse());
  response.cookies.set(ASESOR_SESSION_COOKIE, signAsesorSession(asesor.id), asesorSessionCookieOptions());
  return response;
}

/** Refresca sesión de asesor si ya hay login admin activo. */
export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ asesor: null, portal: null });
  }

  const { supabase, getCookieResponse } = createSupabaseRouteHandlerClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const response = NextResponse.json({ asesor: null, portal: null });
    applySupabaseCookies(response, getCookieResponse());
    return response;
  }

  const asesor = await resolveAsesorForAdminUser(user);
  if (!asesor) {
    const response = NextResponse.json({ asesor: null, portal: null });
    applySupabaseCookies(response, getCookieResponse());
    return response;
  }

  const portal = resolveComercializadoraPortalSession(defaultPortalSlug);
  const response = NextResponse.json({ asesor, portal });
  applySupabaseCookies(response, getCookieResponse());
  return response;
}
