import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { GABI_MASTER_COOKIE } from "@/lib/gabi/master-session-constants";
import { verifyMasterSessionValueEdge } from "@/lib/gabi/master-session-edge";
import { isGabiOperator } from "@/lib/gabi/operator";
import {
  isOperatorIntelRoute,
  operatorLoginRedirectUrl,
} from "@/lib/gabi/operator-routes";
import {
  absoluteDmbUrl,
  absoluteGabiUrl,
  isDmbHostname,
  isLocalDevHost,
} from "@/lib/dmb/host";
import {
  DMB_BRAND_COOKIE,
  isDmbContentRoute,
  isGabiOnlyRoute,
} from "@/lib/dmb/routes";

const isDevPwaAsset = (pathname: string) =>
  pathname === "/sw.js" ||
  pathname.startsWith("/workbox-") ||
  pathname.startsWith("/fallback-");

async function hasMasterAdminAccess(request: NextRequest): Promise<boolean> {
  const email = await verifyMasterSessionValueEdge(request.cookies.get(GABI_MASTER_COOKIE)?.value);
  return Boolean(email && isGabiOperator({ email }));
}

function withBrandHeader(response: NextResponse, brand: "dmb" | "gabi"): NextResponse {
  response.headers.set("x-gabi-brand", brand);
  return response;
}

function setBrandCookie(response: NextResponse, brand: "dmb" | "gabi"): void {
  response.cookies.set(DMB_BRAND_COOKIE, brand, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
  });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") ?? "";
  const isDmbHost = isDmbHostname(host);
  const isLocal = isLocalDevHost(host);
  const search = request.nextUrl.search;

  if (process.env.NODE_ENV === "development" && isDevPwaAsset(pathname)) {
    return new NextResponse(null, { status: 404 });
  }

  // dmb.mx → landing pública (brochure)
  if (isDmbHost && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/dmb/landing";
    const response = NextResponse.rewrite(url);
    setBrandCookie(response, "dmb");
    return withBrandHeader(response, "dmb");
  }

  // gabi.mx → contenido consultoría vive en dmb.mx (prod)
  if (!isDmbHost && !isLocal && isDmbContentRoute(pathname) && !pathname.startsWith("/dmb")) {
    return NextResponse.redirect(absoluteDmbUrl(`${pathname}${search}`));
  }

  // dmb.mx → operación comercial solo en gabi.mx
  if (isDmbHost && isGabiOnlyRoute(pathname)) {
    return NextResponse.redirect(absoluteGabiUrl(`${pathname}${search}`));
  }

  const brand: "dmb" | "gabi" =
    isDmbHost ||
    pathname.startsWith("/dmb") ||
    request.cookies.get(DMB_BRAND_COOKIE)?.value === "dmb"
      ? "dmb"
      : "gabi";

  if (isOperatorIntelRoute(pathname) && !(await hasMasterAdminAccess(request))) {
    return NextResponse.redirect(
      operatorLoginRedirectUrl(request.url, pathname, search),
    );
  }

  if (!pathname.startsWith("/admin")) {
    const response = NextResponse.next({
      request: { headers: request.headers },
    });
    if (pathname.startsWith("/dmb")) {
      setBrandCookie(response, "dmb");
    }
    return withBrandHeader(response, brand);
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const masterAdmin = await hasMasterAdminAccess(request);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    if (!masterAdmin && !pathname.startsWith("/admin/login")) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    return withBrandHeader(response, brand);
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request: { headers: request.headers } });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicAdmin =
    pathname === "/admin/login" || pathname === "/admin/reset-password";

  if (!isPublicAdmin && !user && !masterAdmin) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  if (pathname === "/admin/login" && (user || masterAdmin)) {
    const dest = isDmbHost ? "/admin/dmb" : "/admin/documentos";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  return withBrandHeader(response, brand);
}

export const config = {
  matcher: [
    "/",
    "/admin/:path*",
    "/dmb",
    "/dmb/:path*",
    "/gabi",
    "/gabi/:path*",
    "/propuestas",
    "/propuestas/:path*",
    "/estudios",
    "/estudios/:path*",
    "/corredor",
    "/corredor/:path*",
    "/recorrido",
    "/recorrido/:path*",
    "/cotizador",
    "/cotizador/:path*",
    "/mis-leads",
    "/mis-leads/:path*",
    "/dashboard",
    "/dashboard/:path*",
    "/disponibilidad",
    "/investti",
    "/investti/:path*",
    "/operador",
    "/sw.js",
    "/workbox-:path*",
    "/fallback-:path*",
  ],
};
