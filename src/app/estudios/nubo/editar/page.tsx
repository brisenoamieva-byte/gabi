"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, LogIn } from "lucide-react";
import { NuboEstudioAdminPanel } from "@/components/admin/NuboEstudioAdminPanel";
import { GabiSistemaMark } from "@/components/brand/GabiLogo";
import { OPERATOR_LOGIN_PATH } from "@/lib/gabi/operator";

const EDITOR_PATH = "/estudios/nubo/editar";

export default function EstudioNuboEditarPage() {
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch("/api/admin/me", { credentials: "same-origin" });
        const data = (await res.json()) as { authenticated?: boolean; rol?: string };
        if (!cancelled && res.ok && data.authenticated && data.rol === "superadmin") {
          setAuthReady(true);
          return;
        }
      } catch {
        /* handled below */
      }

      if (!cancelled) {
        setAuthError(
          "Tu sesión de editor no está activa. Vuelve a entrar con tu correo y contraseña maestra.",
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (authError) {
    const operadorHref = `${OPERATOR_LOGIN_PATH}?next=${encodeURIComponent(EDITOR_PATH)}`;
    const adminHref = `/admin/login?next=${encodeURIComponent(EDITOR_PATH)}`;

    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#F8FAFC] px-4 text-[#201044]">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm leading-relaxed text-slate-600">{authError}</p>
          <div className="mt-6 flex flex-col gap-3">
            <Link
              href={operadorHref}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#201044] px-4 text-sm font-bold text-white"
            >
              <LogIn className="h-4 w-4" />
              Entrar en /operador
            </Link>
            <Link
              href={adminHref}
              className="text-sm font-semibold text-slate-500 underline-offset-2 hover:text-[#201044] hover:underline"
            >
              O usar Admin gabi
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!authReady) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#F8FAFC] text-[#201044]">
        <Loader2 className="h-4 w-4 animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-[#F8FAFC]">
      <div className="gabi-no-print border-b border-black/8 bg-white px-4 py-2 md:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 text-[12px]">
            <Link
              href="/estudios/nubo"
              className="font-medium text-slate-500 hover:text-[#201044] hover:underline"
            >
              ← Estudio NUBO
            </Link>
            <Link
              href="/admin/estudios-nubo"
              className="font-medium text-slate-500 hover:text-[#201044] hover:underline"
            >
              Admin
            </Link>
          </div>
          <GabiSistemaMark size="sm" align="end" />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
        <NuboEstudioAdminPanel />
      </div>
    </main>
  );
}
