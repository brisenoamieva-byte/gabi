"use client";

import { FormEvent, useEffect, useState } from "react";
import { LockKeyhole } from "lucide-react";
import Link from "next/link";
import { GabiLogo } from "@/components/brand/GabiLogo";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  syncAsesorFromAdminAuth,
  writeStoredAsesorSession,
} from "@/lib/asesores/session-client";
import { isGabiOperator } from "@/lib/gabi/operator";

type AdminLoginFormProps = {
  variant?: "admin" | "unified";
};

export function AdminLoginForm({ variant = "admin" }: AdminLoginFormProps) {
  const searchParams = useSearchParams();
  const unified = variant === "unified";
  const emailParam = searchParams.get("email")?.trim().toLowerCase() ?? "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const configured = isSupabaseConfigured();
  const resetOk = searchParams.get("reset") === "ok";
  const otpExpired = searchParams.get("error") === "otp_expired";
  const nextPath = searchParams.get("next");
  const defaultNext = unified ? "/inicio" : "/admin/documentos";
  const safeNext =
    nextPath?.startsWith("/") && !nextPath.startsWith("//") ? nextPath : defaultNext;
  const [isProductionHost, setIsProductionHost] = useState(false);

  useEffect(() => {
    setIsProductionHost(
      window.location.hostname !== "localhost" &&
        !window.location.hostname.startsWith("127."),
    );
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [emailParam]);

  const resolvePostLoginPath = async (): Promise<string> => {
    if (nextPath?.startsWith("/") && !nextPath.startsWith("//")) {
      await syncAsesorFromAdminAuth({ allowAfterLogout: true });
      return nextPath;
    }

    const synced = await syncAsesorFromAdminAuth({ allowAfterLogout: true });
    if (synced) {
      return unified ? "/inicio" : safeNext;
    }

    try {
      const meResponse = await fetch("/api/admin/me", { credentials: "same-origin" });
      const meData = (await meResponse.json()) as { authenticated?: boolean };
      if (meData.authenticated) {
        return "/admin/documentos";
      }
    } catch {
      // Sin perfil admin vinculado al correo.
    }

    return safeNext;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isGabiOperator({ email })) {
        const response = await fetch("/api/gabi/master/login", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = (await response.json()) as { asesor?: unknown; error?: string };

        if (response.ok && data.asesor) {
          writeStoredAsesorSession(data.asesor as Parameters<typeof writeStoredAsesorSession>[0]);
          window.location.assign(safeNext);
          return;
        }

        setError(data.error ?? "Correo o contraseña incorrectos.");
        return;
      }

      if (!configured) {
        setError("Este correo no tiene acceso configurado.");
        return;
      }

      const supabase = createSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(
          process.env.NODE_ENV === "development"
            ? authError.message
            : "Correo o contraseña incorrectos.",
        );
        return;
      }

      await supabase.auth.getSession();
      const destination = await resolvePostLoginPath();

      if (unified && destination === safeNext && destination === "/inicio") {
        const meResponse = await fetch("/api/admin/me", { credentials: "same-origin" });
        const meData = (await meResponse.json()) as { authenticated?: boolean };
        if (meData.authenticated) {
          window.location.assign("/admin/documentos");
          return;
        }
        setError("Tu correo no tiene asesor ni perfil admin vinculado.");
        return;
      }

      window.location.assign(destination);
    } catch {
      setError("No se pudo iniciar sesión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-[1.75rem] border border-gabi-forest/10 bg-white p-8 shadow-xl shadow-gabi-forest/5">
      <div className="mb-8 text-center">
        <GabiLogo variant="hero" className="mx-auto" />
        <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.22em] text-gabi-sand">
          {unified ? "Acceso comercial" : "Backoffice comercial"}
        </p>
        <h1 className="mt-2 text-2xl font-black text-gabi-forest">
          {unified ? "Entrar a gabi" : "Admin gabi"}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {unified
            ? "Un correo y contraseña para admin y CRM. Tus desarrollos y permisos se aplican solos."
            : "Gestión de documentos, inventario, estudios y usuarios."}
        </p>
      </div>

      {resetOk ? (
        <p className="mb-4 rounded-xl bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">
          Contraseña actualizada. Ya puedes iniciar sesión.
        </p>
      ) : null}
      {otpExpired ? (
        <p className="mb-4 rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
          El enlace expiró o ya se usó. Pide reenvío desde Admin → Equipo → «Acceso admin · correo».
        </p>
      ) : null}

      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="space-y-4"
        autoComplete="off"
      >
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Email
          </span>
          <input
            type="email"
            name="gabi-admin-email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
            className="input-cotizador"
            placeholder="tu@correo.com"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Contraseña
          </span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoComplete="current-password"
            className="input-cotizador"
          />
        </label>
        {error ? (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">
            {error}
          </p>
        ) : null}
        {isProductionHost && isGabiOperator({ email }) ? (
          <p className="text-xs leading-relaxed text-slate-400">
            Como operador gabi usa la misma contraseña que en <code>/operador</code>.
          </p>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gabi-forest text-sm font-bold text-white disabled:opacity-60"
        >
          <LockKeyhole className="h-4 w-4" />
          {loading ? "Entrando..." : unified ? "Entrar" : "Entrar al panel"}
        </button>
      </form>

      {unified ? (
        <p className="mt-5 text-center text-xs leading-relaxed text-slate-400">
          Asesor en showroom con tablet compartida:{" "}
          <Link href="/portal/bbr" className="font-semibold text-gabi-forest underline">
            entrar con PIN
          </Link>
        </p>
      ) : null}

      <p className="mt-6 text-center text-sm text-slate-500">
        <Link href="/" className="font-semibold text-gabi-forest hover:underline">
          Volver al inicio
        </Link>
      </p>
    </div>
  );
}
