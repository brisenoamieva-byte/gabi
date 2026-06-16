"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2 } from "lucide-react";
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
import { refitAllPropuestaSlides } from "@/lib/propuestas/propuesta-slide-fit";
import { propuestaSlide as t } from "@/lib/propuestas/slide-theme";

/** Escala tipográfica compartida — legible en desktop sin depender del auto-scale. */
const nuboType = {
  h1: `text-4xl font-normal leading-tight tracking-tight sm:text-5xl md:text-6xl ${t.title}`,
  h2: `text-2xl leading-tight sm:text-[1.875rem] md:text-[2.125rem] ${t.title}`,
  lead: `text-base leading-relaxed md:text-lg ${t.body}`,
  body: `text-[15px] leading-relaxed md:text-[17px] ${t.body}`,
  bodyStrong: `text-[15px] leading-relaxed md:text-[17px] ${t.bodyStrong}`,
  small: `text-sm leading-snug md:text-[15px] ${t.body}`,
  label: "text-[11px] font-bold uppercase tracking-[0.14em] text-[#5a9a32] md:text-xs",
  labelMuted: "text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400 md:text-xs",
  cardTitle: `text-base font-semibold md:text-lg ${t.bodyStrong}`,
  cardBody: `text-sm leading-relaxed md:text-base ${t.body}`,
};

const nuboSlideBrand = <BbrHabitareaSlideMark />;

function SectionLabel({ children }: { children: ReactNode }) {
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
    <section className="mt-6 border-t border-slate-100 pt-5">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <h3 className={nuboType.labelMuted}>{title}</h3>
        {subtitle ? <p className={`max-w-xl ${nuboType.small}`}>{subtitle}</p> : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((ref) => (
          <figure key={ref.src} className="overflow-hidden rounded-xl border border-slate-200/80 shadow-sm">
            <div className="relative aspect-[16/10] sm:aspect-[5/3]">
              <Image
                src={ref.src}
                alt={ref.nombre}
                fill
                className="object-cover"
                unoptimized
                onLoad={() => requestAnimationFrame(refitAllPropuestaSlides)}
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-transparent px-4 pb-3 pt-12">
                <p className="text-sm font-semibold text-white md:text-base">{ref.nombre}</p>
                <p className="mt-0.5 text-xs leading-snug text-white/80 md:text-sm">{ref.detalle}</p>
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
      <article className="border-l-2 border-slate-200 pl-4">
        <SectionLabel>Hoy</SectionLabel>
        <p className={nuboType.body}>{hoy}</p>
      </article>
      <article className="rounded-r-xl border-l-[3px] border-[#6cc24a] bg-gradient-to-br from-[#6cc24a]/[0.07] to-transparent py-1 pl-4 pr-2">
        <SectionLabel>Recomendación BBR</SectionLabel>
        <p className={nuboType.bodyStrong}>{recomendacion}</p>
      </article>
    </div>
  );

  const checklist = (
    <article className="rounded-xl bg-slate-900 px-4 py-4 sm:px-5">
      <p className={`mb-3 ${nuboType.label}`}>Para arrancar se necesita</p>
      <ul
        className={`grid gap-2.5 ${stacked ? "grid-cols-1" : "sm:grid-cols-2"}`}
      >
        {paraArrancar.map((item) => (
          <li key={item} className={`flex gap-2.5 ${nuboType.small} text-slate-200`}>
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#6cc24a]" />
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
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-900 font-[Georgia,'Times_New_Roman',serif] text-xl tabular-nums text-white md:h-14 md:w-14 md:text-2xl">
          {num}
        </div>
        <div className="min-w-0 pt-0.5">
          <h2 className={nuboType.h2}>{titulo}</h2>
          <p className={`mt-1.5 ${nuboType.label}`}>Condición mínima para preventa</p>
        </div>
      </div>

      {ubicacion ? (
        <p className={`mb-6 border-y border-slate-100 py-3 md:mb-7 ${nuboType.bodyStrong}`}>
          <span className="mr-2 font-bold text-[#6cc24a]">Ubicación</span>
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
    <article className="rounded-xl border border-slate-200/90 bg-white px-5 py-5 shadow-sm shadow-slate-900/[0.03] md:px-6 md:py-6">
      <span className="font-[Georgia,'Times_New_Roman',serif] text-3xl tabular-nums text-slate-200 md:text-4xl">
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
): PropuestaSlide[] {
  const { meta, diagnostico, condiciones, planos, accesos, hotel, restaurante } = contenido;
  const { titulo, subtitulo, ubicacion, fecha, elaboradoPor } = meta;

  return [
    {
      id: "portada",
      label: "Portada",
      content: (
        <div className="propuesta-slide-root relative flex h-full min-h-0 w-full flex-1 flex-col justify-center overflow-hidden bg-white px-4 py-5 sm:px-6 sm:py-8 md:px-14 md:py-10">
          <BbrHabitareaSlideMark height={26} />
          <div className="propuesta-slide-inner mx-auto w-full max-w-5xl">
            <BbrHabitareaLogo height={42} priority />
            <p className={`mt-5 sm:mt-8 md:mt-10 ${nuboType.labelMuted}`}>
              {elaboradoPor} · Asesoría comercial
            </p>
            <h1 className={`mt-3 sm:mt-5 md:mt-6 ${nuboType.h1}`}>{titulo}</h1>
            <p className={`mt-2 max-w-xl sm:mt-3 md:mt-4 ${nuboType.lead} ${t.bodyStrong}`}>
              {subtitulo}
            </p>
            <p className={`mt-1.5 sm:mt-2 ${nuboType.body}`}>{ubicacion}</p>
            <p className={`mt-6 sm:mt-8 md:mt-10 ${nuboType.small}`}>{fecha}</p>
          </div>
        </div>
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

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {condiciones.map((c) => (
              <CondicionOverviewCard key={c.num} num={c.num} titulo={c.titulo} detalle={c.detalle} />
            ))}
          </div>

          <blockquote
            className={`mt-8 max-w-4xl border-l-[3px] border-slate-900 pl-5 md:mt-10 ${nuboType.bodyStrong}`}
          >
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
                  <span className={t.bodyStrong}>{restaurante.referenciasConcepto[1].nombre}</span> —{" "}
                  {restaurante.referenciasConcepto[1].detalle}
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
      content: <NuboPublicidadSlide />,
    },
  ];
}

export function NuboPreventaAnalisisSlides() {
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
    () => buildNuboPreventaSlides(contenido, media),
    [contenido, media],
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-2 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando estudio…
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {loadError ? (
        <p className="gabi-no-print shrink-0 px-4 py-2 text-center text-xs text-amber-800">{loadError}</p>
      ) : null}
      {publishMeta && !publishMeta.contenidoPublicado ? (
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
        embedded
      />
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
    </div>
  );
}
