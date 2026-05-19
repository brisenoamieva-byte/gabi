import { createBrowserClient } from "@supabase/ssr";
import { supabasePublicConfig } from "@/lib/supabase/config";

export const createSupabaseBrowserClient = () => {
  const { url, anonKey } = supabasePublicConfig();
  return createBrowserClient(url, anonKey);
};
