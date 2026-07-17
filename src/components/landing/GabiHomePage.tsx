"use client";

import { ArrowRight, Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { GabiLogo } from "@/components/brand/GabiLogo";
import { InstallGabiApp } from "@/components/InstallGabiApp";
import { GabiProductMock } from "@/components/landing/GabiProductMock";
import { ScheduleDemoButton } from "@/components/ScheduleDemoButton";

const VALOR = [
  {
    titulo: "Campo",
    texto:
      "Recorrido y cotizador listos para showroom — con precios e inventario vivos, también sin conexión.",
  },
  {
    titulo: "Operación",
    texto:
      "CRM, sembrado y expedientes en la misma fuente de verdad. Un estatus por unidad, no varios Excel.",
  },
  {
    titulo: "Reglas del desarrollo",
    texto:
      "Esquemas, listas y PDFs alineados a lo que realmente se cotiza. No un CRM genérico pegado a hojas sueltas.",
  },
] as const;

const FLUJO = [
  { paso: "01", titulo: "Prospecto", texto: "Campaña, visita o Meta Lead Ads." },
  { paso: "02", titulo: "Visita", texto: "Recorrido + cotización en sitio." },
  { paso: "03", titulo: "Apartado", texto: "Sembrado y cliente en un clic." },
  { paso: "04", titulo: "Cierre", texto: "Expediente hasta escrituración." },
] as const;

export function GabiHomePage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <main className="min-h-dvh bg-gabi-surface text-gabi-ink">
      {/* Header */}
      <header className="absolute inset-x-0 top-0 z-30">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 md:px-8">
          <GabiLogo variant="header" href="/" onDark />
          <nav className="hidden items-center gap-7 md:flex">
            <a
              href="#diferencia"
              className="text-sm text-white/65 transition hover:text-white"
            >
              Por qué gabi
            </a>
            <a
              href="#flujo"
              className="text-sm text-white/65 transition hover:text-white"
            >
              Cómo funciona
            </a>
            <ScheduleDemoButton
              variant="nav"
              label="Agendar demo"
              className="!inline-flex !text-white/70 hover:!text-white"
            />
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/acceso"
              className="hidden items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-3.5 py-2 text-sm font-medium text-white backdrop-blur-sm transition hover:border-white/35 hover:bg-white/10 sm:inline-flex"
            >
              Entrar
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <button
              type="button"
              aria-expanded={mobileNavOpen}
              aria-label={mobileNavOpen ? "Cerrar menú" : "Abrir menú"}
              onClick={() => setMobileNavOpen((open) => !open)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 text-white md:hidden"
            >
              {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {mobileNavOpen ? (
          <nav className="border-t border-white/10 bg-gabi-navy-dark/95 px-5 py-3 backdrop-blur-md md:hidden">
            <ul className="space-y-0.5">
              <li>
                <a
                  href="#diferencia"
                  onClick={() => setMobileNavOpen(false)}
                  className="block px-2 py-2.5 text-sm text-white/85"
                >
                  Por qué gabi
                </a>
              </li>
              <li>
                <a
                  href="#flujo"
                  onClick={() => setMobileNavOpen(false)}
                  className="block px-2 py-2.5 text-sm text-white/85"
                >
                  Cómo funciona
                </a>
              </li>
              <li>
                <ScheduleDemoButton
                  variant="link"
                  label="Agendar demo"
                  className="!block px-2 py-2.5 !text-gabi-teal !no-underline"
                />
              </li>
              <li>
                <Link
                  href="/acceso"
                  onClick={() => setMobileNavOpen(false)}
                  className="block px-2 py-2.5 text-sm font-medium text-white"
                >
                  Entrar
                </Link>
              </li>
            </ul>
          </nav>
        ) : null}
      </header>

      {/* Hero */}
      <section className="relative min-h-[100dvh] overflow-hidden bg-gabi-navy">
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 70% 40%, rgba(45,212,191,0.18), transparent 55%), radial-gradient(ellipse 50% 40% at 10% 80%, rgba(34,211,238,0.12), transparent 50%), linear-gradient(165deg, #0F2A4A 0%, #13315C 45%, #1A4478 100%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(ellipse at center, black 20%, transparent 75%)",
          }}
        />

        <div className="relative mx-auto grid min-h-[100dvh] max-w-6xl items-center gap-10 px-5 pb-16 pt-28 md:grid-cols-[1.05fr_0.95fr] md:gap-12 md:px-8 md:pb-20 md:pt-24">
          <div className="gabi-home-fade-up">
            <GabiLogo variant="heroLg" onDark />
            <h1 className="mt-6 max-w-xl font-[family-name:var(--font-gabi-display)] text-[clamp(1.65rem,4.2vw,2.45rem)] font-bold leading-[1.12] tracking-tight text-white">
              El sistema con el que tu equipo vende el desarrollo.
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-white/70 md:text-base">
              De la visita al expediente, con inventario y esquemas reales — listo para
              showroom y oficina.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ScheduleDemoButton
                variant="hero"
                label="Agendar demo"
                showIcon
                className="!bg-gabi-teal !text-gabi-navy-dark hover:!bg-white"
              />
              <Link
                href="/acceso"
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/25 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/45 hover:bg-white/5"
              >
                Entrar
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <div className="gabi-home-fade-in gabi-home-float">
            <GabiProductMock />
          </div>
        </div>
      </section>

      {/* Diferencia */}
      <section id="diferencia" className="scroll-mt-8 px-5 py-16 md:px-8 md:py-24">
        <div className="mx-auto max-w-6xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gabi-muted">
            Por qué gabi
          </p>
          <h2 className="mt-3 max-w-2xl font-[family-name:var(--font-gabi-display)] text-2xl font-bold tracking-tight text-gabi-navy md:text-3xl">
            No es otro CRM. Es el sistema operativo comercial del desarrollo.
          </h2>
          <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
            {VALOR.map((item) => (
              <div key={item.titulo} className="border-t border-gabi-navy/15 pt-5">
                <h3 className="font-[family-name:var(--font-gabi-display)] text-lg font-bold text-gabi-navy">
                  {item.titulo}
                </h3>
                <p className="mt-3 text-[15px] leading-relaxed text-gabi-navy/65">
                  {item.texto}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Flujo */}
      <section
        id="flujo"
        className="scroll-mt-8 border-t border-gabi-line bg-white px-5 py-16 md:px-8 md:py-20"
      >
        <div className="mx-auto max-w-6xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gabi-muted">
            Cómo funciona
          </p>
          <h2 className="mt-3 max-w-xl font-[family-name:var(--font-gabi-display)] text-2xl font-bold tracking-tight text-gabi-navy md:text-3xl">
            Un solo flujo. Del primer contacto a la venta.
          </h2>

          <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FLUJO.map((item, index) => (
              <li key={item.paso} className="relative">
                {index < FLUJO.length - 1 ? (
                  <span
                    className="absolute left-[calc(100%-0.5rem)] top-4 hidden h-px w-[calc(100%-2rem)] bg-gabi-line lg:block"
                    aria-hidden
                  />
                ) : null}
                <p className="font-[family-name:var(--font-gabi-display)] text-sm font-bold tabular-nums text-gabi-teal">
                  {item.paso}
                </p>
                <p className="mt-2 text-base font-semibold text-gabi-navy">{item.titulo}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-gabi-navy/60">{item.texto}</p>
              </li>
            ))}
          </ol>

          <p className="mt-12 max-w-2xl text-[15px] leading-relaxed text-gabi-navy/60">
            Asesor en showroom · Gerencia en admin · Dirección con datos reales.
          </p>
        </div>
      </section>

      {/* Cierre venta */}
      <section
        id="agendar-demo"
        className="relative overflow-hidden bg-gabi-navy px-5 py-16 md:px-8 md:py-20"
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 80% 50%, rgba(45,212,191,0.15), transparent 60%)",
          }}
        />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <h2 className="font-[family-name:var(--font-gabi-display)] text-2xl font-bold tracking-tight text-white md:text-3xl">
              Lleva gabi a tu desarrollo.
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-white/65">
              Plataforma operativa para equipos comerciales — no una landing de leads al
              público. Te mostramos cómo se vive en showroom y en oficina.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ScheduleDemoButton
              variant="footer"
              label="Agendar demo"
              showIcon
              className="!bg-gabi-teal !text-gabi-navy-dark hover:!bg-white"
            />
            <Link
              href="/acceso"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/25 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/5"
            >
              Ya tengo acceso
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Install discreto */}
      <section className="border-t border-gabi-line bg-gabi-surface px-5 py-8 md:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-gabi-navy">¿Ya operas con gabi?</p>
            <p className="mt-0.5 text-[13px] text-gabi-muted">
              Instala la app en la tablet del showroom.
            </p>
          </div>
          <InstallGabiApp variant="compact" />
        </div>
      </section>

      <footer className="border-t border-gabi-line bg-white px-5 py-10 md:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <GabiLogo variant="footer" />
            <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-gabi-muted">
              Sistema comercial para desarrollos y comercializadoras.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <ScheduleDemoButton variant="link" label="Agendar demo" />
            <a
              href="mailto:hola@gabi.mx"
              className="text-gabi-navy/55 transition hover:text-gabi-navy"
            >
              hola@gabi.mx
            </a>
            <Link
              href="/acceso"
              className="text-gabi-navy/55 transition hover:text-gabi-navy"
            >
              Entrar
            </Link>
          </div>
        </div>
        <p className="mx-auto mt-8 max-w-6xl border-t border-gabi-line pt-6 text-xs text-gabi-muted/70">
          © {new Date().getFullYear()} gabi
        </p>
      </footer>
    </main>
  );
}
