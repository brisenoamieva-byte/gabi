/**
 * Valle de Allende · identidad de marca (proyecto NUBO).
 * Fuente: docs/brand/nubo/VALLEDEALLENDE_BOOK.pdf (Blank PRJCT, junio 2026).
 */

export const valleAllendeBrand = {
  name: "Valle de Allende",
  projectCode: "NUBO",
  tagline: "Donde la tierra y la vida encuentran equilibrio.",
  social: "@valledeallende",
  web: "www.valledeallende.com",
  email: "info@valledeallende.com",
  location: "San Miguel de Allende, Guanajuato",

  /** Colores primarios — brandbook p. 41 */
  colors: {
    beige: "#F9F9E8",
    verde: "#3D4236",
    arena: "#CAC3A9",
    gris: "#A09A8A",
    negro: "#28251E",
  },

  /** Uso recomendado en UI (aprox. porcentajes del brandbook) */
  colorUsage: {
    beige: 0.3,
    verde: 0.25,
    arena: 0.2,
    gris: 0.15,
    negro: 0.1,
  },

  /** Tipografías — brandbook p. 39 */
  fonts: {
    heading: "Shippori Mincho",
    subheading: "Spectral",
    body: "DM Sans",
  },

  /** Frases de marca — brandbook p. 17 */
  phrases: [
    "Tierra cálida y horizontes amplios.",
    "Paisaje, bienestar y comunidad.",
    "Hay lugares que se construyen. Y otros que nacen del paisaje.",
    "El lujo de un paisaje auténtico.",
    "Un refugio contemporáneo dentro de San Miguel de Allende.",
    "El equilibrio entre exclusividad y naturaleza.",
  ],

  /** Voz: serena, sofisticada — no discurso inmobiliario frío */
  voice: {
    tone: ["serena", "sofisticada", "contemplativa"],
    avoid: ["estridente", "tecnicismos fríos", "discurso de vendedor"],
  },

  /** Dirección de arte fotográfica — brandbook p. 59 */
  photography: {
    summary:
      "Luz orgánica, tonos cálidos y terrosos, calma y sofisticación. Personas, arquitectura y paisaje en momentos auténticos.",
  },

  brandbookPath: "docs/brand/nubo/VALLEDEALLENDE_BOOK.pdf",
} as const;

export type ValleAllendeBrand = typeof valleAllendeBrand;
