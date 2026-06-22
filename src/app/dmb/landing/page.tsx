import Link from "next/link";
import { ArrowRight, BarChart3, BriefcaseBusiness, MapPin, Phone } from "lucide-react";
import { DmbLogo, DmbTagline } from "@/components/brand/DmbLogo";
import { DMB_CONTACT, DMB_ECOSYSTEM } from "@/lib/dmb/ecosystem";
import { OPERATOR_LOGIN_PATH } from "@/lib/gabi/operator";
import { dmbHubPath } from "@/lib/dmb/routes";

const SERVICIOS = [
  "Estrategia comercial integral",
  "Pricing inteligente",
  "Producto y mix de unidades",
  "Canales y ventas",
  "Marketing y lanzamientos",
] as const;

const PASOS = [
  { n: "1", titulo: "Diagnóstico", desc: "Mercado, competencia, pricing y absorción." },
  { n: "2", titulo: "Estrategia", desc: "Posicionamiento, mix, curva de precios y plan comercial." },
  { n: "3", titulo: "Implementación", desc: "Lanzamiento, entrenamiento y activación de brokers." },
  { n: "4", titulo: "Monitoreo", desc: "Tablero ejecutivo, ajustes dinámicos e informes." },
] as const;

const iconFor = (id: string) => {
  if (id === "propuestas") return BriefcaseBusiness;
  if (id === "estudios") return BarChart3;
  if (id === "corredor") return MapPin;
  return ArrowRight;
};

export default function DmbLandingPage() {
  const modulosPrivados = DMB_ECOSYSTEM.filter((m) => !["centro", "admin"].includes(m.id));

  return (
    <main className="min-h-screen bg-dmb-surface text-dmb-ink">
      <header className="border-b border-dmb-line bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-5 md:px-10">
          <div>
            <DmbLogo variant="header" />
            <DmbTagline className="mt-1" />
          </div>
          <Link
            href={`${OPERATOR_LOGIN_PATH}?next=${encodeURIComponent(dmbHubPath())}`}
            className="hidden rounded-xl border border-dmb-line px-4 py-2 text-sm font-semibold text-dmb-ink transition hover:bg-dmb-surface sm:inline-flex"
          >
            Acceso equipo
          </Link>
        </div>
      </header>

      <section className="border-b border-dmb-line bg-white">
        <div className="mx-auto max-w-5xl px-5 py-14 md:px-10 md:py-20">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-dmb-accent">
            Consultoría · Comercialización
          </p>
          <h1 className="mt-4 max-w-3xl font-[Georgia,'Times_New_Roman',serif] text-3xl font-black leading-tight md:text-5xl">
            Transformamos proyectos inmobiliarios en historias de éxito comercial
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-dmb-muted">
            Maximizamos el valor comercial de tu proyecto, aceleramos la absorción y mejoramos tu
            rentabilidad con análisis de mercado, estrategia, pricing y ejecución comercial.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={`mailto:${DMB_CONTACT.email}?subject=Diagnóstico%20comercial`}
              className="inline-flex items-center gap-2 rounded-xl bg-dmb-ink px-5 py-3 text-sm font-bold text-white transition hover:bg-dmb-charcoal"
            >
              Agenda un diagnóstico
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href={`tel:${DMB_CONTACT.phone.replace(/\s/g, "")}`}
              className="inline-flex items-center gap-2 rounded-xl border border-dmb-line bg-white px-5 py-3 text-sm font-semibold text-dmb-ink"
            >
              <Phone className="h-4 w-4" />
              {DMB_CONTACT.phone}
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-14 md:px-10">
        <h2 className="text-xl font-black md:text-2xl">Qué hacemos</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICIOS.map((item) => (
            <li
              key={item}
              className="rounded-xl border border-dmb-line bg-white px-4 py-3 text-sm font-medium text-dmb-charcoal"
            >
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="border-y border-dmb-line bg-white">
        <div className="mx-auto max-w-5xl px-5 py-14 md:px-10">
          <h2 className="text-xl font-black md:text-2xl">Cómo trabajamos</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PASOS.map((paso) => (
              <div key={paso.n} className="rounded-2xl border border-dmb-line bg-dmb-surface p-5">
                <span className="text-2xl font-black text-dmb-accent">{paso.n}</span>
                <h3 className="mt-2 font-bold text-dmb-ink">{paso.titulo}</h3>
                <p className="mt-1 text-sm text-dmb-muted">{paso.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-14 md:px-10">
        <h2 className="text-xl font-black md:text-2xl">Herramientas internas</h2>
        <p className="mt-2 max-w-2xl text-sm text-dmb-muted">
          Propuestas, estudios de mercado y corredor sur — acceso privado para el equipo DMB.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {modulosPrivados.map((modulo) => {
            const Icon = iconFor(modulo.id);
            return (
              <Link
                key={modulo.id}
                href={`${OPERATOR_LOGIN_PATH}?next=${encodeURIComponent(modulo.href)}`}
                className="group rounded-2xl border border-dmb-line bg-white p-5 transition hover:border-dmb-accent/50 hover:shadow-md"
              >
                <Icon className="h-5 w-5 text-dmb-accent" />
                <h3 className="mt-3 font-bold text-dmb-ink">{modulo.titulo}</h3>
                <p className="mt-1 text-xs text-dmb-muted">{modulo.descripcion}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <footer className="border-t border-dmb-line bg-dmb-ink text-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-5 py-8 md:px-10">
          <div>
            <p className="text-lg font-black">DMB</p>
            <p className="text-sm text-white/70">Consultoría comercial inmobiliaria</p>
          </div>
          <div className="text-sm text-white/80">
            <a href={`mailto:${DMB_CONTACT.email}`} className="block hover:text-white">
              {DMB_CONTACT.email}
            </a>
            <a
              href={`https://${DMB_CONTACT.web}`}
              className="mt-1 block hover:text-white"
            >
              {DMB_CONTACT.web}
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
