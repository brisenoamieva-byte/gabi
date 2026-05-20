"use client";

import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import {
  getDemoBookingEmbedUrl,
  getDemoBookingUrl,
  isDemoBookingConfigured,
} from "@/lib/site/demo-booking";
import { ScheduleDemoButton } from "@/components/ScheduleDemoButton";

export function DemoBookingEmbed() {
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const configured = isDemoBookingConfigured();

  useEffect(() => {
    setEmbedUrl(getDemoBookingEmbedUrl(window.location.hostname));
  }, []);

  return (
    <section
      id="agendar-demo"
      className="border-t border-[#13315C]/8 bg-[#F8FAFC] px-5 py-20 md:px-8 md:py-24"
    >
      <div className="mx-auto max-w-4xl">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#2DD4BF]">
            Demo en vivo
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-[#13315C] md:text-4xl">
            Agenda una presentación con nuestro equipo
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-[#13315C]/65">
            Te mostramos gabi en acción: recorrido guiado, captura de prospectos y handoff al CRM.
            Elige el horario que mejor te funcione.
          </p>
        </div>

        {embedUrl ? (
          <div className="mt-10 overflow-hidden rounded-[1.75rem] border border-[#13315C]/10 bg-white shadow-lg shadow-[#13315C]/5">
            <iframe
              title="Agendar demo de gabi"
              src={embedUrl}
              className="min-h-[680px] w-full border-0"
              loading="lazy"
              allow="payment"
            />
          </div>
        ) : (
          <div className="mt-10 rounded-[1.75rem] border border-[#13315C]/10 bg-white p-8 text-center shadow-lg shadow-[#13315C]/5">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#13315C]/8 text-[#13315C]">
              <CalendarDays className="h-7 w-7" />
            </span>
            <p className="mt-5 text-base leading-relaxed text-[#13315C]/70">
              {configured
                ? "Abre el calendario para elegir fecha y hora de tu demo."
                : "Escríbenos y coordinamos una demo personalizada para tu comercializadora."}
            </p>
            <div className="mt-6">
              <ScheduleDemoButton variant="footer" label="Agendar demo" showIcon />
            </div>
          </div>
        )}

        {configured ? (
          <p className="mt-4 text-center text-sm text-[#13315C]/50">
            <a
              href={getDemoBookingUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[#13315C] underline-offset-2 hover:underline"
            >
              {embedUrl ? "Abrir calendario en una pestaña nueva" : "Ver horarios disponibles"}
            </a>
          </p>
        ) : null}
      </div>
    </section>
  );
}
