import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isGabiOperator } from "@/lib/gabi/operator";

const GABI_MASTER_COOKIE = "gabi_master_session";

const isDevPwaAsset = (pathname: string) =>
  pathname === "/sw.js" ||
  pathname.startsWith("/workbox-") ||
  pathname.startsWith("/fallback-");

function peekMasterSessionEmail(value: string | undefined): string | null {
  if (!value) return null;

  const parts = value.split(".");
  if (parts.length !== 3) return null;

  const [email, expStr] = parts;
  const exp = Number(expStr);
  if (!email || !Number.isFinite(exp) || Date.now() > exp) return null;

  return email;
}

function hasMasterAdminAccess(request: NextRequest): boolean {
  const email = peekMasterSessionEmail(request.cookies.get(GABI_MASTER_COOKIE)?.value);
  return Boolean(email && isGabiOperator({ email }));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // En desarrollo, bloquear SW de builds previos (evita 404 en CSS/JS).
  if (process.env.NODE_ENV === "development" && isDevPwaAsset(pathname)) {
    return new NextResponse(null, { status: 404 });
  }

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const masterAdmin = hasMasterAdminAccess(request);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    if (!masterAdmin && !pathname.startsWith("/admin/login")) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    return response;
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
    return NextResponse.redirect(new URL("/admin/documentos", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/sw.js", "/workbox-:path*", "/fallback-:path*"],
};
