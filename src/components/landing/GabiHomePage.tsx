"use client";

import { ArrowRight, Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { GabiLogo } from "@/components/brand/GabiLogo";
import { InstallGabiApp } from "@/components/InstallGabiApp";
import { GabiProductMock } from "@/components/landing/GabiProductMock";
import { ScheduleDemoButton } from "@/components/ScheduleDemoButton";

const MOMENTS = [
  {
    label: "En visita",
    body: "Recorrido guiado y cotizador con los esquemas del desarrollo. En tablet; también sin red si ya se precargó.",
  },
  {
    label: "Después",
    body: "El lead queda en CRM con etapa e historial. Al apartar, el sembrado se actualiza: una unidad, un estatus.",
  },
  {
    label: "Al cerrar",
    body: "Expediente, documentos y seguimiento hasta escrituración — sin armar el cierre en otro sistema.",
  },
] as const;

export function GabiHomePage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <main className="min-h-dvh bg-[#F4F6F8] text-gabi-ink">
      <header className="absolute inset-x-0 top-0 z-30">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4 px-5 py-5 md:px-8">
          <GabiLogo variant="header" href="/" onDark />
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#producto" className="text-[13px] text-white/60 transition hover:text-white">
              Producto
            </a>
            <ScheduleDemoButton
              variant="nav"
              label="Agendar demo"
              className="!inline-flex !text-[13px] !text-white/60 hover:!text-white"
            />
            <Link
              href="/acceso"
              className="text-[13px] font-medium text-white transition hover:text-white/80"
            >
              Entrar
            </Link>
          </nav>
          <button
            type="button"
            aria-expanded={mobileNavOpen}
            aria-label={mobileNavOpen ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setMobileNavOpen((open) => !open)}
            className="inline-flex h-9 w-9 items-center justify-center text-white md:hidden"
          >
            {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
        {mobileNavOpen ? (
          <nav className="border-t border-white/10 bg-[#0F2A4A]/98 px-5 py-3 md:hidden">
            <a
              href="#producto"
              onClick={() => setMobileNavOpen(false)}
              className="block py-2.5 text-sm text-white/80"
            >
              Producto
            </a>
            <ScheduleDemoButton
              variant="link"
              label="Agendar demo"
              className="!block py-2.5 !text-gabi-teal !no-underline"
            />
            <Link
              href="/acceso"
              onClick={() => setMobileNavOpen(false)}
              className="block py-2.5 text-sm font-medium text-white"
            >
              Entrar
            </Link>
          </nav>
        ) : null}
      </header>

      {/* Hero: una composición — marca dominante + producto como plano visual */}
      <section className="relative overflow-hidden bg-[#13315C]">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 55% 70% at 100% 40%, rgba(45,212,191,0.14), transparent 55%), linear-gradient(165deg, #0C243F 0%, #13315C 48%, #163A66 100%)",
          }}
        />
        {/* Atmósfera: trama fina, no decoración genérica */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />

        <div className="relative mx-auto grid max-w-[1180px] items-start gap-10 px-5 pb-0 pt-28 md:grid-cols-12 md:gap-6 md:px-8 md:pb-0 md:pt-32">
          <div className="gabi-home-fade-up pb-12 md:col-span-5 md:pb-20 md:pt-4 lg:col-span-5">
            <GabiLogo variant="heroLg" onDark className="!leading-none" />
            <h1 className="mt-7 max-w-[18ch] font-gabi-display text-[clamp(1.9rem,4.2vw,2.75rem)] font-semibold leading-[1.08] tracking-[-0.035em] text-white">
              El sistema con el que tu equipo vende el desarrollo.
            </h1>
            <p className="mt-5 max-w-[32ch] text-[15px] leading-[1.65] text-[#B8C5D6]">
              Visita, cotización, seguimiento e inventario — con las reglas reales de
              cada desarrollo.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-3">
              <ScheduleDemoButton
                variant="hero"
                label="Agendar demo"
                className="!rounded-md !bg-gabi-teal !px-4 !py-2.5 !text-[13px] !font-semibold !text-gabi-navy-dark hover:!bg-white"
              />
              <Link
                href="/acceso"
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-white/70 transition hover:text-white"
              >
                Ya tengo acceso
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <div className="gabi-home-slide-in md:col-span-7 md:col-start-6 lg:col-span-7 lg:col-start-6">
            <div className="md:translate-x-2 lg:translate-x-4">
              <GabiProductMock />
            </div>
          </div>
        </div>
      </section>

      {/* Producto — editorial, una historia */}
      <section id="producto" className="scroll-mt-10 px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-[1180px]">
          <div className="grid gap-16 md:grid-cols-12 md:gap-12">
            <div className="md:col-span-5 md:pt-1">
              <h2 className="max-w-[15ch] font-gabi-display text-[clamp(1.55rem,3vw,2.05rem)] font-semibold leading-[1.15] tracking-[-0.03em] text-gabi-navy">
                Hecho para vender en campo y operar en oficina.
              </h2>
              <p className="mt-6 max-w-[34ch] text-[15px] leading-[1.7] text-gabi-navy/55">
                Hoy el cierre vive en Excel, PDFs y un CRM aparte. gabi concentra eso:
                el asesor cotiza con inventario vivo; gerencia ve el mismo estatus.
              </p>
              <p className="mt-8 max-w-[36ch] border-l-2 border-gabi-teal pl-4 text-[14px] leading-[1.65] text-gabi-navy/70">
                <span className="font-medium text-gabi-navy">
                  Prospecto → visita → apartado → cierre.
                </span>{" "}
                Una sola fuente de verdad para asesor, gerencia y dirección.
              </p>
            </div>

            <div className="md:col-span-6 md:col-start-7">
              <ul className="divide-y divide-gabi-navy/[0.08] border-y border-gabi-navy/[0.08]">
                {MOMENTS.map((item) => (
                  <li key={item.label} className="flex gap-6 py-6 md:gap-8">
                    <span className="w-[5.5rem] shrink-0 pt-0.5 text-[12px] font-medium text-gabi-navy/40">
                      {item.label}
                    </span>
                    <p className="text-[15px] leading-[1.65] text-gabi-navy/80">
                      {item.body}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="mt-16 max-w-[52ch] text-[13px] leading-[1.6] text-gabi-navy/40 md:mt-20">
            Pensado para desarrollos que venden con equipo en showroom — no para
            portales de anuncios ni CRMs genéricos.
          </p>
        </div>
      </section>

      {/* Cierre */}
      <section
        id="agendar-demo"
        className="relative overflow-hidden bg-[#0F2A4A] px-5 py-16 md:px-8 md:py-20"
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 50% 80% at 0% 50%, rgba(45,212,191,0.1), transparent 50%)",
          }}
        />
        <div className="relative mx-auto flex max-w-[1180px] flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-lg">
            <h2 className="font-gabi-display text-[clamp(1.5rem,3vw,2rem)] font-semibold tracking-[-0.03em] text-white">
              Treinta minutos. Un desarrollo real.
            </h2>
            <p className="mt-3 max-w-[40ch] text-[14px] leading-[1.65] text-[#B8C5D6]">
              Te mostramos el flujo de showroom y de oficina — sin pitch largo ni demo
              genérica.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <ScheduleDemoButton
              variant="footer"
              label="Agendar demo"
              className="!rounded-md !bg-gabi-teal !px-5 !py-3 !text-[13px] !font-semibold !text-gabi-navy-dark hover:!bg-white"
            />
            <a
              href="mailto:hola@gabi.mx"
              className="text-[13px] font-medium text-white/60 transition hover:text-white"
            >
              hola@gabi.mx
            </a>
          </div>
        </div>
      </section>

      <section className="border-t border-gabi-line/80 bg-white/50 px-5 py-7 md:px-8">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-gabi-navy/45">
            ¿Ya operas con gabi? Instálalo en la tablet del showroom.
          </p>
          <InstallGabiApp variant="compact" />
        </div>
      </section>

      <footer className="border-t border-gabi-line px-5 py-10 md:px-8">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <GabiLogo variant="footer" />
            <p className="mt-3 text-[12px] text-gabi-navy/40">
              Sistema comercial para desarrollos inmobiliarios
            </p>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-[13px]">
            <a href="mailto:hola@gabi.mx" className="text-gabi-navy/45 hover:text-gabi-navy">
              hola@gabi.mx
            </a>
            <Link href="/acceso" className="text-gabi-navy/45 hover:text-gabi-navy">
              Entrar
            </Link>
          </div>
        </div>
        <p className="mx-auto mt-8 max-w-[1180px] text-[11px] text-gabi-navy/30">
          © {new Date().getFullYear()} gabi
        </p>
      </footer>
    </main>
  );
}
