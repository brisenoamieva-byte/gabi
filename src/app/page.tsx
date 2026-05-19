"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Link2,
  Map,
  Route,
  Shield,
  Smartphone,
  Sparkles,
  WifiOff,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const stats = [
  { value: "4", label: "Etapas del recorrido comercial" },
  { value: "100%", label: "Operación offline en showroom y campo" },
  { value: "0", label: "Pasos obligatorios que se pueden saltar" },
];

const pillars = [
  {
    icon: Route,
    title: "Recorrido sin saltos",
    description:
      "Confianza, necesidades, producto y cierre. El asesor siempre sabe qué decir, qué mostrar y cuándo avanzar.",
    className: "md:col-span-2",
  },
  {
    icon: WifiOff,
    title: "Offline-first",
    description: "Funciona en showroom y campo, con o sin conexión.",
    className: "",
  },
  {
    icon: Building2,
    title: "Por desarrollo",
    description: "Clusters, prototipos, cotizador y materiales comerciales por proyecto.",
    className: "",
  },
  {
    icon: Link2,
    title: "Handoff al CRM",
    description:
      "Registra al prospecto en la visita y envíalo al CRM del desarrollador. El seguimiento posterior vive ahí, no en gabi.",
    className: "md:col-span-2",
  },
];

const gabiScope = [
  "Guiar la presentación comercial en vivo",
  "Estructurar el recorrido en 4 etapas",
  "Capturar datos clave del prospecto en la visita",
  "Conectar con el CRM del desarrollador",
];

const crmScope = [
  "Historial y seguimiento del prospecto",
  "Pipeline, tareas y recordatorios",
  "Reportes comerciales del equipo",
  "Gestión post-visita y cierre",
];

const steps = [
  {
    step: "01",
    title: "La comercializadora entra",
    description: "Acceso seguro al portal con usuario y contraseña.",
  },
  {
    step: "02",
    title: "El asesor ingresa con PIN",
    description: "Pantalla personalizada de la comercializadora, lista para vender.",
  },
  {
    step: "03",
    title: "gabi guía el recorrido",
    description: "Presentación estructurada, cotización en contexto y cierre — sin perder el hilo.",
  },
];

