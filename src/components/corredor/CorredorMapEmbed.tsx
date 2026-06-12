"use client";

type CorredorMapEmbedProps = {
  lat: number;
  lng: number;
  zoom?: number;
  className?: string;
  /** Evita pan/zoom en el iframe para mantener alineados los pines con logo. */
  lockView?: boolean;
};

/** Mapa embebido sin Maps JavaScript API — respaldo cuando falla la key o restricciones. */
export function CorredorMapEmbed({
  lat,
  lng,
  zoom = 11,
  className = "",
  lockView = false,
}: CorredorMapEmbedProps) {
  const src = `https://maps.google.com/maps?q=${lat},${lng}&z=${zoom}&output=embed`;

  return (
    <div
      className={`relative h-72 overflow-hidden rounded-2xl border border-[#201044]/10 shadow-sm md:h-96 ${className}`}
    >
      <iframe
        title="Mapa corredor sur"
        src={src}
        className={`absolute inset-0 h-full w-full border-0 ${lockView ? "pointer-events-none" : ""}`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen={!lockView}
      />
    </div>
  );
}
