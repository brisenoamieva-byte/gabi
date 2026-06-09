"use client";

type CorredorMapEmbedProps = {
  lat: number;
  lng: number;
  zoom?: number;
  className?: string;
};

/** Mapa embebido sin Maps JavaScript API — respaldo cuando falla la key o restricciones. */
export function CorredorMapEmbed({
  lat,
  lng,
  zoom = 11,
  className = "",
}: CorredorMapEmbedProps) {
  const src = `https://maps.google.com/maps?q=${lat},${lng}&z=${zoom}&output=embed`;

  return (
    <div
      className={`relative h-72 overflow-hidden rounded-2xl border border-[#201044]/10 shadow-sm md:h-96 ${className}`}
    >
      <iframe
        title="Mapa corredor sur"
        src={src}
        className="absolute inset-0 h-full w-full border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
    </div>
  );
}
