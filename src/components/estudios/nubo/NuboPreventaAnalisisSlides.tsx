"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { BbrHabitareaLogo, BbrHabitareaSlideMark } from "@/components/brand/BbrHabitareaLogo";
import { NuboPublicidadSlide } from "@/components/estudios/nubo/NuboPublicidadSlide";
import { NuboUbicacionSitioFigure } from "@/components/estudios/nubo/NuboUbicacionSitioFigure";
import {
  PropuestaSlideDeck,
  SlideCanvas,
  type PropuestaSlide,
} from "@/components/propuestas/PropuestaSlideDeck";
import {
  getDefaultNuboEstudioContenido,
  getDefaultNuboEstudioMedia,
} from "@/lib/estudios/nubo-estudio-defaults";
import type { NuboEstudioContenido, NuboEstudioMedia, NuboEstudioPublishMeta } from "@/lib/estudios/nubo-estudio-types";
import { NUBO_PREVENTA_CIERRE, NUBO_PREVENTA_KPIS } from "@/lib/estudios/nubo-preventa-content";
import { nuboSurface, nuboType } from "@/lib/estudios/nubo-slide-theme";
import { refitAllPropuestaSlides } from "@/lib/propuestas/propuesta-slide-fit";

const nuboSlideBrand = <BbrHabitareaSlideMark />;

const fadeUp = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
};

function NuboKpiStrip() {
  return (
    <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {NUBO_PREVENTA_KPIS.map((kpi, index) => (
        <article key={kpi.label} className={nuboSurface.kpiStrip}>
          <p className={nuboType.labelMuted}>{kpi.label}</p>
          <p
            className={`mt-1.5 font-[Georgia,'Times_New_Roman',serif] text-2xl tabular-nums text-slate-900 md:text-[1.75rem] ${
              index === 3 ? "text-[#3f7a24]" : ""
            }`}
          >
            {kpi.value}
          </p>
        </article>
      ))}
    </div>
  );
}

