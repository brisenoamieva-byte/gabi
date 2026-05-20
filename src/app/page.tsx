"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Link2,
  Map,
  Menu,
  Route,
  Shield,
  Smartphone,
  WifiOff,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { GabiLogo } from "@/components/brand/GabiLogo";
import { InstallGabiApp } from "@/components/InstallGabiApp";

const navLinks = [
  { href: "#posicionamiento", label: "Qué es gabi" },
  { href: "#producto", label: "Producto" },
  { href: "#como-funciona", label: "Cómo funciona" },
];

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
      <div className="pointer-events-none absolute -inset-6 rounded-[2.75rem] bg-gradient-to-br from-[#2DD4BF]/25 via-transparent to-[#13315C]/15 blur-2xl" />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="relative overflow-hidden rounded-[1.75rem] border border-[#13315C]/10 bg-white shadow-[0_32px_64px_-16px_rgba(19,49,92,0.18)]"
      >
        <div className="flex items-center gap-2 border-b border-slate-100 bg-[#F8FAFC] px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ef4444]/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#2DD4BF]/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#10B981]/80" />
          <span className="ml-2 truncate text-[11px] font-medium text-slate-400">
            gabi.mx · Recorrido guiado
          </span>
        </div>

        <div className="p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#2DD4BF]">
                Etapa 2 de 4
              </p>
              <p className="text-sm font-black text-[#13315C]">Necesidades del cliente</p>
            </div>
            <span className="rounded-full bg-[#13315C]/8 px-3 py-1 text-[10px] font-bold text-[#13315C]">
              La Vista
            </span>
          </div>

          <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-[#13315C] to-[#2DD4BF]" />
          </div>

          <div className="mb-4 grid grid-cols-4 gap-1.5">
            {stages.map((stage, index) => (
              <div
                key={stage}
                className={`rounded-lg px-1 py-2 text-center text-[9px] font-bold leading-tight sm:text-[10px] ${
                  index <= 1
                    ? "bg-[#13315C] text-white"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                {stage}
              </div>
            ))}
          </div>

          <div className="space-y-2.5 rounded-2xl bg-[#F8FAFC] p-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-[#13315C]">Presupuesto</span>
              <span className="text-xs font-black text-[#2DD4BF]">$5.4M</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-[#13315C]">Producto</span>
              <span className="text-xs text-slate-500">Casa · 3 rec.</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-white p-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#10B981]" />
              <span className="text-[11px] font-semibold text-[#13315C]/80">
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
        className="absolute -bottom-4 -left-2 hidden rounded-2xl border border-[#13315C]/10 bg-white px-4 py-3 shadow-lg sm:block"
      >
        <div className="flex items-center gap-2">
          <WifiOff className="h-4 w-4 text-[#13315C]" />
          <span className="text-xs font-bold text-[#13315C]">Modo offline activo</span>
        </div>
      </motion.div>
    </div>
  );
}

export default function LandingPage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <main className="min-h-dvh gabi-surface text-gabi-navy">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(to_right,rgba(19,49,92,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(19,49,92,0.04)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />

      <header className="sticky top-0 z-30 border-b border-gabi-navy/6 bg-gabi-surface/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5 md:px-8">
          <GabiLogo variant="header" href="/" priority />
          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-semibold text-[#13315C]/65 transition hover:text-[#13315C]"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/portal/bbr"
              className="hidden rounded-full border border-[#13315C]/15 bg-white px-4 py-2.5 text-sm font-bold text-[#13315C] transition hover:bg-[#F1F5F9] sm:inline-flex"
            >
              Ver demo
            </Link>
            <Link
              href="/portal"
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#13315C] px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-[#1A4478] active:scale-[0.98] md:px-5"
            >
              <span className="hidden sm:inline">Acceso comercializadores</span>
              <span className="sm:hidden">Portal</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              type="button"
              aria-expanded={mobileNavOpen}
              aria-label={mobileNavOpen ? "Cerrar menú" : "Abrir menú"}
              onClick={() => setMobileNavOpen((open) => !open)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#13315C]/10 bg-white text-[#13315C] md:hidden"
            >
              {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {mobileNavOpen ? (
          <nav className="border-t border-gabi-navy/8 bg-gabi-surface px-5 py-4 md:hidden">
            <ul className="space-y-1">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    onClick={() => setMobileNavOpen(false)}
                    className="block rounded-xl px-3 py-3 text-sm font-semibold text-[#13315C]/80 hover:bg-white"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
              <li>
                <Link
                  href="/portal/bbr"
                  onClick={() => setMobileNavOpen(false)}
                  className="block rounded-xl px-3 py-3 text-sm font-bold text-[#2DD4BF]"
                >
                  Probar demo piloto →
                </Link>
              </li>
            </ul>
          </nav>
        ) : null}
      </header>

      <section className="relative px-5 pb-20 pt-12 md:px-8 md:pb-28 md:pt-16">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-balance text-[2.35rem] font-black leading-[1.06] tracking-tight sm:text-5xl lg:text-[3.35rem]">
              La guía que estructura cada visita hasta el cierre
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-[#13315C]/65">
              gabi acompaña al asesor en showroom y campo: qué decir, qué mostrar
              y cuándo avanzar. Registra al prospecto en la visita y lo envía al
              CRM del desarrollador — el seguimiento vive ahí.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/portal"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#13315C] px-6 py-4 text-base font-black text-white shadow-lg shadow-[#13315C]/20 transition hover:bg-[#1A4478] active:scale-[0.98]"
              >
                Ingresar como comercializadora
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/portal/bbr"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#2DD4BF]/40 bg-[#2DD4BF]/10 px-6 py-4 text-base font-bold text-[#13315C] transition hover:bg-[#2DD4BF]/20"
              >
                Probar demo piloto
              </Link>
              <a
                href="#como-funciona"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#13315C]/15 bg-white px-6 py-4 text-base font-bold text-[#13315C] transition hover:bg-[#F1F5F9]"
              >
                Ver cómo funciona
              </a>
            </div>
          </motion.div>

          <ProductPreview />
        </div>

        <div className="mx-auto mt-16 grid max-w-6xl gap-px overflow-hidden rounded-2xl border border-[#13315C]/10 bg-[#13315C]/10 sm:grid-cols-3">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.08 }}
              className="bg-white px-6 py-5 text-center sm:text-left"
            >
              <p className="text-3xl font-black text-[#13315C]">{stat.value}</p>
              <p className="mt-1 text-sm font-medium text-[#13315C]/60">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      <section
        id="posicionamiento"
        className="border-t border-[#13315C]/8 bg-white px-5 py-20 md:px-8 md:py-24"
      >
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#2DD4BF]">
              Posicionamiento
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
              Guía en la visita. CRM en el seguimiento.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-[#13315C]/65">
              gabi no compite con tu CRM: lo complementa. Durante el recorrido
              guía al asesor; después, el prospecto vive en el sistema que ya
              usa tu desarrollador.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2">
            <article className="rounded-[1.75rem] border-2 border-[#13315C]/15 bg-[#F8FAFC] p-6 md:p-8">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#13315C] text-white">
                  <Map className="h-5 w-5" />
                </span>
                <h3 className="text-xl font-black text-[#13315C]">gabi hace</h3>
              </div>
              <ul className="mt-6 space-y-3">
                {gabiScope.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm leading-relaxed text-[#13315C]/75">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#10B981]" />
                    {item}
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-[1.75rem] border border-[#13315C]/8 bg-white p-6 md:p-8">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-500">
                  <Link2 className="h-5 w-5" />
                </span>
                <h3 className="text-xl font-black text-[#13315C]/70">Tu CRM hace</h3>
              </div>
              <ul className="mt-6 space-y-3">
                {crmScope.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm leading-relaxed text-[#13315C]/55">
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-6 rounded-xl bg-[#F8FAFC] px-4 py-3 text-xs leading-relaxed text-[#13315C]/60">
                gabi puede registrar al prospecto y enviarlo automáticamente al
                CRM configurado por el desarrollador (HubSpot y otros).
              </p>
            </article>
          </div>
        </div>
      </section>

      <section id="producto" className="border-t border-[#13315C]/8 bg-[#F8FAFC] px-5 py-20 md:px-8 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#2DD4BF]">
              Producto
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
              Diseñada para la visita comercial, no para el pipeline
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-[#13315C]/65">
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
                className={`group rounded-[1.5rem] border border-[#13315C]/8 bg-white p-6 transition hover:border-[#13315C]/15 hover:shadow-lg hover:shadow-[#13315C]/5 ${pillar.className}`}
              >
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#13315C] text-white transition group-hover:bg-[#1A4478]">
                  <pillar.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-xl font-black">{pillar.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#13315C]/65">
                  {pillar.description}
                </p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="como-funciona"
        className="border-t border-[#13315C]/8 px-5 py-20 md:px-8 md:py-24"
      >
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#2DD4BF]">
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
                className="relative rounded-[1.5rem] border border-[#13315C]/8 bg-white p-6 shadow-sm"
              >
                <span className="text-4xl font-black text-[#13315C]/10">
                  {item.step}
                </span>
                <h3 className="mt-2 text-xl font-black">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#13315C]/65">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm font-semibold text-[#13315C]/50">
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

      <section className="border-t border-[#13315C]/8 bg-white px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-gabi-teal">
              App en tu celular
            </p>
            <h2 className="mt-3 text-3xl font-black text-gabi-navy md:text-4xl">
              Instala gabi para recorridos en showroom
            </h2>
            <p className="mt-4 text-base leading-relaxed text-gabi-navy/65">
              El navegador no siempre muestra el aviso automático. Usa el botón para agregar gabi
              a tu pantalla de inicio y trabajar como app, con soporte offline tras preparar la
              visita desde el dashboard.
            </p>
          </div>
          <div className="rounded-[1.75rem] border border-gabi-navy/10 bg-gabi-surface p-6 shadow-lg shadow-gabi-navy/5">
            <InstallGabiApp variant="landing" />
          </div>
        </div>
      </section>

      <section className="border-t border-[#13315C]/8 bg-[#13315C] px-5 py-20 md:px-8">
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
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-gabi-teal px-7 py-4 text-base font-black text-gabi-navy shadow-lg transition hover:bg-gabi-teal/85 active:scale-[0.98]"
          >
            Acceder al portal
            <ArrowRight className="h-5 w-5" />
          </Link>
          <p className="mt-4 text-sm text-white/55">
            ¿Quieres ver el flujo antes?{" "}
            <Link href="/portal/bbr" className="font-bold text-[#2DD4BF] underline-offset-2 hover:underline">
              Entra al demo piloto BBR × La Vista
            </Link>
          </p>
        </div>
      </section>

      <footer className="border-t border-[#13315C]/8 px-5 py-10 md:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-8">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <GabiLogo variant="platform" />
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-[#13315C]/50">
                Plataforma de guía comercial para comercializadoras y desarrolladores
                inmobiliarios en México.
              </p>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold">
              <Link href="/portal" className="text-[#13315C]/65 hover:text-[#13315C]">
                Portal comercializadoras
              </Link>
              <Link href="/portal/bbr" className="text-[#13315C]/65 hover:text-[#13315C]">
                Demo piloto
              </Link>
              <Link href="/admin/login" className="text-[#13315C]/65 hover:text-[#13315C]">
                Admin
              </Link>
              <a
                href="mailto:hola@gabi.mx"
                className="text-[#13315C]/65 hover:text-[#13315C]"
              >
                Contacto
              </a>
            </div>
          </div>
          <div className="flex flex-col items-center justify-between gap-3 border-t border-[#13315C]/8 pt-6 text-center sm:flex-row sm:text-left">
            <p className="text-sm font-semibold text-[#13315C]/50">
              © {new Date().getFullYear()} gabi · Guía para Asesores de Bienes Inmuebles
            </p>
            <p className="text-xs text-[#13315C]/40">
              Tu guía en cada venta ·{" "}
              <span className="text-[#13315C]/35">
                Aviso de privacidad disponible bajo solicitud
              </span>
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
