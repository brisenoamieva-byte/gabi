import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const isDevPwaAsset = (pathname: string) =>
  pathname === "/sw.js" ||
  pathname.startsWith("/workbox-") ||
  pathname.startsWith("/fallback-");

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

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    if (!pathname.startsWith("/admin/login")) {
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

  if (!isPublicAdmin && !user) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  if (pathname === "/admin/login" && user) {
    return NextResponse.redirect(new URL("/admin/documentos", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/sw.js", "/workbox-:path*", "/fallback-:path*"],
};
