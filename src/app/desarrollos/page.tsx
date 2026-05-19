"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, LogOut, MapPin } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { formatPrice, getDesarrollosByAsesor, type Asesor } from "@/lib/data";

type SessionUser = Pick<Asesor, "id" | "nombre" | "email" | "rol" | "desarrollosIds">;

type PortalSession = {
  nombre: string;
  logo: string;
  colorPrimary: string;
};

export default function DesarrollosPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [portal, setPortal] = useState<PortalSession | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("gabi_user");

    if (!storedUser) {
      router.replace("/portal/bbr");
      return;
    }

    try {
      setUser(JSON.parse(storedUser) as SessionUser);

      const storedPortal = localStorage.getItem("gabi_portal");
      if (storedPortal) {
        setPortal(JSON.parse(storedPortal) as PortalSession);
      }
    } catch {
      localStorage.removeItem("gabi_user");
      router.replace("/portal/bbr");
    }
  }, [router]);

  const desarrollosDisponibles = useMemo(
    () => (user ? getDesarrollosByAsesor(user.id) : []),
    [user],
  );

  const handleSelect = (desarrolloId: string) => {
    localStorage.setItem("gabi_desarrollo", desarrolloId);
    router.push("/dashboard");
  };

  const handleLogout = () => {
    localStorage.removeItem("gabi_user");
    localStorage.removeItem("gabi_desarrollo");
    router.replace("/portal/bbr");
  };

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f5fb] text-[#201044]">
        <p className="text-lg font-bold">Cargando desarrollos...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f5fb] text-[#1e293b]">
      <header className="border-b border-[#201044]/10 bg-white px-5 py-4 shadow-sm md:px-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            {portal?.logo ? (
              <Image
                src={portal.logo}
                alt={portal.nombre}
                width={420}
                height={260}
                priority
                className="h-10 w-auto shrink-0 object-contain mix-blend-multiply md:h-12"
              />
            ) : null}
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#6cc24a]">
                {portal?.nombre ?? "Guía comercial"}
              </p>
              <h1 className="truncate text-2xl font-black text-[#201044] md:text-3xl">
                Elige un desarrollo
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Hola, {user.nombre}. Selecciona dónde vas a trabajar hoy.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:shrink-0">
            <div className="hidden flex-col items-end sm:flex">
              <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate-400">
                Plataforma
              </p>
              <Image
                src="/logos/gabi-logo.png"
                alt="gabi"
                width={1018}
                height={559}
                className="h-4 w-auto object-contain opacity-70"
              />
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#201044] px-5 text-sm font-semibold text-white shadow-lg shadow-[#201044]/20 transition hover:bg-[#35156d] active:scale-95 md:min-h-14 md:px-6 md:text-base"
            >
              <LogOut className="h-5 w-5" />
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-8 md:px-10 md:py-12">
        <div className="mb-6 rounded-[2rem] bg-white p-6 shadow-xl shadow-[#201044]/10 md:p-8">
          <p className="text-sm font-black uppercase tracking-[0.28em] text-[#6cc24a]">
            {portal?.nombre ?? "Comercializadora"}
          </p>
          <h2 className="mt-2 text-3xl font-black text-[#201044] md:text-5xl">
            Desarrollos asignados
          </h2>
          <p className="mt-3 max-w-2xl text-lg text-slate-500">
            Selecciona el desarrollo para iniciar un recorrido guiado con gabi.
            Materiales, inventario y cotizador se adaptan a cada proyecto.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {desarrollosDisponibles.map((desarrollo, index) => (
            <motion.button
              key={desarrollo.id}
              type="button"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08, duration: 0.35 }}
              onClick={() => handleSelect(desarrollo.id)}
              className="group overflow-hidden rounded-[2rem] bg-white text-left shadow-xl shadow-[#201044]/10 ring-4 ring-transparent transition hover:-translate-y-1 hover:ring-[#6cc24a]/50 active:scale-[0.99]"
            >
              <div className="relative min-h-56 bg-gradient-to-br from-[#f8fafc] via-white to-[#f4ead6] p-6 text-[#1e3a5f]">
                <div className="absolute right-0 top-0 h-32 w-32 rounded-bl-full bg-[#c9a96e]/20" />
                {desarrollo.logo ? (
                  <div className="relative flex min-h-36 items-center justify-center rounded-[1.5rem] border border-[#1e3a5f]/10 bg-white p-5 shadow-inner">
                    <Image
                      src={desarrollo.logo}
                      alt={desarrollo.nombre}
                      width={260}
                      height={220}
                      className="h-auto max-h-28 w-full object-contain"
                    />
                  </div>
                ) : (
                  <p className="relative text-sm font-black uppercase tracking-[0.25em] text-[#c9a96e]">
                    {desarrollo.desarrollador}
                  </p>
                )}
                <div className="relative mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h3 className="text-3xl font-black">{desarrollo.nombre}</h3>
                    <p className="mt-2 flex items-center gap-2 text-[#1e3a5f]/70">
                      <MapPin className="h-4 w-4" />
                      {desarrollo.ubicacion}
                    </p>
                  </div>
                  {desarrollo.desarrolladorLogo && (
                    <div className="flex h-12 w-36 items-center rounded-xl bg-[#1e3a5f] p-2 shadow-md">
                      <Image
                        src={desarrollo.desarrolladorLogo}
                        alt={desarrollo.desarrollador}
                        width={170}
                        height={70}
                        className="h-auto max-h-8 w-full object-contain"
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="p-6">
                <p className="text-base text-slate-500">{desarrollo.descripcion}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {desarrollo.tiposProducto.map((tipo) => (
                    <span
                      key={tipo}
                      className="rounded-full bg-[#201044]/10 px-3 py-1 text-xs font-black uppercase text-[#201044]"
                    >
                      {tipo}
                    </span>
                  ))}
                </div>
                <div className="mt-6 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                      Desde
                    </p>
                    <p className="text-2xl font-black text-[#201044]">
                      {formatPrice(desarrollo.precioDesde)}
                    </p>
                  </div>
                  <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#6cc24a] text-[#201044] transition group-hover:translate-x-1">
                    <ArrowRight className="h-6 w-6" />
                  </span>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </section>
    </main>
  );
}