function ProductPreview() {
  const stages = ["Confianza", "Necesidades", "Producto", "Cierre"];

  return (
    <div className="relative mx-auto w-full max-w-[420px] lg:max-w-none">
      <div className="pointer-events-none absolute -inset-6 rounded-[2.75rem] bg-gradient-to-br from-[#c9a96e]/25 via-transparent to-[#1a3d2e]/15 blur-2xl" />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="relative overflow-hidden rounded-[1.75rem] border border-[#1a3d2e]/10 bg-white shadow-[0_32px_64px_-16px_rgba(26,61,46,0.18)]"
      >
        <div className="flex items-center gap-2 border-b border-slate-100 bg-[#faf8f4] px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ef4444]/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#c9a96e]/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#22c55e]/80" />
          <span className="ml-2 truncate text-[11px] font-medium text-slate-400">
            gabi.mx · Recorrido guiado
          </span>
        </div>

        <div className="p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#c9a96e]">
                Etapa 2 de 4
              </p>
              <p className="text-sm font-black text-[#1a3d2e]">Necesidades del cliente</p>
            </div>
            <span className="rounded-full bg-[#1a3d2e]/8 px-3 py-1 text-[10px] font-bold text-[#1a3d2e]">
              La Vista
            </span>
          </div>

          <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-[#1a3d2e] to-[#c9a96e]" />
          </div>

          <div className="mb-4 grid grid-cols-4 gap-1.5">
            {stages.map((stage, index) => (
              <div
                key={stage}
                className={`rounded-lg px-1 py-2 text-center text-[9px] font-bold leading-tight sm:text-[10px] ${
                  index <= 1
                    ? "bg-[#1a3d2e] text-white"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                {stage}
              </div>
            ))}
          </div>

          <div className="space-y-2.5 rounded-2xl bg-[#faf8f4] p-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-[#1a3d2e]">Presupuesto</span>
              <span className="text-xs font-black text-[#c9a96e]">$5.4M</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-[#1a3d2e]">Producto</span>
              <span className="text-xs text-slate-500">Casa · 3 rec.</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-white p-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#22c55e]" />
              <span className="text-[11px] font-semibold text-[#1a3d2e]/80">
                Listo para avanzar a selección de producto
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.45, duration: 0.4 }}
        className="absolute -bottom-4 -left-2 hidden rounded-2xl border border-[#1a3d2e]/10 bg-white px-4 py-3 shadow-lg sm:block"
      >
        <div className="flex items-center gap-2">
          <WifiOff className="h-4 w-4 text-[#1a3d2e]" />
          <span className="text-xs font-bold text-[#1a3d2e]">Modo offline activo</span>
        </div>
      </motion.div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-dvh bg-[#faf8f4] text-[#1a3d2e]">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(to_right,rgba(26,61,46,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(26,61,46,0.04)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />

      <header className="sticky top-0 z-30 border-b border-[#1a3d2e]/6 bg-[#faf8f4]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5 md:px-8">
          <Link href="/" className="shrink-0">
            <Image
              src="/logos/gabi-logo.png"
              alt="gabi"
              width={1018}
              height={559}
              priority
              className="h-7 w-auto object-contain md:h-8"
            />
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            <a
              href="#posicionamiento"
              className="text-sm font-semibold text-[#1a3d2e]/65 transition hover:text-[#1a3d2e]"
            >
              Qué es gabi
            </a>
            <a
              href="#producto"
              className="text-sm font-semibold text-[#1a3d2e]/65 transition hover:text-[#1a3d2e]"
            >
              Producto
            </a>
            <a
              href="#como-funciona"
              className="text-sm font-semibold text-[#1a3d2e]/65 transition hover:text-[#1a3d2e]"
            >
              Cómo funciona
            </a>
          </nav>
          <Link
            href="/portal"
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#1a3d2e] px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-[#245a42] active:scale-[0.98] md:px-5"
          >
            Acceso comercializadores
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <section className="relative px-5 pb-20 pt-12 md:px-8 md:pb-28 md:pt-16">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-[#1a3d2e]/10 bg-white px-3 py-1.5 text-xs font-bold text-[#1a3d2e] shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-[#c9a96e]" />
              Guía comercial inmobiliaria · No es un CRM
            </span>
            <h1 className="mt-6 text-balance text-[2.35rem] font-black leading-[1.06] tracking-tight sm:text-5xl lg:text-[3.35rem]">
              La guía que estructura cada visita hasta el cierre
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-[#1a3d2e]/65">
              gabi acompaña al asesor en showroom y campo: qué decir, qué mostrar
              y cuándo avanzar. Registra al prospecto en la visita y lo envía al
              CRM del desarrollador — el seguimiento vive ahí.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/portal"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1a3d2e] px-6 py-4 text-base font-black text-white shadow-lg shadow-[#1a3d2e]/20 transition hover:bg-[#245a42] active:scale-[0.98]"
              >
                Ingresar como comercializadora
                <ArrowRight className="h-5 w-5" />
              </Link>
              <a
                href="#como-funciona"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#1a3d2e]/15 bg-white px-6 py-4 text-base font-bold text-[#1a3d2e] transition hover:bg-[#f4f0e6]"
              >
                Ver cómo funciona
              </a>
            </div>
          </motion.div>

          <ProductPreview />
        </div>

        <div className="mx-auto mt-16 grid max-w-6xl gap-px overflow-hidden rounded-2xl border border-[#1a3d2e]/10 bg-[#1a3d2e]/10 sm:grid-cols-3">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.08 }}
              className="bg-white px-6 py-5 text-center sm:text-left"
            >
              <p className="text-3xl font-black text-[#1a3d2e]">{stat.value}</p>
              <p className="mt-1 text-sm font-medium text-[#1a3d2e]/60">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      <section
        id="posicionamiento"
        className="border-t border-[#1a3d2e]/8 bg-white px-5 py-20 md:px-8 md:py-24"
      >
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#c9a96e]">
              Posicionamiento
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
              Guía en la visita. CRM en el seguimiento.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-[#1a3d2e]/65">
              gabi no compite con tu CRM: lo complementa. Durante el recorrido
              guía al asesor; después, el prospecto vive en el sistema que ya
              usa tu desarrollador.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2">
            <article className="rounded-[1.75rem] border-2 border-[#1a3d2e]/15 bg-[#faf8f4] p-6 md:p-8">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#1a3d2e] text-white">
                  <Map className="h-5 w-5" />
                </span>
                <h3 className="text-xl font-black text-[#1a3d2e]">gabi hace</h3>
              </div>
              <ul className="mt-6 space-y-3">
                {gabiScope.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm leading-relaxed text-[#1a3d2e]/75">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#22c55e]" />
                    {item}
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-[1.75rem] border border-[#1a3d2e]/8 bg-white p-6 md:p-8">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-500">
                  <Link2 className="h-5 w-5" />
                </span>
                <h3 className="text-xl font-black text-[#1a3d2e]/70">Tu CRM hace</h3>
              </div>
              <ul className="mt-6 space-y-3">
                {crmScope.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm leading-relaxed text-[#1a3d2e]/55">
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-6 rounded-xl bg-[#faf8f4] px-4 py-3 text-xs leading-relaxed text-[#1a3d2e]/60">
                gabi puede registrar al prospecto y enviarlo automáticamente al
                CRM configurado por el desarrollador (HubSpot y otros).
              </p>
            </article>
          </div>
        </div>
      </section>

      <section id="producto" className="border-t border-[#1a3d2e]/8 bg-[#faf8f4] px-5 py-20 md:px-8 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#c9a96e]">
              Producto
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
              Diseñada para la visita comercial, no para el pipeline
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-[#1a3d2e]/65">
              Mobile-first, offline y adaptada a cada desarrollo. Todo lo que el
              asesor necesita mientras presenta — nada que distraiga del cierre.
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {pillars.map((pillar, index) => (
              <motion.article
                key={pillar.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.06 }}
                className={`group rounded-[1.5rem] border border-[#1a3d2e]/8 bg-white p-6 transition hover:border-[#1a3d2e]/15 hover:shadow-lg hover:shadow-[#1a3d2e]/5 ${pillar.className}`}
              >
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#1a3d2e] text-white transition group-hover:bg-[#245a42]">
                  <pillar.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-xl font-black">{pillar.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#1a3d2e]/65">
                  {pillar.description}
                </p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="como-funciona"
        className="border-t border-[#1a3d2e]/8 px-5 py-20 md:px-8 md:py-24"
      >
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#c9a96e]">
              Cómo funciona
            </p>
            <h2 className="mt-3 text-3xl font-black md:text-4xl">
              De la comercializadora al cierre de venta
            </h2>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {steps.map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="relative rounded-[1.5rem] border border-[#1a3d2e]/8 bg-white p-6 shadow-sm"
              >
                <span className="text-4xl font-black text-[#1a3d2e]/10">
                  {item.step}
                </span>
                <h3 className="mt-2 text-xl font-black">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#1a3d2e]/65">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm font-semibold text-[#1a3d2e]/50">
            <span className="inline-flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Acceso por comercializadora
            </span>
            <span className="inline-flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Optimizado para tablet y móvil
            </span>
          </div>
        </div>
      </section>

      <section className="border-t border-[#1a3d2e]/8 bg-[#1a3d2e] px-5 py-20 md:px-8">
        <div className="mx-auto max-w-3xl text-center text-white">
          <h2 className="text-3xl font-black md:text-4xl">
            ¿Tu comercializadora ya usa gabi?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-white/70">
            Entra a tu portal personalizado. Desde ahí, tus asesores acceden con
            PIN a los desarrollos que comercializas.
          </p>
          <Link
            href="/portal"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#c9a96e] px-7 py-4 text-base font-black text-[#1a3d2e] shadow-lg transition hover:bg-[#d4b87e] active:scale-[0.98]"
          >
            Acceder al portal
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-[#1a3d2e]/8 px-5 py-8 md:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm font-semibold text-[#1a3d2e]/50">
            © {new Date().getFullYear()} gabi · Guía para Asesores de Bienes
            Inmuebles
          </p>
          <p className="text-xs text-[#1a3d2e]/40">Tu guía en cada venta</p>
        </div>
      </footer>
    </main>
  );
}
