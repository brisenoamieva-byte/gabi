"use client";

import { useEffect, useState } from "react";
import {
  getDemoBookingEmbedUrl,
  getDemoBookingUrl,
  isCalendarBookingUrl,
  isDemoBookingConfigured,
} from "@/lib/site/demo-booking";
import { ScheduleDemoButton } from "@/components/ScheduleDemoButton";

export function DemoBookingEmbed() {
  const configured = isDemoBookingConfigured();
  const bookingUrl = getDemoBookingUrl();
  const [embedUrl, setEmbedUrl] = useState<string | null>(() =>
    isCalendarBookingUrl(bookingUrl) ? getDemoBookingEmbedUrl("gabi.mx") : null,
  );

  useEffect(() => {
    if (isCalendarBookingUrl(bookingUrl)) {
      setEmbedUrl(getDemoBookingEmbedUrl(window.location.hostname));
    }
  }, [bookingUrl]);

  return (
    <section id="agendar-demo" className="border-t border-gabi-line px-5 py-16 md:px-8 md:py-20">
      <div className="mx-auto max-w-3xl">
        <div className="max-w-lg">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Agenda una demo</h2>
          <p className="mt-2 text-base leading-relaxed text-gabi-navy/60">
            30 minutos para ver el flujo con un desarrollo real. Elige el horario que te quede
            bien.
          </p>
        </div>

        {embedUrl ? (
          <div className="mt-8 overflow-hidden rounded-xl border border-gabi-navy/10 bg-white">
            <iframe
              title="Agendar demo de gabi"
              src={embedUrl}
              className="min-h-[640px] w-full border-0"
              loading="lazy"
              allow="payment"
            />
          </div>
        ) : (
          <div className="mt-8 rounded-xl border border-gabi-navy/10 bg-gabi-surface p-8">
            <p className="text-sm leading-relaxed text-gabi-navy/65">
              {configured
                ? "Abre el calendario para elegir fecha y hora."
                : "Escríbenos y coordinamos una demo para tu equipo."}
            </p>
            <div className="mt-5">
              <ScheduleDemoButton variant="footer" label="Ver horarios" />
            </div>
          </div>
        )}

        {configured ? (
          <p className="mt-4 text-sm text-gabi-navy/45">
            <a
              href={bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-gabi-navy/70 underline-offset-2 hover:text-gabi-navy hover:underline"
            >
              {embedUrl ? "Abrir en pestaña nueva" : "Ir al calendario"}
            </a>
          </p>
        ) : null}
      </div>
    </section>
  );
}
