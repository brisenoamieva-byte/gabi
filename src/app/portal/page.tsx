"use client";

import { FormEvent, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { GabiLogo } from "@/components/brand/GabiLogo";
import Link from "next/link";
import { useRouter } from "next/navigation";

const PORTAL_KEY = "gabi_portal";

export default function PortalLoginPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(PORTAL_KEY);
      if (stored) {
        const portal = JSON.parse(stored) as { portalPath?: string };
        if (portal.portalPath) {
          router.replace(portal.portalPath);
        }
      }
    } catch {
      localStorage.removeItem(PORTAL_KEY);
    }
  }, [router]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/portal/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, password }),
      });

      const data = (await response.json()) as {
        portal?: {
          id: string;
          nombre: string;
          slug: string;
          logo: string;
          portalPath: string;
          colorPrimary: string;
          colorAccent: string;
        };
        error?: string;
      };

      if (!response.ok || !data.portal) {
        setError(data.error ?? "Usuario o contraseña incorrectos.");
        return;
      }

      localStorage.removeItem("gabi_user");
      localStorage.removeItem("gabi_desarrollo");
      localStorage.setItem(PORTAL_KEY, JSON.stringify(data.portal));
      router.push(data.portal.portalPath);
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
            <span className="grid mx-auto h-12 w-12 place-items-center rounded-2xl bg-[#13315C]/8 text-[#13315C]">
              <LockKeyhole className="h-6 w-6" />
            </span>
            <h1 className="mt-4 text-2xl font-black">Portal comercializadoras</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Accede al módulo de tu comercializadora. Tus asesores ingresan con
              PIN para iniciar recorridos guiados.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-bold">Usuario</span>
              <input
                type="text"
                value={usuario}
                onChange={(event) => setUsuario(event.target.value)}
                autoComplete="username"
                className="input-xl"
                placeholder="Ej. bbr"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-bold">Contraseña</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                className="input-xl"
                placeholder="••••••••"
              />
            </label>

            {error ? (
              <p className="text-center text-sm font-semibold text-[#ef4444]">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-[#13315C] py-4 text-base font-black text-white shadow-lg transition hover:bg-[#1A4478] active:scale-[0.98] disabled:opacity-60"
            >
              {loading ? "Validando..." : "Entrar al portal"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs leading-relaxed text-slate-400">
            ¿Eres el operador de gabi?{" "}
            <Link href="/operador" className="font-semibold text-[#13315C] underline">
              Centro operador
            </Link>
          </p>
        </motion.div>
      </section>
    </main>
  );
}
