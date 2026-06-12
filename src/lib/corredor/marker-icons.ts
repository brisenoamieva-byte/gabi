import { resolvePublicAssetUrl } from "@/lib/public-asset-url";
import { getDesarrolloIniciales, getDesarrolloLogoUrl } from "./desarrollo-logos";
import type { CorredorDesarrollo } from "./types";

type MarkerIconOptions = {
  active: boolean;
  aproximada: boolean;
  size?: number;
};

function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function initialsMarkerSvg(
  iniciales: string,
  { active, aproximada, size = 44 }: MarkerIconOptions & { iniciales: string }
): string {
  const r = size / 2;
  const fill = aproximada ? "#94a3b8" : active ? "#6cc24a" : "#201044";
  const stroke = active ? "#201044" : "#ffffff";
  const strokeWidth = active ? 3 : 2;
  const fontSize = iniciales.length > 2 ? size * 0.28 : size * 0.34;

  return svgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <circle cx="${r}" cy="${r}" r="${r - 1}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>
  <text x="${r}" y="${r + fontSize * 0.36}" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-size="${fontSize}" font-weight="700" fill="#ffffff">${iniciales}</text>
</svg>`);
}

/** Pin con borde circular recomendado (PNG/WebP ~96×96). */
function logoMarkerIcon(logoUrl: string, size: number): google.maps.Icon {
  return {
    url: logoUrl,
    scaledSize: new google.maps.Size(size, size),
    anchor: new google.maps.Point(size / 2, size / 2),
  };
}

export function buildCorredorMarkerIcon(
  desarrollo: CorredorDesarrollo,
  options: MarkerIconOptions
): google.maps.Icon {
  const size = options.size ?? (options.active ? 48 : 44);
  const logoUrl = getDesarrolloLogoUrl(desarrollo);

  if (logoUrl) {
    return logoMarkerIcon(resolvePublicAssetUrl(logoUrl), size);
  }

  const iniciales = getDesarrolloIniciales(desarrollo.nombre);
  return {
    url: initialsMarkerSvg(iniciales, { ...options, iniciales, size }),
    scaledSize: new google.maps.Size(size, size),
    anchor: new google.maps.Point(size / 2, size / 2),
  };
}
