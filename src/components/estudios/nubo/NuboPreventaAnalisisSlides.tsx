"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { BbrHabitareaLogo } from "@/components/brand/BbrHabitareaLogo";
import { NuboPublicidadSlide } from "@/components/estudios/nubo/NuboPublicidadSlide";
import {
  PropuestaSlideDeck,
  SlideCanvas,
  type PropuestaSlide,
} from "@/components/propuestas/PropuestaSlideDeck";
import {
  getDefaultNuboEstudioContenido,
  getDefaultNuboEstudioMedia,
} from "@/lib/estudios/nubo-estudio-defaults";
import type { NuboEstudioContenido, NuboEstudioMedia } from "@/lib/estudios/nubo-estudio-types";
import { propuestaSlide as t } from "@/lib/propuestas/slide-theme";

function SlideFigure({
  src,
  alt,
  fit = "contain",
  aspect = "16/10",
}: {
  src: string;
  alt: string;
  fit?: "contain" | "cover";
  aspect?: "16/10" | "4/3";
}) {
  return (
    <div
      className={`relative overflow-hidden border border-slate-200 bg-slate-950 ${
        aspect === "4/3" ? "aspect-[4/3]" : "aspect-[16/10]"
      }`}
    >
      <Image
        src={src}
        alt={alt}
        fill
        className={fit === "cover" ? "object-cover" : "object-contain"}
        unoptimized
      />
    </div>
  );
}

