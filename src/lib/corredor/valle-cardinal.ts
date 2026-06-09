/**
 * Valle Cardinal — un solo biodesarrollo en km 18 (carretera 413, Huimilpan).
 * Cortijo Miravalle y Hacienda Higuera son clústeres / etapas, no desarrollos independientes.
 * Fuente: ebooks mayo 2026.
 */

export const VALLE_CARDINAL_ID = "valle-cardinal";

export type ValleCardinalCluster = {
  id: string;
  nombre: string;
  orden: number;
  totalLotes: number | null;
  notas: string;
  brochureUrl: string;
  amenidades: string[];
};

export const VALLE_CARDINAL_CLUSTERS: ValleCardinalCluster[] = [
  {
    id: "hacienda-higuera",
    nombre: "Hacienda Higuera",
    orden: 1,
    totalLotes: 79,
    notas:
      "Primer clúster del biodesarrollo. 79 lotes · diseño Torres Romero · conexión directa al parque central y amenidades principales.",
    brochureUrl: "/corredor/brochures/valle-cardinal-hacienda-higuera.pdf",
    amenidades: ["Parque central", "Amenidades compartidas Valle Cardinal"],
  },
  {
    id: "cortijo-miravalle",
    nombre: "Cortijo Miravalle",
    orden: 2,
    totalLotes: null,
    notas:
      "Segundo clúster. Caseta de control, alberca, terraza y jardín de eventos, gimnasio, juegos infantiles y acceso al parque central.",
    brochureUrl: "/corredor/brochures/valle-cardinal-cortijo-miravalle.pdf",
    amenidades: [
      "Control de acceso",
      "Alberca",
      "Terraza de eventos",
      "Jardín de eventos",
      "Gimnasio",
      "Juegos infantiles",
    ],
  },
];

export const VALLE_CARDINAL_RESUMEN = {
  nombre: "Valle Cardinal",
  tipo: "Biodesarrollo",
  ubicacion: "Huimilpan · Blvd. Metropolitano Corregidora–Huimilpan · km 18 (413)",
  superficieHa: "90+",
  parqueLinealM2: "90,000+",
  reservaNatural: "Colinda con La Peña de Cristo (zona de reserva natural protegida)",
  ejes: [
    "Movilidad integral (parque sin cruces vehiculares)",
    "Reconexión con la naturaleza",
    "Reserva natural responsable",
  ],
  amenidadesMaestro: [
    "Parque lineal con lagos y arroyo",
    "Canchas de pádel",
    "Camping y fogateros",
    "Mirador celeste",
    "Viñedo",
    "Tirolesa infantil",
    "Skate park",
    "Multicanchas",
  ],
} as const;
