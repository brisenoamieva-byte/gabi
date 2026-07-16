import { type NextRequest, NextResponse } from "next/server";
import {
  persistAdminAsesorLink,
  resolveCampoAsesorSessionForAdminUser,
  resolveCampoAsesorSessionForMasterOperator,
} from "@/lib/admin/linked-asesor-session";
import type { AdminRol } from "@/lib/admin/types";
import type { AsesorSession } from "@/lib/asesores/types";
import {
  asesorSessionCookieOptions,
  signAsesorSession,
  ASESOR_SESSION_COOKIE,
} from "@/lib/asesores/session-cookie";
import { getMasterSessionEmail } from "@/lib/gabi/master-session";
import { isGabiOperator } from "@/lib/gabi/operator";
import { resolveComercializadoraPortalSession } from "@/lib/portal/comercializadora-portals";
import {
  applySupabaseCookies,
  createSupabaseRouteHandlerClient,
} from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
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
    .select("email, rol, asesor_id, desarrollos_ids")
    .eq("id", userId)
    .eq("activo", true)
    .maybeSingle();

  return data as {
    email: string;
    rol: string;
    asesor_id: string | null;
    desarrollos_ids: string[] | null;
  } | null;
};

const resolveAsesorForAdminUser = async (user: { id: string; email?: string | null }) => {
  const profile = await loadAdminProfileForUser(user.id);
  const adminRol = profile ? normalizeAdminRol(profile.rol) : undefined;

  const asesor = await resolveCampoAsesorSessionForAdminUser({
    adminUserId: user.id,
    adminEmail: profile?.email ?? user.email,
    adminRol,
    adminDesarrollosIds: profile?.desarrollos_ids ?? [],
    authEmail: user.email,
  });

  if (asesor && !profile?.asesor_id) {
    await persistAdminAsesorLink(user.id, asesor.id);
  }

  return asesor;
};

const resolveAsesorForMasterOperator = async (): Promise<AsesorSession | null> => {
  const masterEmail = await getMasterSessionEmail();
  if (!masterEmail || !isGabiOperator({ email: masterEmail })) {
    return null;
  }

  return resolveCampoAsesorSessionForMasterOperator(masterEmail);
};

const buildSyncAsesorResponse = (
  asesor: AsesorSession | null,
  options?: {
    setAsesorCookie?: boolean;
    applySupabaseCookieResponse?: () => ReturnType<
      ReturnType<typeof createSupabaseRouteHandlerClient>["getCookieResponse"]
    >;
    unauthorized?: boolean;
  },
) => {
  if (options?.unauthorized) {
    const response = NextResponse.json({ error: "No autorizado" }, { status: 401 });
    if (options.applySupabaseCookieResponse) {
      applySupabaseCookies(response, options.applySupabaseCookieResponse());
    }
    return response;
  }

  if (!asesor) {
    const response = NextResponse.json({ asesor: null, portal: null });
    if (options?.applySupabaseCookieResponse) {
      applySupabaseCookies(response, options.applySupabaseCookieResponse());
    }
    return response;
  }

  const portal = resolveComercializadoraPortalSession(defaultPortalSlug);
  const response = NextResponse.json({ asesor, portal });
  if (options?.applySupabaseCookieResponse) {
    applySupabaseCookies(response, options.applySupabaseCookieResponse());
  }
  if (options?.setAsesorCookie) {
    response.cookies.set(
      ASESOR_SESSION_COOKIE,
      signAsesorSession(asesor.id),
      asesorSessionCookieOptions(),
    );
  }
  return response;
};

/** Tras login con correo, activa sesión de asesor para el CRM de campo. */
export async function POST(request: NextRequest) {
  const masterAsesor = await resolveAsesorForMasterOperator();
  if (masterAsesor) {
    return buildSyncAsesorResponse(masterAsesor, { setAsesorCookie: true });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ asesor: null, portal: null });
  }

  const { supabase, getCookieResponse } = createSupabaseRouteHandlerClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return buildSyncAsesorResponse(null, {
      unauthorized: true,
      applySupabaseCookieResponse: getCookieResponse,
    });
  }

  const asesor = await resolveAsesorForAdminUser(user);
  return buildSyncAsesorResponse(asesor, {
    setAsesorCookie: Boolean(asesor),
    applySupabaseCookieResponse: getCookieResponse,
  });
}

/** Refresca sesión de asesor si ya hay login admin activo. */
export async function GET(request: NextRequest) {
  const masterAsesor = await resolveAsesorForMasterOperator();
  if (masterAsesor) {
    return buildSyncAsesorResponse(masterAsesor);
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ asesor: null, portal: null });
  }

  const { supabase, getCookieResponse } = createSupabaseRouteHandlerClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return buildSyncAsesorResponse(null, {
      applySupabaseCookieResponse: getCookieResponse,
    });
  }

  const asesor = await resolveAsesorForAdminUser(user);
  return buildSyncAsesorResponse(asesor, {
    applySupabaseCookieResponse: getCookieResponse,
  });
}
