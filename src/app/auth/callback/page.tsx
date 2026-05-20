"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Procesando enlace de acceso...");

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        router.replace("/admin/reset-password");
      }
    });

    const handleCallback = async () => {
      const search = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));

      if (hash.get("error") || search.get("error")) {
        setMessage("El enlace expiró o ya fue usado. Solicita uno nuevo o define la contraseña en Supabase.");
        window.setTimeout(() => {
          router.replace("/admin/login?error=otp_expired");
        }, 2500);
        return;
      }

      const code = search.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          router.replace("/admin/login?error=auth");
          return;
        }

        const next = search.get("next") ?? "/admin/documentos";
        router.replace(next);
        return;
      }

      const type = hash.get("type");
      const { data: { session } } = await supabase.auth.getSession();

      if (session && type === "recovery") {
        router.replace("/admin/reset-password");
        return;
      }

      if (session) {
        router.replace("/admin/documentos");
        return;
      }

      setMessage("No se pudo validar el enlace.");
      window.setTimeout(() => {
        router.replace("/admin/login");
      }, 2500);
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
