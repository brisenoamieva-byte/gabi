"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Shield } from "lucide-react";
import { GabiLogo } from "@/components/brand/GabiLogo";
import { writeStoredAsesorSession } from "@/lib/asesores/session-client";
import { GABI_OPERADOR } from "@/lib/gabi/ecosystem";
import type { AsesorSession } from "@/lib/asesores/types";

import { GABI_PORTAL_KEY, GABI_DESARROLLO_KEY } from "@/lib/session/keys";

export function OperadorLoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState<string>(GABI_OPERADOR.email);
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/gabi/operator/auth", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: codigo }),
      });
      const data = (await response.json()) as { asesor?: AsesorSession; error?: string };

      if (!response.ok || !data.asesor) {
        setError(data.error ?? "No se pudo validar el acceso.");
        return;
      }

      localStorage.removeItem(GABI_DESARROLLO_KEY);
      localStorage.removeItem(GABI_PORTAL_KEY);
      writeStoredAsesorSession(data.asesor);
      const next = searchParams.get("next");
      const safeNext =
        next?.startsWith("/") && !next.startsWith("//") ? next : "/gabi";
      window.location.assign(safeNext);
    } catch {
      setError("No se pudo validar el acceso. Revisa tu conexión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-dvh flex-col gabi-surface text-gabi-navy">
      <header className="flex shrink-0 items-center justify-between px-5 py-4 md:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#13315C]/70 transition hover:text-[#13315C]"
        >
          <ArrowLeft className="h-4 w-4" />
          gabi.mx
        </Link>
        <GabiLogo variant="header" />
      </header>

      <section className="flex flex-1 items-center justify-center px-5 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-[1.75rem] border border-[#13315C]/10 bg-white p-6 shadow-xl shadow-[#13315C]/8 md:p-8"
        >
          <div className="text-center">
            <span className="grid mx-auto h-12 w-12 place-items-center rounded-2xl bg-[#201044]/8 text-[#201044]">
              <Shield className="h-6 w-6" />
            </span>
            <h1 className="mt-4 text-2xl font-black">Centro operador gabi</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Acceso de plataforma para Ricardo Briseño: propuestas, estudios, corredor y
              administración. No es el portal de comercializadoras.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-bold">Correo operador</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                className="input-xl"
                placeholder="tu@correo.com"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-bold">Contraseña maestra</span>
              <input
                type="password"
                value={codigo}
                onChange={(event) => setCodigo(event.target.value)}
                autoComplete="current-password"
                className="input-xl"
                placeholder="••••••••"
              />
            </label>

            {error ? (
              <p className="text-center text-sm font-semibold text-[#ef4444]">{error}</p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-[#201044] py-4 text-base font-black text-white shadow-lg transition hover:bg-[#2d1a5c] active:scale-[0.98] disabled:opacity-60"
            >
              {loading ? "Validando..." : "Entrar al centro gabi"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs leading-relaxed text-slate-400">
            ¿Eres asesor de una comercializadora?{" "}
            <Link href="/portal" className="font-semibold text-[#13315C] underline">
              Entra por el portal BBR
            </Link>
          </p>
        </motion.div>
      </section>
    </main>
  );
}