function NuboPortadaSlide({
  titulo,
  subtitulo,
  ubicacion,
  fecha,
  elaboradoPor,
  clasificacion,
}: {
  titulo: string;
  subtitulo: string;
  ubicacion: string;
  fecha: string;
  elaboradoPor: string;
  clasificacion: string;
}) {
  return (
    <div className="nubo-portada-shell propuesta-slide-root relative flex h-full min-h-0 w-full flex-1 flex-col justify-center overflow-hidden px-4 py-5 sm:px-6 sm:py-8 md:px-14 md:py-10">
      <div className="pointer-events-none absolute bottom-0 left-0 h-1 w-28 bg-[#6cc24a] md:w-36" aria-hidden />
      <div className="propuesta-slide-inner relative z-10 mx-auto w-full max-w-5xl">
        <motion.div {...fadeUp} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
          <BbrHabitareaLogo height={44} priority />
        </motion.div>
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.45, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
          className="mt-5 flex flex-wrap items-center gap-2 sm:mt-8 md:mt-10"
        >
          <span className={nuboSurface.portadaBadge}>{clasificacion}</span>
          <span className={`${nuboType.labelMuted} !mb-0`}>{elaboradoPor}</span>
        </motion.div>
        <motion.h1
          {...fadeUp}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className={`mt-5 sm:mt-6 md:mt-8 ${nuboType.h1}`}
        >
          {titulo}
        </motion.h1>
        <motion.p
          {...fadeUp}
          transition={{ duration: 0.5, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
          className={`mt-2 max-w-2xl sm:mt-3 md:mt-4 ${nuboType.lead}`}
        >
          {subtitulo}
        </motion.p>
        <motion.p
          {...fadeUp}
          transition={{ duration: 0.5, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
          className={`mt-1.5 sm:mt-2 ${nuboType.body}`}
        >
          {ubicacion}
        </motion.p>
        <motion.p
          {...fadeUp}
          transition={{ duration: 0.5, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className={`mt-6 sm:mt-8 md:mt-10 ${nuboType.small}`}
        >
          {fecha}
        </motion.p>
      </div>
    </div>
  );
}

function NuboCierreSlide({
  titulo,
  mensaje,
  nota,
  fecha,
  cliente,
}: {
  titulo: string;
  mensaje: string;
  nota: string;
  fecha: string;
  cliente: string;
}) {
  return (
    <div className="nubo-cierre-shell propuesta-slide-root flex h-full min-h-0 w-full flex-1 flex-col justify-center overflow-hidden border-t-4 border-[#6cc24a] px-6 py-8 md:px-12 md:py-10">
      <div className="propuesta-slide-inner mx-auto w-full max-w-3xl text-center">
        <BbrHabitareaLogo height={40} className="mx-auto" />
        <p className={`mt-8 ${nuboType.labelMuted}`}>Síntesis del estudio</p>
        <h2 className={`mt-3 ${nuboType.h2}`}>{titulo}</h2>
        <p className={`mx-auto mt-5 max-w-2xl ${nuboType.lead}`}>{mensaje}</p>
        <p className={`mt-8 ${nuboType.body}`}>{cliente}</p>
        <p className={`mt-2 ${nuboType.small}`}>{fecha}</p>
        <p className={`mt-10 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400`}>
          {nota}
        </p>
      </div>
    </div>
  );
}

function SectionLabel({ children, onDark = false }: { children: ReactNode; onDark?: boolean }) {
  if (onDark) {
    return <p className="nubo-panel-dark__label">{children}</p>;
  }
  return <p className={`mb-2 ${nuboType.label}`}>{children}</p>;
}

function SlideFigure({
  src,
  alt,
  fit = "contain",
  aspect = "16/10",
  variant = "default",
}: {
  src: string;
  alt: string;
  fit?: "contain" | "cover";
  aspect?: "16/10" | "4/3" | "5/3" | "3/2";
  variant?: "default" | "gallery";
}) {
  const aspectClass =
    aspect === "4/3" ? "aspect-[4/3]"
    : aspect === "5/3" ? "aspect-[5/3]"
    : aspect === "3/2" ? "aspect-[3/2]"
    : "aspect-[16/10]";

  return (
    <div
      className={`relative overflow-hidden bg-slate-950 ${aspectClass} ${
        variant === "gallery" ?
          "rounded-xl border border-slate-200/80 shadow-md shadow-slate-900/10"
        : "rounded-sm border border-slate-200"
      }`}
    >
      <Image
        src={src}
        alt={alt}
        fill
        loading="eager"
        className={`${fit === "cover" ? "object-cover" : "object-contain"} ${
          variant === "gallery" ? "transition duration-500 hover:scale-[1.02]" : ""
        }`}
        unoptimized
        onLoad={() => requestAnimationFrame(refitAllPropuestaSlides)}
      />
    </div>
  );
}

function ReferenceGallery({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle?: string;
  items: readonly { src: string; nombre: string; detalle: string }[];
}) {
  return (
    <section className={`mt-6 ${nuboSurface.sectionDivider}`}>
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <h3 className={nuboType.labelMuted}>{title}</h3>
        {subtitle ? <p className={`max-w-xl ${nuboType.small}`}>{subtitle}</p> : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((ref) => (
          <figure
            key={ref.src}
            className="overflow-hidden rounded-xl border border-slate-200/80 shadow-md shadow-slate-900/10 transition-shadow hover:shadow-lg"
          >
            <div className="relative aspect-[16/10] sm:aspect-[5/3]">
              <Image
                src={ref.src}
                alt={ref.nombre}
                fill
                loading="eager"
                className="object-cover"
                unoptimized
                onLoad={() => requestAnimationFrame(refitAllPropuestaSlides)}
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-transparent px-4 pb-3 pt-12">
                {ref.nombre ? (
                  <p className="text-sm font-semibold text-white md:text-base">{ref.nombre}</p>
                ) : null}
                <p className={`text-xs leading-snug text-white/80 md:text-sm ${ref.nombre ? "mt-0.5" : ""}`}>
                  {ref.detalle}
                </p>
              </div>
            </div>
          </figure>
        ))}
      </div>
    </section>
  );
}

function CondicionTextBlocks({
  hoy,
  recomendacion,
  paraArrancar,
  stacked = false,
}: {
  hoy: string;
  recomendacion: string;
  paraArrancar: readonly string[];
  stacked?: boolean;
}) {
  const narrative = (
    <div className={`grid gap-5 ${stacked ? "grid-cols-1" : "lg:grid-cols-2"}`}>
      <article className={nuboSurface.narrativeBlock}>
        <SectionLabel>Hoy</SectionLabel>
        <p className={nuboType.body}>{hoy}</p>
      </article>
      <article className={nuboSurface.accentBlock}>
        <SectionLabel>Recomendación BBR</SectionLabel>
        <p className={nuboType.bodyStrong}>{recomendacion}</p>
      </article>
    </div>
  );

  const checklist = (
    <article className={nuboSurface.panelDark}>
      <SectionLabel onDark>Para arrancar se necesita</SectionLabel>
      <ul className={`grid gap-2.5 ${stacked ? "grid-cols-1" : "sm:grid-cols-2"}`}>
        {paraArrancar.map((item) => (
          <li key={item} className="nubo-panel-dark__item flex gap-2.5">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#6cc24a]" aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </article>
  );

  return (
    <div className="space-y-5">
      {narrative}
      {checklist}
    </div>
  );
}

function CondicionSlide({
  num,
  titulo,
  hoy,
  recomendacion,
  paraArrancar,
  ubicacion,
  visual,
  footer,
}: {
  num: string;
  titulo: string;
  hoy: string;
  recomendacion: string;
  paraArrancar: readonly string[];
  ubicacion?: string;
  visual?: ReactNode;
  footer?: ReactNode;
}) {
  const hasMedia = Boolean(visual);

  return (
    <SlideCanvas align="start" className="!py-5 md:!py-7" brandMark={nuboSlideBrand}>
      <div className="mb-6 flex items-start gap-4 md:mb-7">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-900 font-[Georgia,'Times_New_Roman',serif] text-xl tabular-nums text-white ring-2 ring-[#6cc24a]/25 md:h-14 md:w-14 md:text-2xl">
          {num}
        </div>
        <div className="min-w-0 pt-0.5">
          <h2 className={nuboType.h2}>{titulo}</h2>
          <p className={`mt-1.5 ${nuboType.label}`}>Condición mínima para preventa</p>
        </div>
      </div>

      {ubicacion ? (
        <p className={`mb-6 md:mb-7 ${nuboSurface.ubicacionBar} ${nuboType.bodyStrong}`}>
          <span className={`mr-2 ${nuboType.accentInline}`}>Ubicación</span>
          {ubicacion}
        </p>
      ) : null}

      {hasMedia ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] lg:items-start">
          <div className="space-y-2">{visual}</div>
          <CondicionTextBlocks
            hoy={hoy}
            recomendacion={recomendacion}
            paraArrancar={paraArrancar}
            stacked
          />
        </div>
      ) : (
        <CondicionTextBlocks hoy={hoy} recomendacion={recomendacion} paraArrancar={paraArrancar} />
      )}

      {footer}
    </SlideCanvas>
  );
}

function CondicionOverviewCard({
  num,
  titulo,
  detalle,
}: {
  num: string;
  titulo: string;
  detalle: string;
}) {
  return (
    <article className={`${nuboSurface.cardAccent} px-5 py-5 md:px-6 md:py-6`}>
      <span className="font-[Georgia,'Times_New_Roman',serif] text-3xl tabular-nums text-[#6cc24a]/35 md:text-4xl">
        {num}
      </span>
      <p className={`mt-3 ${nuboType.cardTitle}`}>{titulo}</p>
      <p className={`mt-2 ${nuboType.cardBody}`}>{detalle}</p>
    </article>
  );
}

function buildNuboPreventaSlides(
  contenido: NuboEstudioContenido,
  media: NuboEstudioMedia,
  options?: { showOperatorLinks?: boolean },
): PropuestaSlide[] {
  const showOperatorLinks = options?.showOperatorLinks ?? true;
  const { meta, diagnostico, condiciones, planos, accesos, hotel, restaurante } = contenido;
  const { titulo, subtitulo, ubicacion, fecha, elaboradoPor } = meta;

  return [
    {
      id: "portada",
      label: "Portada",
      content: (
        <NuboPortadaSlide
          titulo={titulo}
          subtitulo={subtitulo}
          ubicacion={ubicacion}
          fecha={fecha}
          elaboradoPor={elaboradoPor}
          clasificacion={meta.clasificacion}
        />
      ),
    },
    {
      id: "diagnostico",
      label: "Diagnóstico",
      content: (
        <SlideCanvas align="start" className="!py-5 md:!py-7" brandMark={nuboSlideBrand}>
          <p className={nuboType.labelMuted}>Contexto comercial</p>
          <h2 className={`mt-2 ${nuboType.h2}`}>{diagnostico.titulo}</h2>
          <p className={`mt-4 max-w-4xl ${nuboType.lead}`}>{diagnostico.contexto}</p>
          <p className={`mt-3 max-w-4xl ${nuboType.bodyStrong}`}>{diagnostico.escenario}</p>

          <NuboKpiStrip />

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 md:mt-10">
            {condiciones.map((c) => (
              <CondicionOverviewCard key={c.num} num={c.num} titulo={c.titulo} detalle={c.detalle} />
            ))}
          </div>

          <blockquote
            className={`relative mt-8 max-w-4xl md:mt-10 ${nuboSurface.quoteBlock} ${nuboType.bodyStrong} pl-8`}
          >
            <span
              className="pointer-events-none absolute left-0 top-0 font-[Georgia,'Times_New_Roman',serif] text-4xl leading-none text-[#6cc24a]/40"
              aria-hidden
            >
              “
            </span>
            {diagnostico.cierre}
          </blockquote>
        </SlideCanvas>
      ),
    },
    {
      id: "ubicacion",
      label: "Ubicación",
      content: (
        <SlideCanvas align="start" className="!py-5 md:!py-7" brandMark={nuboSlideBrand}>
          <p className={nuboType.labelMuted}>Master plan</p>
          <h2 className={`mt-2 ${nuboType.h2}`}>Ubicación del sitio</h2>
          <p className={`mt-3 max-w-3xl ${nuboType.body}`}>{planos.ubicacionSitio}</p>
          <div className="mt-6 md:mt-8">
            <NuboUbicacionSitioFigure
              src={media.ubicacionSitio}
              marcadores={media.ubicacionMarcadores}
            />
          </div>
        </SlideCanvas>
      ),
    },
    {
      id: "accesos",
      label: "Acceso",
      content: (
        <CondicionSlide
          num={accesos.num}
          titulo={accesos.titulo}
          hoy={accesos.hoy}
          recomendacion={accesos.recomendacion}
          paraArrancar={accesos.paraArrancar}
          ubicacion={accesos.ubicacionEnPlano}
          footer={
            <ReferenceGallery
              title="Referencias · nivel buscado"
              items={media.accesosRef.map((ref) => ({
                src: ref.src,
                nombre: ref.nombre,
                detalle: ref.detalle,
              }))}
            />
          }
        />
      ),
    },
    {
      id: "hotel",
      label: "Hotel Taboada",
      content: (
        <CondicionSlide
          num={hotel.num}
          titulo={hotel.titulo}
          hoy={hotel.hoy}
          recomendacion={hotel.recomendacion}
          paraArrancar={hotel.paraArrancar}
          ubicacion={hotel.ubicacionEnPlano}
          visual={
            <div className="space-y-2">
              <SlideFigure
                src={media.hotelTaboadaActual}
                alt="Hotel Hacienda Taboada — situación actual"
                fit="cover"
                aspect="3/2"
                variant="gallery"
              />
              <p className={nuboType.small}>{hotel.fotoActualCaption}</p>
            </div>
          }
        />
      ),
    },
    {
      id: "restaurante",
      label: "Restaurante",
      content: (
        <CondicionSlide
          num={restaurante.num}
          titulo={restaurante.titulo}
          hoy={restaurante.hoy}
          recomendacion={restaurante.recomendacion}
          paraArrancar={restaurante.paraArrancar}
          ubicacion={restaurante.ubicacionEnPlano}
          footer={
            <>
              <ReferenceGallery
                title={`Look & feel · ${restaurante.referenciasConcepto[0]?.nombre ?? "Plantado"}`}
                subtitle={restaurante.lookAndFeel}
                items={media.restauranteLookAndFeel.map((ref) => ({
                  src: ref.src,
                  nombre: ref.nombre,
                  detalle: ref.detalle,
                }))}
              />
              {restaurante.referenciasConcepto[1] ? (
                <p className={`mt-3 ${nuboType.small}`}>
                  <span className="font-semibold text-slate-900">
                    {restaurante.referenciasConcepto[1].nombre}
                  </span>{" "}
                  — {restaurante.referenciasConcepto[1].detalle}
                </p>
              ) : null}
            </>
          }
        />
      ),
    },
    {
      id: "publicidad",
      label: "Presupuesto publicidad",
      content: <NuboPublicidadSlide showOperatorLinks={showOperatorLinks} />,
    },
    {
      id: "cierre",
      label: "Cierre",
      content: (
        <NuboCierreSlide
          titulo={NUBO_PREVENTA_CIERRE.titulo}
          mensaje={NUBO_PREVENTA_CIERRE.mensaje}
          nota={NUBO_PREVENTA_CIERRE.nota}
          fecha={fecha}
          cliente={meta.cliente}
        />
      ),
    },
  ];
}

export function NuboPreventaAnalisisSlides({
  viewerMode = "operator",
}: {
  viewerMode?: "operator" | "developer";
}) {
  const isDeveloper = viewerMode === "developer";
  const [contenido, setContenido] = useState<NuboEstudioContenido>(() =>
    getDefaultNuboEstudioContenido(),
  );
  const [media, setMedia] = useState<NuboEstudioMedia>(() => getDefaultNuboEstudioMedia());
  const [publishMeta, setPublishMeta] = useState<NuboEstudioPublishMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/estudios/nubo/contenido", { cache: "no-store" });
        const data = (await res.json()) as {
          contenido?: NuboEstudioContenido;
          media?: NuboEstudioMedia;
          meta?: NuboEstudioPublishMeta;
          error?: string;
        };
        if (!cancelled) {
          if (!res.ok) {
            setLoadError(data.error ?? "No se pudo cargar el estudio publicado.");
            return;
          }
          if (data.contenido) setContenido(data.contenido);
          if (data.media) setMedia(data.media);
          setPublishMeta(data.meta ?? null);
        }
      } catch {
        if (!cancelled) setLoadError("No se pudo cargar el estudio publicado.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const slides = useMemo(
    () =>
      buildNuboPreventaSlides(contenido, media, {
        showOperatorLinks: !isDeveloper,
      }),
    [contenido, media, isDeveloper],
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <BbrHabitareaLogo height={36} />
        <Loader2 className="h-5 w-5 animate-spin text-[#6cc24a]" />
        <div>
          <p className="text-sm font-semibold text-slate-800">NUBO · Análisis de preventa</p>
          <p className="mt-1 text-xs text-slate-500">Cargando presentación…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {loadError && !isDeveloper ? (
        <p className="gabi-no-print shrink-0 px-4 py-2 text-center text-xs text-amber-800">{loadError}</p>
      ) : null}
      {publishMeta && !publishMeta.contenidoPublicado && !isDeveloper ? (
        <p className="gabi-no-print shrink-0 px-4 py-2 text-center text-xs text-amber-800">
          Mostrando textos del archivo base. Publica desde el editor y verifica Supabase (migración
          030 + SUPABASE_SERVICE_ROLE_KEY en Vercel).
        </p>
      ) : null}
      <PropuestaSlideDeck
        key={publishMeta?.updatedAt ?? "static"}
        titulo={`${contenido.meta.titulo} · ${contenido.meta.subtitulo}`}
        slides={slides}
        backHref="/estudios"
        backLabel="Estudios"
        viewerMode={viewerMode}
        embedded
      />
      {!isDeveloper ? (
        <p className="gabi-no-print hidden shrink-0 pb-2 text-center text-[11px] text-slate-400 md:block">
          <Link
            href="/estudios/nubo/editar"
            className="font-medium text-slate-500 underline-offset-2 hover:text-[#201044] hover:underline"
          >
            Editar estudio
          </Link>
          {" · "}
          {contenido.meta.clasificacion} · {contenido.meta.elaboradoPor}
          {publishMeta?.contenidoPublicado ?
            ` · Publicado ${new Date(publishMeta.updatedAt).toLocaleString("es-MX")}`
          : " · Archivo base"}
        </p>
      ) : null}
    </div>
  );
}
