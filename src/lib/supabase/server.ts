import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { supabasePublicConfig } from "@/lib/supabase/config";

/** Propaga cookies de sesión Supabase refrescadas en Route Handlers. */
export const applySupabaseCookies = (target: NextResponse, source: NextResponse) => {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie.name, cookie.value);
  });
};

export const createSupabaseRouteHandlerClient = (request: NextRequest) => {
  const { url, anonKey } = supabasePublicConfig();
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  return { supabase, getCookieResponse: () => supabaseResponse };
};

export const createSupabaseServerClient = () => {
  const cookieStore = cookies();
  const { url, anonKey } = supabasePublicConfig();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Component — cookies read-only
        }
      },
    },
  });
};
