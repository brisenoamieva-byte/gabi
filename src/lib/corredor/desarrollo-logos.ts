/**
 * Logos de desarrollos (proyectos/fraccionamientos) — pines del mapa y fichas.
 * Carpeta: public/corredor/logos/
 *
 * Logos de desarrolladores (grupos): ver desarrollador-logos.ts
 * Carpeta: public/corredor/desarrolladores/
 */
export const CORREDOR_DESARROLLO_LOGOS: Partial<Record<string, string>> = {
  "arroyo-del-pedregal": "/corredor/logos/PEDREGAL-DEL-ARROYO.jpg",
  "canadas-del-arroyo": "/corredor/logos/CANADAS-DEL-ARROYO.jpg",
  "canadas-del-valle": "/corredor/logos/CANADAS-DEL-VALLE.jpg",
  "ciudad-maderas-corregidora": "/corredor/logos/CIUDAD-MADERAS.jpg",
  "el-condado": "/corredor/logos/EL-CONDADO.jpg",
  "faro-de-los-cisnes": "/corredor/logos/EL-FARO.jpg",
  "preserve-country": "/corredor/logos/PRESERVE-COUNTRY.jpeg",
  "preserve-sur": "/corredor/logos/PRESERVE-SUR.jpg",
  "real-del-bosque": "/corredor/logos/REAL-DEL-BOSQUE.jpg",
  simate: "/corredor/logos/SIMATE.jpg",
  "valle-cardinal": "/corredor/logos/VALLE-CARDINAL.jpg",
  "canadas-la-porta": "/corredor/logos/investti/canadas-la-porta.png",
  velasur: "/corredor/logos/VELASUR.jpg",
};

export function getDesarrolloLogoUrl(desarrollo: {
  id: string;
  logoUrl?: string;
}): string | undefined {
  return desarrollo.logoUrl ?? CORREDOR_DESARROLLO_LOGOS[desarrollo.id];
}

export function getDesarrolloIniciales(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return "?";
  if (palabras.length === 1) return palabras[0].slice(0, 2).toUpperCase();
  return (palabras[0][0] + palabras[1][0]).toUpperCase();
}
