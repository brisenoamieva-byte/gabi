import { type NextRequest, NextResponse } from "next/server";
import { getLinkedAsesorSessionForAdminUser } from "@/lib/admin/linked-asesor-session";
import {
  asesorSessionCookieOptions,
  signAsesorSession,
  ASESOR_SESSION_COOKIE,
} from "@/lib/asesores/session-cookie";
import { resolveComercializadoraPortalSession } from "@/lib/portal/comercializadora-portals";
import {
  applySupabaseCookies,
  createSupabaseRouteHandlerClient,
} from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const defaultPortalSlug = "bbr";

/** Tras login con correo, vincula sesión de asesor (CRM de campo) si el perfil admin tiene asesor_id. */
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

  const asesor = await getLinkedAsesorSessionForAdminUser(user.id);
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

  const asesor = await getLinkedAsesorSessionForAdminUser(user.id);
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
