/** Anexo C — especificaciones de acabados departamentos Pasaje Álamos (mar 2024). */

export const PASAJE_ACABADOS_PDF =
  "/documentos/pasaje-alamos/anexo-c-acabados-departamentos.pdf";

export type PasajeAcabadosSection = {
  title: string;
  items: string[];
};

/** Resumen para listas en recorrido / cotizador. */
export const PASAJE_DEPTOS_EQUIPAMIENTO_INCLUIDO: string[] = [
  "Piso mármol Xalapa/Veracruz mate en sala, comedor, cocina y baños (excepto servicio)",
  "Piso laminado Terza 14 mm en recámaras (Napoli Bistro / encino europeo)",
  "Loseta cerámica Interceramic Berlín Pearl en lavado y baño de servicio",
  "Deck NewTechWood TEAK en terraza (piso y lambrín)",
  "Muros Tablaroca STC 55 con pintura Comex mate; mampostería perimetral con aplanado Sika",
  "Carpintería: puerta principal encino, interiores melamina nogal; closets y vestidor Arauco",
  "Ventanas aluminio gris oxford serie 4600/1400, cristal laminado 6 mm",
  "Iluminación empotrada Tecnolite; accesorios eléctricos Bticino Quinziño negro mate",
  "Baños principales: Helvex, Castel, BAMA negro mate; baño servicio línea cromo",
  "Preinstalación A/C en sala/comedor y recámara principal (hasta 2 ton)",
  "Cocina integral TEKA: campana, parrilla, horno, estación fregadero Tekaway",
  "Gabinetes melamina nogal británico / visión Massisa; cubierta mármol Negro Monterrey",
];

export const PASAJE_DEPTOS_NO_INCLUYE: string[] = [
  "Equipos de aire acondicionado (solo canalización y desagüe)",
  "Accesorios A/C: interruptores, tubería de cobre para gas, bases de herrería",
  "Refrigerador, microondas y lavavajillas",
  "Elementos decorativos en cocina",
];

/** Detalle por área (Anexo C). */
export const PASAJE_DEPTOS_ACABADOS_SECTIONS: PasajeAcabadosSection[] = [
  {
    title: "Pisos y zoclos",
    items: [
      "Mármol Xalapa/Veracruz mate 40×LL×1 cm en sala, comedor, cocina y baños",
      "Laminado Terza 14 mm Napoli Bistro en recámaras",
      "Cerámica Interceramic Berlín Pearl 60×60 cm en lavado y baño de servicio",
      "Deck NewTechWood uh02 TEAK 2.5 cm en terraza",
      "Zoclo mármol remetido en áreas húmedas y estancia; cerámico en servicio",
    ],
  },
  {
    title: "Muros y plafones",
    items: [
      "Tablaroca Panel Rey STC 55 en muros y plafones interiores, pintura Comex mate",
      "Mampostería perimetral con aplanado Sika; terraza color Humo",
      "Plafón cajillo en sala/comedor; plafón deck en terraza",
    ],
  },
  {
    title: "Carpintería",
    items: [
      "Puerta principal encino macizo con cerradura 3 bulones Jako",
      "Puertas interiores melamina nogal terracota",
      "Closets y vestidor melamina Arauco nogal británico / interiores gris oxford",
      "Vanity baños en melamina nogal con cubierta mármol Xalapa/Veracruz",
    ],
  },
  {
    title: "Ventanas y herrería",
    items: [
      "Corredizas serie 4600 en sala y recámaras; proyección serie 1400",
      "Proyectables serie 1400 en baños",
      "Barandal terraza solera 2\" pintura negra mate exterior",
    ],
  },
  {
    title: "Iluminación y eléctrico",
    items: [
      "Empotrables Tecnolite interiores y exteriores; tira LED en cajillo",
      "Arbotantes Illux en baños; sobreponer escaleras Kave I",
      "Contactos e interruptores Bticino Quinziño negro mate",
      "Calentador Calorex Vattium; centro de carga Square D 12 polos",
    ],
  },
  {
    title: "Baños",
    items: [
      "Principales: lavabo Helvex Lucerna, WC Castel Nemesis, monomando Piazza Ébano",
      "Regadera y accesorios BAMA negro mate",
      "Servicio: línea Ceramosa Génova / BAMA cromo",
      "Lavadero fibra LD71B12Z en cuarto de lavado",
    ],
  },
  {
    title: "Aire acondicionado",
    items: [
      "Preinstalación en sala/comedor y recámara principal",
      "Canalización PVC 3\" y desagüe a mueble sanitario",
      "Preparación para equipos hasta 2 toneladas",
    ],
  },
  {
    title: "Cocina integral",
    items: [
      "Gabinetes melamina nogal británico / visión Massisa, herrajes cierre lento",
      "Cubierta y zoclo mármol Negro Monterrey (cascada en algunos modelos)",
      "Campana, parrilla, horno y estación TEKA según layout",
      "Preparaciones eléctricas e hidráulicas para micro, refri y lavavajillas",
    ],
  },
];

/** Bullets compactos para PDF (1 página). */
export const PASAJE_DEPTOS_ACABADOS_PDF_RESUMEN: string[] = [
  "Mármol Xalapa/Veracruz + laminado Terza en recámaras + deck terraza",
  "Carpintería nogal británico: closets, vestidor, cocina integral TEKA",
  "Ventanas aluminio oxford; baños Helvex / Castel / BAMA",
  "Preinstalación A/C (2 ton) · Calentador Calorex · Iluminación Tecnolite",
];

export const isPasajeDepartamentosCluster = (clusterId?: string | null): boolean =>
  clusterId?.startsWith("pasaje-alamos-departamentos") ?? false;

export const getPasajeDeptosAcabados = () => ({
  pdfUrl: PASAJE_ACABADOS_PDF,
  incluido: PASAJE_DEPTOS_EQUIPAMIENTO_INCLUIDO,
  noIncluye: PASAJE_DEPTOS_NO_INCLUYE,
  sections: PASAJE_DEPTOS_ACABADOS_SECTIONS,
  pdfResumen: PASAJE_DEPTOS_ACABADOS_PDF_RESUMEN,
});
