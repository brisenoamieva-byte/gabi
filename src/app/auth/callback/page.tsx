"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAdminPasswordSetupFlow } from "@/lib/admin/admin-auth-callback";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Validando enlace…");

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const redirectToPasswordSetup = () => {
      router.replace("/admin/reset-password");
    };

    const redirectToLoginWithError = (email?: string | null) => {
      const params = new URLSearchParams({ error: "otp_expired" });
      if (email) {
        params.set("email", email);
      }
      router.replace(`/admin/login?${params.toString()}`);
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        redirectToPasswordSetup();
      }
    });

    const handleCallback = async () => {
      const search = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));

      const flow = search.get("flow");
      const linkType = hash.get("type") ?? search.get("type");
      const wantsPasswordSetup = isAdminPasswordSetupFlow({ flow, type: linkType });

      const authError = hash.get("error") ?? search.get("error");
      if (authError) {
        setMessage("El enlace expiró o ya fue usado. Te llevamos al login para pedir uno nuevo.");
        window.setTimeout(() => {
          redirectToLoginWithError(search.get("email"));
        }, 2200);
        return;
      }

      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          redirectToLoginWithError();
          return;
        }

        if (wantsPasswordSetup) {
          redirectToPasswordSetup();
          return;
        }

        router.replace(search.get("next") ?? "/admin/documentos");
        return;
      }

      const code = search.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setMessage("No se pudo validar el enlace. Pide reenvío desde Admin → Equipo.");
          window.setTimeout(() => {
            redirectToLoginWithError();
          }, 2200);
          return;
        }

        if (wantsPasswordSetup) {
          redirectToPasswordSetup();
          return;
        }

        router.replace(search.get("next") ?? "/admin/documentos");
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session && wantsPasswordSetup) {
        redirectToPasswordSetup();
        return;
      }

      if (session) {
        router.replace("/admin/documentos");
        return;
      }

      setMessage("No se pudo validar el enlace.");
      window.setTimeout(() => {
        redirectToLoginWithError();
      }, 2200);
    };

    void handleCallback();

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F2F0E9] px-5">
      <p className="max-w-md text-center text-sm font-semibold text-gabi-navy">{message}</p>
    </main>
  );
}
