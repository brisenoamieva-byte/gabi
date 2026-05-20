"use client";

import {
  ArrowRight,
  Building2,
  Menu,
  Route,
  WifiOff,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { GabiLogo } from "@/components/brand/GabiLogo";
import { DemoBookingEmbed } from "@/components/DemoBookingEmbed";
import { InstallGabiApp } from "@/components/InstallGabiApp";
import { ScheduleDemoButton } from "@/components/ScheduleDemoButton";

const RECORRIDO_ETAPAS = [
  "Confianza",
  "Necesidades",
  "Desarrollo",
  "Producto",
  "Cierre",
] as const;

const navLinks = [
  { href: "#producto", label: "Producto" },
  { href: "#agendar-demo", label: "Demo" },
];

const features = [
  {
    icon: Route,
    title: "Recorrido guiado",
    description:
      "El asesor avanza con guion, materiales y cotizador. Sin improvisar ni saltarse lo importante.",
  },
  {
    icon: WifiOff,
    title: "Listo sin internet",
    description:
      "Precarga inventario y documentos antes de la visita. En showroom, sigue aunque falle el wifi.",
  },
  {
    icon: Building2,
    title: "Por desarrollo",
    description:
      "Clusters, prototipos y precios del proyecto que comercializas. Cada cliente ve su contexto.",
  },
];

function ProductPreview() {
  const activeStage = 1;

  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-8 h-48 w-48 rounded-full bg-gabi-teal/10 blur-3xl"
      />
      <div className="relative overflow-hidden rounded-2xl border border-gabi-navy/10 bg-white shadow-[0_24px_48px_-12px_rgba(19,49,92,0.12)]">
        <div className="flex items-center justify-between border-b border-gabi-line px-4 py-3">
          <span className="text-xs font-medium text-gabi-muted">Recorrido · La Vista</span>
          <span className="rounded-md bg-gabi-surface px-2 py-0.5 text-[10px] font-semibold text-gabi-navy/70">
            Etapa {activeStage + 1} de {RECORRIDO_ETAPAS.length}
          </span>
        </div>

        <div className="p-4 sm:p-5">
          <p className="text-base font-semibold text-gabi-navy">Necesidades del cliente</p>

          <div className="mt-3 flex gap-1 overflow-x-auto pb-1">
            {RECORRIDO_ETAPAS.map((stage, index) => (
              <span
                key={stage}
                className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold ${
                  index <= activeStage
                    ? "bg-gabi-navy text-white"
                    : "bg-gabi-surface text-gabi-muted"
                }`}
              >
                {stage}
              </span>
            ))}
          </div>

          <div className="mt-4 space-y-2 rounded-xl bg-gabi-surface p-3.5">
            <div className="flex justify-between text-sm">
              <span className="text-gabi-navy/70">Presupuesto</span>
              <span className="font-semibold text-gabi-navy">$5.4M</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gabi-navy/70">Interés</span>
              <span className="text-gabi-navy/80">Casa · 3 rec.</span>
            </div>
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
            <p className="text-sm font-medium text-gabi-teal">Guía comercial inmobiliaria</p>
            <h1 className="mt-3 text-balance text-4xl font-bold leading-[1.1] tracking-tight sm:text-[2.75rem]">
              Cada visita, bien guiada.
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-gabi-navy/65">
              gabi acompaña al asesor en showroom y campo: qué presentar, cómo cotizar y cuándo
              registrar al prospecto. El seguimiento queda en tu CRM.
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
          <div className="max-w-xl">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
              Hecha para la visita, no para el pipeline.
            </h2>
            <p className="mt-3 text-base leading-relaxed text-gabi-navy/60">
              No sustituye tu CRM. Hace el trabajo del momento: guiar la presentación, cotizar en
              contexto y capturar al prospecto antes de que se enfríe.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
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

          <p className="mt-10 max-w-2xl text-sm leading-relaxed text-gabi-navy/50">
            La comercializadora entra con su cuenta. El asesor abre gabi con PIN y arranca el
            recorrido del desarrollo que toca. Sin configuraciones raras ni curva de aprendizaje
            larga.
          </p>
        </div>
      </section>

      <DemoBookingEmbed />

      <section className="border-t border-gabi-line px-5 py-12 md:px-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-gabi-navy">¿Ya usas gabi?</p>
            <p className="mt-1 text-sm text-gabi-navy/55">
              Instálala en tu tablet para recorridos en showroom.
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
                Guía comercial para comercializadoras inmobiliarias en México.
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
