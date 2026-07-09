import { NextResponse } from "next/server";
import { getLinkedAsesorSessionForAdminUser } from "@/lib/admin/linked-asesor-session";
import {
  asesorSessionCookieOptions,
  signAsesorSession,
  ASESOR_SESSION_COOKIE,
} from "@/lib/asesores/session-cookie";
import { resolveComercializadoraPortalSession } from "@/lib/portal/comercializadora-portals";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const defaultPortalSlug = "bbr";

/** Tras login con correo, vincula sesión de asesor (CRM de campo) si el perfil admin tiene asesor_id. */
export async function POST() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ asesor: null, portal: null });
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const asesor = await getLinkedAsesorSessionForAdminUser(user.id);
  if (!asesor) {
    return NextResponse.json({ asesor: null, portal: null });
  }

  const portal = resolveComercializadoraPortalSession(defaultPortalSlug);
  const response = NextResponse.json({ asesor, portal });
  response.cookies.set(ASESOR_SESSION_COOKIE, signAsesorSession(asesor.id), asesorSessionCookieOptions());
  return response;
}

/** Refresca sesión de asesor si ya hay login admin activo. */
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ asesor: null, portal: null });
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ asesor: null, portal: null });
  }

  const asesor = await getLinkedAsesorSessionForAdminUser(user.id);
  if (!asesor) {
    return NextResponse.json({ asesor: null, portal: null });
  }

  const portal = resolveComercializadoraPortalSession(defaultPortalSlug);
  return NextResponse.json({ asesor, portal });
}
