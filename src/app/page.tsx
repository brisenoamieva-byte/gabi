"use client";

import { ArrowRight, Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { GabiLogo } from "@/components/brand/GabiLogo";
import { InstallGabiApp } from "@/components/InstallGabiApp";

const FLUJO = [
  { paso: "1", titulo: "Prospecto", texto: "Llega por campaña, formulario o visita." },
  { paso: "2", titulo: "Recorrido", texto: "El asesor presenta el desarrollo con guion y materiales." },
  { paso: "3", titulo: "Cotización", texto: "Precio y esquema de pago con inventario real." },
  { paso: "4", titulo: "Seguimiento", texto: "El lead queda en CRM con etapa e historial." },
  { paso: "5", titulo: "Apartado", texto: "Sembrado actualizado: unidad, cliente, pagos." },
  { paso: "6", titulo: "Cierre", texto: "Expediente, comisiones y documentación." },
] as const;

const MODULOS = [
  {
    grupo: "En la visita",
    items: [
      {
        nombre: "Recorrido guiado",
        detalle:
          "Guion por etapas, documentos del desarrollo y registro del prospecto. Funciona sin internet si se precargó antes.",
      },
      {
        nombre: "Cotizador y simulador",
        detalle:
          "Cotiza con precios e inventario vigentes. Esquemas de pago alineados a las reglas comerciales de cada desarrollo.",
      },
    ],
  },
  {
    grupo: "Seguimiento comercial",
    items: [
      {
        nombre: "CRM de leads",
        detalle:
          "Pipeline por etapa, asignación a asesor, campaña de origen y detalle de cada prospecto.",
      },
      {
        nombre: "Campañas",
        detalle: "Origen de cada lead (WhatsApp, landing, portales) para saber qué canal trae resultados.",
      },
    ],
  },
  {
    grupo: "Operación diaria",
    items: [
      {
        nombre: "Sembrado e inventario",
        detalle:
          "Estatus de cada lote: disponible, apartado, vendido. Una sola fuente por unidad, no varios Excel.",
      },
      {
        nombre: "Expedientes",
        detalle:
          "Checklist de venta, comisiones y documentos del cliente hasta escrituración.",
      },
    ],
  },
  {
    grupo: "Análisis y mercado",
    items: [
      {
        nombre: "Inteligencia de mercado",
        detalle:
          "Mapa y comparativo de desarrollos: metrajes, precios y absorción en la zona donde opera la comercializadora.",
      },
      {
        nombre: "Estudios de mercado",
        detalle:
          "Memos para dirección con recomendación, evidencia y simulador — publicados cuando hay una decisión de producto o precio que documentar.",
      },
    ],
  },
] as const;

const navLinks = [
  { href: "#que-es", label: "Qué es" },
  { href: "#modulos", label: "Módulos" },
  { href: "#equipos", label: "Quién lo usa" },
] as const;

function FlujoVisual() {
  return (
    <div className="border border-gabi-line bg-white">
      <div className="border-b border-gabi-line px-4 py-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-gabi-muted">
          Ciclo comercial
        </p>
        <p className="mt-1 font-[Georgia,'Times_New_Roman',serif] text-lg text-gabi-navy">
          De prospecto a venta cerrada
        </p>
      </div>
      <ol className="divide-y divide-gabi-line">
        {FLUJO.map((f) => (
          <li key={f.paso} className="flex gap-4 px-4 py-3.5">
            <span className="mt-0.5 w-6 shrink-0 text-sm tabular-nums text-gabi-muted">{f.paso}</span>
            <div>
              <p className="text-sm font-semibold text-gabi-navy">{f.titulo}</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-gabi-navy/60">{f.texto}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function LandingPage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <main className="min-h-dvh bg-[#FDFCFA] text-gabi-navy">
      <header className="sticky top-0 z-30 border-b border-gabi-line bg-[#FDFCFA]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-4 md:px-8">
          <GabiLogo variant="header" href="/" priority />
          <nav className="hidden items-center gap-6 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-gabi-navy/55 transition hover:text-gabi-navy"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/portal"
              className="inline-flex shrink-0 items-center gap-1.5 border border-gabi-navy/15 bg-white px-3.5 py-2 text-sm font-medium text-gabi-navy transition hover:border-gabi-navy/30"
            >
              Entrar
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <button
              type="button"
              aria-expanded={mobileNavOpen}
              aria-label={mobileNavOpen ? "Cerrar menú" : "Abrir menú"}
              onClick={() => setMobileNavOpen((open) => !open)}
              className="inline-flex h-9 w-9 items-center justify-center border border-gabi-line md:hidden"
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
                    className="block px-2 py-2.5 text-sm text-gabi-navy/80"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </header>

      {/* Hero */}
      <section className="px-5 pb-14 pt-12 md:px-8 md:pb-20 md:pt-16">
        <div className="mx-auto grid max-w-3xl gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-start lg:gap-14">
          <div id="que-es">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-gabi-muted">
              Sistema comercial inmobiliario
            </p>
            <h1 className="mt-4 font-[Georgia,'Times_New_Roman',serif] text-[2rem] font-normal leading-[1.15] tracking-tight md:text-[2.35rem]">
              Una sola herramienta para todo el ciclo comercial inmobiliario.
            </h1>
            <p className="mt-5 text-[15px] leading-relaxed text-gabi-navy/70">
              <strong className="font-medium text-gabi-navy">gabi</strong> concentra en un solo
              sistema lo que una comercializadora necesita para vender desarrollos: visitas con el
              cliente, cotizaciones, seguimiento de leads, inventario, expedientes y análisis de
              mercado.
            </p>
            <p className="mt-4 text-[15px] leading-relaxed text-gabi-navy/70">
              Lo usan los asesores en showroom, la gerencia en oficina y la dirección cuando hay
              decisiones de producto o precio que respaldar con datos.
            </p>
          </div>
          <FlujoVisual />
        </div>
      </section>

      {/* Por qué existe */}
      <section className="border-t border-gabi-line bg-white px-5 py-14 md:px-8 md:py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-[Georgia,'Times_New_Roman',serif] text-xl md:text-2xl">
            Por qué existe gabi
          </h2>
          <div className="mt-5 space-y-4 text-[15px] leading-relaxed text-gabi-navy/70">
            <p>
              Antes, cada etapa vivía en un lugar distinto: guiones en PDF, precios en Excel,
              leads en otro CRM, sembrado en hojas sueltas. Eso genera duplicados, versiones viejas
              y poca visibilidad para gerencia.
            </p>
            <p>
              gabi nació para unir ese flujo en una sola aplicación — en tablet en el showroom, en
              computadora en oficina y con respaldo en la nube cuando hay conexión.
            </p>
          </div>
        </div>
      </section>

      {/* Módulos */}
      <section id="modulos" className="border-t border-gabi-line px-5 py-14 md:px-8 md:py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-[Georgia,'Times_New_Roman',serif] text-xl md:text-2xl">
            Qué incluye
          </h2>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-gabi-navy/65">
            No es un solo módulo: son las piezas que el equipo usa según el momento del proceso.
          </p>

          <div className="mt-10 space-y-10">
            {MODULOS.map((bloque) => (
              <div key={bloque.grupo}>
                <h3 className="text-[11px] font-medium uppercase tracking-[0.12em] text-gabi-muted">
                  {bloque.grupo}
                </h3>
                <ul className="mt-4 divide-y divide-gabi-line border border-gabi-line bg-white">
                  {bloque.items.map((item) => (
                    <li key={item.nombre} className="px-4 py-4 md:px-5">
                      <p className="text-sm font-semibold text-gabi-navy">{item.nombre}</p>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-gabi-navy/60">
                        {item.detalle}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Equipos */}
      <section
        id="equipos"
        className="border-t border-gabi-line bg-gabi-surface px-5 py-14 md:px-8 md:py-16"
      >
        <div className="mx-auto max-w-3xl">
          <h2 className="font-[Georgia,'Times_New_Roman',serif] text-xl md:text-2xl">
            Quién lo usa
          </h2>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <article className="border border-gabi-line bg-white p-5">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-gabi-muted">
                Asesor
              </p>
              <p className="mt-3 text-sm leading-relaxed text-gabi-navy/70">
                Recorrido con el cliente, cotización en sitio, consulta de disponibilidad y sus
                propios leads. Entra con PIN desde tablet o celular.
              </p>
            </article>
            <article className="border border-gabi-line bg-white p-5">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-gabi-muted">
                Gerencia
              </p>
              <p className="mt-3 text-sm leading-relaxed text-gabi-navy/70">
                Panel administrativo: todos los leads, sembrado, apartados, expedientes, campañas y
                métricas por desarrollo.
              </p>
            </article>
            <article className="border border-gabi-line bg-white p-5">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-gabi-muted">
                Dirección / producto
              </p>
              <p className="mt-3 text-sm leading-relaxed text-gabi-navy/70">
                Estudios de mercado, comparativos del corredor y simuladores para definir precio,
                metraje y esquemas de pago con datos reales.
              </p>
            </article>
          </div>

          <div className="mt-8 border border-gabi-line bg-white p-5">
            <p className="text-sm leading-relaxed text-gabi-navy/70">
              <strong className="font-medium text-gabi-navy">Sin conexión en showroom:</strong> el
              asesor puede precargar documentos e inventario antes de la visita. Los leads se guardan
              en el dispositivo y se sincronizan al volver el internet.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-gabi-line px-5 py-14 md:px-8 md:py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-[Georgia,'Times_New_Roman',serif] text-xl md:text-2xl">
            Acceso
          </h2>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-gabi-navy/70">
            gabi es de uso interno para equipos comerciales con credenciales. Si ya tienes acceso,
            entra por el portal.
          </p>
          <div className="mt-6">
            <Link
              href="/portal"
              className="inline-flex items-center gap-2 border border-gabi-navy/15 bg-white px-4 py-2.5 text-sm font-medium text-gabi-navy transition hover:border-gabi-navy/30"
            >
              Ir al portal
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-gabi-line bg-gabi-surface px-5 py-10 md:px-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-gabi-navy">App en tablet</p>
            <p className="mt-1 text-[13px] text-gabi-navy/55">
              Quien ya tiene acceso puede instalar gabi en el dispositivo de showroom.
            </p>
          </div>
          <InstallGabiApp variant="compact" />
        </div>
      </section>

      <footer className="border-t border-gabi-line px-5 py-10 md:px-8">
        <div className="mx-auto max-w-3xl">
          <GabiLogo variant="platform" />
          <p className="mt-4 max-w-md text-[13px] leading-relaxed text-gabi-navy/50">
            Plataforma comercial para comercializadoras inmobiliarias. Recorrido, cotización, CRM,
            sembrado y análisis de mercado en un solo lugar.
          </p>
          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <Link href="/portal" className="text-gabi-navy/55 hover:text-gabi-navy">
              Portal
            </Link>
            <a href="mailto:hola@gabi.mx" className="text-gabi-navy/55 hover:text-gabi-navy">
              hola@gabi.mx
            </a>
          </div>
          <p className="mt-8 border-t border-gabi-line pt-6 text-xs text-gabi-navy/40">
            © {new Date().getFullYear()} gabi
          </p>
        </div>
      </footer>
    </main>
  );
}
