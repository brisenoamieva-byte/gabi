"use client";

import {
  ArrowRight,
  BarChart3,
  Building2,
  Calculator,
  Kanban,
  Menu,
  Route,
  Sprout,
  WifiOff,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { GabiLogo } from "@/components/brand/GabiLogo";
import { DemoBookingEmbed } from "@/components/DemoBookingEmbed";
import { InstallGabiApp } from "@/components/InstallGabiApp";
import { ScheduleDemoButton } from "@/components/ScheduleDemoButton";

const COMMERCIAL_FLOW = [
  "Prospecto",
  "Recorrido",
  "Cotización",
  "CRM",
  "Sembrado",
  "Venta",
] as const;

const navLinks = [
  { href: "#producto", label: "Plataforma" },
  { href: "#agendar-demo", label: "Demo" },
];

const features = [
  {
    icon: Route,
    title: "Recorrido guiado",
    description:
      "Guion, materiales y captura del prospecto en showroom o campo. El asesor avanza sin improvisar.",
  },
  {
    icon: Calculator,
    title: "Cotizador integrado",
    description:
      "Cotiza con inventario real del desarrollo. Cada propuesta queda ligada al lead y al asesor.",
  },
  {
    icon: Kanban,
    title: "CRM de leads",
    description:
      "Pipeline comercial, seguimiento por asesor, spam, duplicados e interés — visible para gerencia.",
  },
  {
    icon: Sprout,
    title: "Sembrado e inventario",
    description:
      "Disponibilidad, apartados y operaciones comerciales en una sola fuente de verdad por unidad.",
  },
  {
    icon: BarChart3,
    title: "Métricas y campañas",
    description:
      "Reportes por desarrollo, canales de captación y KPIs del embudo comercial.",
  },
  {
    icon: Building2,
    title: "Multi-desarrollo",
    description:
      "Clusters, prototipos, precios y equipos por proyecto. Cada comercializadora opera su cartera.",
  },
];

const platformHighlights = [
  { label: "Recorrido", detail: "Etapa 2 · Necesidades" },
  { label: "Mis leads", detail: "12 activos · 3 cotizaron" },
  { label: "Sembrado", detail: "84 disponibles · 6 apartados" },
] as const;

function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-8 h-48 w-48 rounded-full bg-gabi-teal/10 blur-3xl"
      />
      <div className="relative overflow-hidden rounded-2xl border border-gabi-navy/10 bg-white shadow-[0_24px_48px_-12px_rgba(19,49,92,0.12)]">
        <div className="flex items-center justify-between border-b border-gabi-line px-4 py-3">
          <span className="text-xs font-medium text-gabi-muted">gabi · La Vista</span>
          <span className="rounded-md bg-gabi-teal/10 px-2 py-0.5 text-[10px] font-semibold text-gabi-teal">
            Plataforma integral
          </span>
        </div>

        <div className="p-4 sm:p-5">
          <p className="text-base font-semibold text-gabi-navy">Ciclo comercial conectado</p>
          <p className="mt-1 text-xs text-gabi-navy/55">
            Del primer contacto al apartado, sin saltar entre herramientas.
          </p>

          <div className="mt-3 flex flex-wrap gap-1">
            {COMMERCIAL_FLOW.map((stage, index) => (
              <span
                key={stage}
                className={`rounded-md px-2 py-1 text-[10px] font-semibold ${
                  index <= 3
                    ? "bg-gabi-navy text-white"
                    : "bg-gabi-surface text-gabi-muted"
                }`}
              >
                {stage}
              </span>
            ))}
          </div>

          <div className="mt-4 space-y-2">
            {platformHighlights.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-xl bg-gabi-surface px-3.5 py-2.5 text-sm"
              >
                <span className="font-medium text-gabi-navy">{item.label}</span>
                <span className="text-xs text-gabi-navy/60">{item.detail}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <main className="min-h-dvh bg-white text-gabi-navy">
      <header className="sticky top-0 z-30 border-b border-gabi-line/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4 md:px-8">
          <GabiLogo variant="header" href="/" priority />
          <nav className="hidden items-center gap-7 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-gabi-navy/60 transition hover:text-gabi-navy"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <ScheduleDemoButton
              variant="nav"
              label="Agendar demo"
              scrollToEmbed
              showIcon={false}
            />
            <Link
              href="/portal"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-gabi-navy px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-gabi-navy-light"
            >
              <span className="hidden sm:inline">Portal</span>
              <span className="sm:hidden">Entrar</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <button
              type="button"
              aria-expanded={mobileNavOpen}
              aria-label={mobileNavOpen ? "Cerrar menú" : "Abrir menú"}
              onClick={() => setMobileNavOpen((open) => !open)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gabi-line text-gabi-navy md:hidden"
            >
              {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {mobileNavOpen ? (
          <nav className="border-t border-gabi-line px-5 py-3 md:hidden">
            <ul className="space-y-0.5">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    onClick={() => setMobileNavOpen(false)}
                    className="block rounded-lg px-3 py-2.5 text-sm font-medium text-gabi-navy/80"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </header>

      <section className="px-5 pb-16 pt-14 md:px-8 md:pb-24 md:pt-20">
        <div className="mx-auto grid max-w-5xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div>
            <p className="text-sm font-medium text-gabi-teal">
              Plataforma comercial inmobiliaria integral
            </p>
            <h1 className="mt-3 text-balance text-4xl font-bold leading-[1.1] tracking-tight sm:text-[2.75rem]">
              Del prospecto a la venta, en un solo lugar.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-gabi-navy/65">
              gabi unifica recorrido, cotización, CRM, sembrado y métricas para que asesores y
              gerencia operen el ciclo comercial completo — en showroom, campo y oficina.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <ScheduleDemoButton variant="hero" label="Agendar demo" scrollToEmbed />
              <Link
                href="/portal"
                className="text-sm font-medium text-gabi-navy/55 transition hover:text-gabi-navy"
              >
                Ya tengo acceso →
              </Link>
            </div>
          </div>
          <ProductPreview />
        </div>
      </section>

      <section id="producto" className="border-t border-gabi-line bg-gabi-surface px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
              Más que una guía: tu operación comercial completa.
            </h2>
            <p className="mt-3 text-base leading-relaxed text-gabi-navy/60">
              Antes acompañaba la visita. Hoy conecta cada etapa del embudo — captación, presentación,
              cotización, seguimiento, apartado y reportes — en una plataforma pensada para
              comercializadoras inmobiliarias en México.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="rounded-xl border border-gabi-navy/8 bg-white p-5"
              >
                <feature.icon className="h-5 w-5 text-gabi-navy/70" strokeWidth={1.75} />
                <h3 className="mt-3 text-base font-semibold">{feature.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-gabi-navy/60">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <article className="rounded-xl border border-gabi-navy/8 bg-white p-5">
              <WifiOff className="h-5 w-5 text-gabi-navy/70" strokeWidth={1.75} />
              <h3 className="mt-3 text-base font-semibold">Lista para la visita</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-gabi-navy/60">
                Precarga inventario y documentos antes de salir al showroom. El recorrido sigue
                aunque falle el wifi.
              </p>
            </article>
            <article className="rounded-xl border border-gabi-navy/8 bg-white p-5">
              <Building2 className="h-5 w-5 text-gabi-navy/70" strokeWidth={1.75} />
              <h3 className="mt-3 text-base font-semibold">Roles claros</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-gabi-navy/60">
                El asesor opera en campo con PIN. Gerencia administra leads, sembrado, campañas y
                reportes desde el panel central.
              </p>
            </article>
          </div>

          <p className="mt-10 max-w-2xl text-sm leading-relaxed text-gabi-navy/50">
            La comercializadora entra con su cuenta, elige desarrollo y arranca: recorrido con
            cliente, registro de leads, cotización o revisión de disponibilidad. Sin integraciones
            frágiles ni datos repartidos en hojas de cálculo.
          </p>
        </div>
      </section>

      <DemoBookingEmbed />

      <section className="border-t border-gabi-line px-5 py-12 md:px-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-gabi-navy">¿Ya usas gabi?</p>
            <p className="mt-1 text-sm text-gabi-navy/55">
              Instálala en tu tablet para operar recorridos, leads y cotizaciones en showroom.
            </p>
          </div>
          <InstallGabiApp variant="compact" />
        </div>
      </section>

      <footer className="border-t border-gabi-line px-5 py-10 md:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col justify-between gap-8 sm:flex-row sm:items-start">
            <div>
              <GabiLogo variant="platform" />
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-gabi-navy/45">
                Plataforma comercial integral para comercializadoras inmobiliarias en México.
              </p>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium">
              <Link href="/portal" className="text-gabi-navy/55 hover:text-gabi-navy">
                Portal
              </Link>
              <a href="#agendar-demo" className="text-gabi-navy/55 hover:text-gabi-navy">
                Agendar demo
              </a>
              <a href="mailto:hola@gabi.mx" className="text-gabi-navy/55 hover:text-gabi-navy">
                hola@gabi.mx
              </a>
            </div>
          </div>
          <p className="mt-8 border-t border-gabi-line pt-6 text-xs text-gabi-navy/40">
            © {new Date().getFullYear()} gabi
          </p>
        </div>
      </footer>
    </main>
  );
}
