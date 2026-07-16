import { createServerClient } from "@supabase/ssr";
import { supabasePublicConfig } from "@/lib/supabase/config";

/** Cliente service-role (server-only). Sin next/headers — seguro para servicios usados vía import type desde el cliente. */
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
