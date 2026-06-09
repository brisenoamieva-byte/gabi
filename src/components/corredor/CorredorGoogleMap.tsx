"use client";

import { useMemo } from "react";
import Link from "next/link";
import { GoogleMap, InfoWindow, Marker, useJsApiLoader } from "@react-google-maps/api";
import {
  CORREDOR_MAP_CENTER,
  getDesarrolloUbicacion,
} from "@/lib/corredor/coordinates";
import { getDesarrolloLogoUrl } from "@/lib/corredor/desarrollo-logos";
import { getGoogleMapsApiKey } from "@/lib/corredor/google-maps-config";
import { buildCorredorMarkerIcon } from "@/lib/corredor/marker-icons";
import type { CorredorDesarrollo } from "@/lib/corredor/types";
import { CorredorMapSchematic } from "@/components/corredor/CorredorMapSchematic";

type CorredorGoogleMapProps = {
  desarrollos: CorredorDesarrollo[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Un solo pin (ficha de desarrollo). */
  singleDesarrolloId?: string;
  className?: string;
};

const mapContainerStyle = { width: "100%", height: "100%" };

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: true,
  fullscreenControl: true,
  gestureHandling: "greedy" as const,
};

export function CorredorGoogleMap({
  desarrollos,
  selectedId,
  onSelect,
  singleDesarrolloId,
  className = "",
}: CorredorGoogleMapProps) {
  const apiKey = getGoogleMapsApiKey();
  const { isLoaded, loadError } = useJsApiLoader({
    id: "gabi-corredor-maps",
    googleMapsApiKey: apiKey,
  });

  const markers = useMemo(() => {
    const list = singleDesarrolloId
      ? desarrollos.filter((d) => d.id === singleDesarrolloId)
      : desarrollos;
    return list.map((d) => ({
      desarrollo: d,
      ...getDesarrolloUbicacion(d),
    }));
  }, [desarrollos, singleDesarrolloId]);

  const mapCenter = useMemo(() => {
    if (singleDesarrolloId && markers[0]) {
      return { lat: markers[0].lat, lng: markers[0].lng };
    }
    if (selectedId) {
      const selected = markers.find((m) => m.desarrollo.id === selectedId);
      if (selected) return { lat: selected.lat, lng: selected.lng };
    }
    return CORREDOR_MAP_CENTER;
  }, [markers, selectedId, singleDesarrolloId]);

  const defaultZoom = singleDesarrolloId ? 14 : selectedId ? 13 : 11;
  const hayAproximadas = markers.some((m) => m.aproximada);

  if (!apiKey || loadError) {
    return (
      <div className={className}>
        <CorredorMapSchematic
          desarrollos={desarrollos}
          selectedId={selectedId}
          onSelect={onSelect}
        />
        <p className="mt-2 text-center text-xs text-slate-500">
          {loadError
            ? "No se pudo cargar Google Maps. Revisa restricciones de dominio y que Maps JavaScript API esté activa."
            : process.env.NODE_ENV === "development"
              ? "Agrega NEXT_PUBLIC_GOOGLE_MAPS_API_KEY en .env.local y reinicia npm run dev."
              : "Falta NEXT_PUBLIC_GOOGLE_MAPS_API_KEY en Vercel (Environment Variables). Redespliega tras agregarla."}
        </p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div
        className={`flex h-72 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 md:h-96 ${className}`}
      >
        <p className="text-sm font-semibold text-slate-500">Cargando mapa…</p>
      </div>
    );
  }

  const selectedMarker = markers.find((m) => m.desarrollo.id === selectedId);

  return (
    <div className={className}>
      <div className="relative h-72 overflow-hidden rounded-2xl border border-[#201044]/10 shadow-sm md:h-96">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={mapCenter}
          zoom={defaultZoom}
          options={mapOptions}
          onClick={() => onSelect("")}
        >
          {markers.map(({ desarrollo, lat, lng, aproximada }) => {
            const active = selectedId === desarrollo.id;
            return (
              <Marker
                key={desarrollo.id}
                position={{ lat, lng }}
                title={desarrollo.nombre}
                onClick={() => onSelect(desarrollo.id)}
                zIndex={active ? 100 : aproximada ? 1 : 10}
                icon={buildCorredorMarkerIcon(desarrollo, { active, aproximada })}
              />
            );
          })}

          {selectedMarker && !singleDesarrolloId ? (
            <InfoWindow
              position={{ lat: selectedMarker.lat, lng: selectedMarker.lng }}
              onCloseClick={() => onSelect("")}
            >
              <div className="max-w-[200px] p-1 text-sm">
                {getDesarrolloLogoUrl(selectedMarker.desarrollo) ? (
                  <img
                    src={getDesarrolloLogoUrl(selectedMarker.desarrollo)}
                    alt=""
                    className="mb-2 h-8 w-auto max-w-full object-contain"
                  />
                ) : null}
                <p className="font-bold text-[#201044]">{selectedMarker.desarrollo.nombre}</p>
                <p className="text-xs text-slate-600">
                  {selectedMarker.desarrollo.kmLabel} · {selectedMarker.desarrollo.desarrollador}
                </p>
                {selectedMarker.aproximada ? (
                  <p className="mt-1 text-[10px] text-amber-700">Ubicación aproximada</p>
                ) : null}
                <Link
                  href={`/corredor/${selectedMarker.desarrollo.id}`}
                  className="mt-2 inline-block text-xs font-bold text-[#6cc24a]"
                >
                  Ver ficha →
                </Link>
              </div>
            </InfoWindow>
          ) : null}
        </GoogleMap>
      </div>

      {hayAproximadas && !singleDesarrolloId ? (
        <p className="mt-2 text-xs text-amber-700">
          Pines grises (iniciales): ubicación aproximada. Comparte el pin exacto o el logo en{" "}
          <code className="rounded bg-amber-50 px-1">public/corredor/logos/</code> para personalizar
          el mapa.
        </p>
      ) : null}
    </div>
  );
}