function CondicionSlide({
  num,
  titulo,
  hoy,
  recomendacion,
  paraArrancar,
  visual,
  footer,
}: {
  num: string;
  titulo: string;
  hoy: string;
  recomendacion: string;
  paraArrancar: readonly string[];
  visual: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <SlideCanvas className="!py-6 md:!py-8">
      <div className="mb-6 flex items-baseline gap-4 border-b border-slate-200 pb-5">
        <span
          className={`font-[Georgia,'Times_New_Roman',serif] text-3xl tabular-nums text-slate-300 md:text-4xl`}
        >
          {num}
        </span>
        <div>
          <h2 className={`text-2xl md:text-[1.75rem] ${t.title}`}>{titulo}</h2>
          <p className={`mt-1 text-[13px] uppercase tracking-[0.12em] text-slate-400`}>
            Condición mínima para preventa
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div>{visual}</div>
        <div className="space-y-5">
          <div>
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-slate-400">
              Hoy
            </p>
            <p className={`text-[15px] leading-relaxed ${t.body}`}>{hoy}</p>
          </div>
          <div className="border-l-2 border-slate-900 pl-4">
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-slate-400">
              Recomendación BBR
            </p>
            <p className={`text-[15px] leading-relaxed ${t.bodyStrong}`}>{recomendacion}</p>
          </div>
          <div>
            <p className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.1em] text-slate-400">
              Para arrancar se necesita
            </p>
            <ul className={`space-y-2 text-[14px] leading-relaxed ${t.body}`}>
              {paraArrancar.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-2 h-px w-3 shrink-0 bg-slate-300" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      {footer ? <div className="mt-6 border-t border-slate-100 pt-5">{footer}</div> : null}
    </SlideCanvas>
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
        <div className="propuesta-slide-root flex h-full min-h-0 w-full flex-1 flex-col justify-center bg-white px-6 py-10 md:px-14">
          <div className="propuesta-slide-inner mx-auto w-full max-w-5xl">
            <BbrHabitareaLogo height={34} />
            <p className={`mt-12 text-[11px] uppercase tracking-[0.18em] ${t.body}`}>
              {elaboradoPor} · Asesoría comercial
            </p>
            <h1 className={`mt-6 text-[2.75rem] font-normal leading-tight tracking-tight md:text-6xl ${t.title}`}>
              {titulo}
            </h1>
            <p className={`mt-4 max-w-xl text-xl leading-snug ${t.bodyStrong}`}>{subtitulo}</p>
            <p className={`mt-2 text-[15px] ${t.body}`}>{ubicacion}</p>
            <p className={`mt-10 text-sm ${t.body}`}>{fecha}</p>
          </div>
        </div>
      ),
    },
    {
      id: "diagnostico",
      label: "Diagnóstico",
      content: (
        <SlideCanvas className="!py-6 md:!py-8">
          <h2 className={`text-2xl md:text-[1.75rem] ${t.title}`}>{diagnostico.titulo}</h2>
          <p className={`mt-4 max-w-3xl text-[16px] leading-relaxed ${t.body}`}>
            {diagnostico.contexto}
          </p>
          <p className={`mt-2 max-w-3xl text-[14px] leading-relaxed ${t.bodyStrong}`}>
            {diagnostico.escenario}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {condiciones.map((c) => (
              <div key={c.num} className="border border-slate-200 bg-slate-50/60 px-5 py-5">
                <span className={`font-[Georgia,'Times_New_Roman',serif] text-2xl text-slate-300`}>
                  {c.num}
                </span>
                <p className={`mt-2 text-[16px] ${t.bodyStrong}`}>{c.titulo}</p>
                <p className={`mt-2 text-[14px] leading-relaxed ${t.body}`}>{c.detalle}</p>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <SlideFigure src={media.ubicacionSitio} alt="Ubicación del proyecto NUBO" />
            <p className={`mt-4 text-[13px] ${t.body}`}>{planos.ubicacionSitio}</p>
          </div>

          <p className={`mt-6 max-w-3xl border-l-2 border-slate-900 pl-4 text-[15px] leading-relaxed ${t.bodyStrong}`}>
            {diagnostico.cierre}
          </p>
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
          visual={
            <p className={`text-[15px] leading-relaxed ${t.body}`}>{accesos.ubicacionEnPlano}</p>
          }
          footer={
            <div>
              <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.1em] text-slate-400">
                Referencias · nivel buscado
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {media.accesosRef.map((ref) => (
                  <figure key={ref.src}>
                    <SlideFigure src={ref.src} alt={ref.nombre} fit="cover" />
                    <figcaption className={`mt-2 text-[13px] ${t.body}`}>
                      <span className={t.bodyStrong}>{ref.nombre}.</span> {ref.detalle}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
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
          visual={
            <div className="space-y-3">
              <SlideFigure
                src={media.hotelTaboadaActual}
                alt="Hotel Hacienda Taboada — situación actual"
                fit="cover"
                aspect="4/3"
              />
              <p className={`text-[13px] ${t.body}`}>{hotel.fotoActualCaption}</p>
              <p className={`text-[13px] ${t.body}`}>{hotel.ubicacionEnPlano}</p>
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
          visual={
            <p className={`text-[15px] leading-relaxed ${t.body}`}>
              {restaurante.ubicacionEnPlano}
            </p>
          }
          footer={
            <div>
              <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.1em] text-slate-400">
                Look & feel · {restaurante.referenciasConcepto[0]?.nombre}
              </p>
              <p className={`mb-4 text-[13px] ${t.body}`}>{restaurante.lookAndFeel}</p>
              <div className="grid gap-4 sm:grid-cols-2">
                {media.restauranteLookAndFeel.map((ref) => (
                  <figure key={ref.src}>
                    <SlideFigure src={ref.src} alt={`Referencia ${ref.nombre}`} fit="cover" />
                    <figcaption className={`mt-2 text-[13px] ${t.body}`}>{ref.detalle}</figcaption>
                  </figure>
                ))}
              </div>
              <p className={`mt-4 text-[13px] ${t.body}`}>
                <span className={t.bodyStrong}>{restaurante.referenciasConcepto[1]?.nombre}</span> —{" "}
                {restaurante.referenciasConcepto[1]?.detalle}
              </p>
            </div>
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/estudios/nubo/contenido");
        const data = (await res.json()) as {
          contenido?: NuboEstudioContenido;
          media?: NuboEstudioMedia;
        };
        if (!cancelled && res.ok) {
          if (data.contenido) setContenido(data.contenido);
          if (data.media) setMedia(data.media);
        }
      } catch {
        /* fallback estático */
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
    <>
      <PropuestaSlideDeck
        titulo={`${contenido.meta.titulo} · ${contenido.meta.subtitulo}`}
        slides={slides}
        backHref="/estudios"
        backLabel="Estudios"
      />
      <p className="gabi-no-print pb-2 text-center text-[11px] text-slate-400">
        <Link
          href="/estudios/nubo/editar"
          className="font-medium text-slate-500 underline-offset-2 hover:text-[#201044] hover:underline"
        >
          Editar estudio
        </Link>
        {" · "}
        {contenido.meta.clasificacion} · {contenido.meta.elaboradoPor}
      </p>
    </>
  );
}
