import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabasePublicConfig } from "@/lib/supabase/config";

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

export const createSupabaseServiceClient = () => {
  const { url } = supabasePublicConfig();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!url || !serviceKey) {
    return null;
  }

  return createServerClient(url, serviceKey, {
    cookies: {
      getAll: () => [],
      setAll: () => undefined,
    },
  });
};
