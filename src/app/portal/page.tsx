"use client";

import { FormEvent, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { comercializadores } from "@/lib/data";

const PORTAL_KEY = "gabi_portal";

export default function PortalLoginPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

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

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError("");

    const match = comercializadores.find(
      (item) =>
        item.usuario.toLowerCase() === usuario.trim().toLowerCase() &&
        item.password === password,
    );

    if (!match) {
      setError("Usuario o contraseña incorrectos.");
      return;
    }

    localStorage.removeItem("gabi_user");
    localStorage.removeItem("gabi_desarrollo");

    localStorage.setItem(
      PORTAL_KEY,
      JSON.stringify({
        id: match.id,
        nombre: match.nombre,
        slug: match.slug,
        logo: match.logo,
        portalPath: match.portalPath,
        colorPrimary: match.colorPrimary,
        colorAccent: match.colorAccent,
      }),
    );

    router.push(match.portalPath);
  };

  return (
    <main className="flex min-h-dvh flex-col bg-[#faf8f4] text-[#1a3d2e]">
      <header className="flex shrink-0 items-center justify-between px-5 py-4 md:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#1a3d2e]/70 transition hover:text-[#1a3d2e]"
        >
          <ArrowLeft className="h-4 w-4" />
          gabi.mx
        </Link>
        <Image
          src="/logos/gabi-logo.png"
          alt="gabi"
          width={1018}
          height={559}
          className="h-7 w-auto object-contain opacity-90"
        />
      </header>

      <section className="flex flex-1 items-center justify-center px-5 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-[1.75rem] border border-[#1a3d2e]/10 bg-white p-6 shadow-xl shadow-[#1a3d2e]/8 md:p-8"
        >
          <div className="text-center">
            <span className="grid mx-auto h-12 w-12 place-items-center rounded-2xl bg-[#1a3d2e]/8 text-[#1a3d2e]">
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
              className="w-full rounded-2xl bg-[#1a3d2e] py-4 text-base font-black text-white shadow-lg transition hover:bg-[#245a42] active:scale-[0.98]"
            >
              Entrar al portal
            </button>
          </form>
        </motion.div>
      </section>
    </main>
  );
}
