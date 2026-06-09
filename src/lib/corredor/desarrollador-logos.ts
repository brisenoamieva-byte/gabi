/**
 * Logos de desarrolladores (grupos) del corredor sur.
 * Carpeta: public/corredor/desarrolladores/
 *
 * IDs en CORREDOR_DESARROLLADORES (zona-sur-seed.ts):
 * investti, capital-realestate, ciudad-maderas, el-faro-cisnes,
 * tayco, grupo-velas, sucot, valle-cardinal, arroyo-del-pedregal
 */
export const CORREDOR_DESARROLLADOR_LOGOS: Partial<Record<string, string>> = {
  investti: "/corredor/desarrolladores/investti.jpg",
  "capital-realestate": "/corredor/desarrolladores/CR-complejos-residenciales.png",
  tayco: "/corredor/desarrolladores/tayco.jpg",
  "grupo-velas": "/corredor/desarrolladores/grupo-velas.jpg",
  "el-faro-cisnes": "/corredor/logos/EL-FARO.jpg",
  "arroyo-del-pedregal": "/corredor/logos/PEDREGAL-DEL-ARROYO.jpg",
};

export function getDesarrolladorLogoUrl(desarrolladorId: string): string | undefined {
  return CORREDOR_DESARROLLADOR_LOGOS[desarrolladorId];
}

export function getDesarrolladorIniciales(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return "?";
  if (palabras.length === 1) return palabras[0].slice(0, 2).toUpperCase();
  return (palabras[0][0] + palabras[1][0]).toUpperCase();
}
