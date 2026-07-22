// gabi - Guía para Asesores de Bienes Inmuebles
// Datos locales para modo offline-first
// La Vista Residencial - BBR Habitarea

import {
  investtiCatalogClusters,
  investtiCatalogDesarrollos,
} from "@/lib/catalog/investti-desarrollos";
import {
  pasajeAlamosDisponibilidades,
  pasajeAlamosPrototipos,
} from "@/lib/catalog/pasaje-alamos.generated";
import {
  misionLaGaviaCatalogSummary,
  misionLaGaviaDisponibilidades,
  misionLaGaviaPrototipos,
} from "@/lib/catalog/mision-la-gavia.generated";

const INVESTTI_DESARROLLO_IDS = investtiCatalogDesarrollos.map((d) => d.id);

export interface Cluster {
  id: string
  /** Desarrollo al que pertenece; por defecto La Vista en seed/import. */
  desarrolloId?: string
  nombre: string
  slug: string
  tipo: 'casas' | 'terrenos' | 'departamentos' | 'oficinas' | 'mixto'
  totalViviendas: number
  descripcion: string
  precioDesde: number
  entregaGeneral: string
  entregaEtapas?: Array<{
    etapa: string
    fecha: string
  }>
  amenidades: string[]
  fotoPortada: string
  logo: string
  activo: boolean
  /** PDF oficial del cluster en /public o subido en admin. */
  brochurePdf?: string
  /** Tarjetas de proceso de ventas (guión asesor). */
  tarjetasProcesoPdf?: string
}

export interface Prototipo {
  id: string
  clusterId: string
  nombre: string
  slug: string
  construccionM2: number
  terrenoM2?: number
  jardinM2?: number
  frenteM?: number
  niveles: number
  recamaras: number
  banos: number
  precioBase: number
  bonoMaximo: number
  precioFinal: number
  entrega: string
  equipamientoIncluido: string[]
  noIncluye: string[]
  casaMuestra?: {
    numero: string
    clave: string
    ubicacion: string
  }
  planos: string[]
  fotos: string[]
  activo: boolean
  soldOut: boolean
}

export interface Unidad {
  id: string
  prototipoId: string
  clusterId: string
  numero: string
  manzana: string
  lote: string
  etapa: string
  torre?: number
  nivel?: string
  status: 'disponible' | 'apartado' | 'vendido' | 'bloqueado'
  precioEspecial?: number
}

export interface DisponibilidadUnidad {
  id: string
  clusterId: string
  unidad: string
  tipo: 'casa' | 'departamento' | 'terreno' | 'oficina'
  estatus: 'disponible' | 'apartado' | 'vendido' | 'bloqueado'
  prototipoId?: string
  precio?: number
  /** @deprecated Usar superficieTerrenoM2 / superficieConstruccionM2 */
  superficieM2?: number
  superficieTerrenoM2?: number
  superficieConstruccionM2?: number
  /** Superficie interna habitable (Pasaje Álamos). */
  superficieInternaM2?: number
  /** Superficie externa: terraza/balcón (Pasaje Álamos). */
  superficieExternaM2?: number
  /** Superficie de bodega asignada (Pasaje Álamos). */
  superficieBodegaM2?: number
  /** Número de cajones de estacionamiento (Pasaje Álamos). */
  cajones?: number
  entrega?: string
  etapa?: string
  torre?: string
  nivel?: string
  nivelOrden?: number
  unidadOrden?: number
  notas?: string
  visitable: boolean
  prioridadComercial: 'alta' | 'media' | 'baja'
  razonesVenta: string[]
  ubicacionComercial?: string
  instruccionRecorrido?: string
  notaAcceso?: string
  /** Orden de presentación en recorrido (admin). */
  orden?: number
  x: number
  y: number
}

export type ModoVisualizacion =
  | 'auto'
  | 'departamentos'
  | 'mixto'
  | 'lotes-casas'
  | 'referencial'

export interface DisponibilidadPlano {
  clusterId: string
  titulo: string
  fechaCorte: string
  imagen: string
  modoVisualizacion?: ModoVisualizacion
  vistasHabilitadas?: Array<'recomendadas' | 'lista' | 'plano' | 'matriz'>
  tipoVistaPrincipal?: 'recomendadas' | 'lista' | 'plano' | 'matriz'
  vistaGuia?: string
  notas?: string
  /** PDF oficial de inventario en /public o subido en admin. */
  documentoPdf?: string
}

export interface Asesor {
  id: string
  nombre: string
  email: string
  pin: string
  rol: 'asesor' | 'gerente' | 'coordinador' | 'director'
  activo: boolean
  desarrollosIds: string[]
}

export interface Desarrollo {
  id: string
  nombre: string
  slug: string
  desarrollador: string
  comercializador: string
  ubicacion: string
  descripcion: string
  precioDesde: number
  tiposProducto: Array<'casas' | 'terrenos' | 'departamentos' | 'oficinas'>
  estado: 'activo' | 'proximamente'
  logo?: string
  desarrolladorLogo?: string
  colorPrincipal: string
  colorAcento: string
  /** PDF oficial del desarrollo en /public o subido en admin. */
  brochurePdf?: string
  /** Tarjetas de proceso de ventas (guión asesor). */
  tarjetasProcesoPdf?: string
  /** Imagen del master plan en /public (recorrido y materiales comerciales). */
  masterPlanImage?: string
  /** Portada wide del hub admin (tarjeta y detalle de desarrollo). */
  hubHeroImage?: string
  crm: {
    provider: 'hubspot' | 'custom' | 'none'
    enabled: boolean
  }
}

export type DatosBancarios = {
  razonSocial: string
  rfc: string
  banco: string
  sucursal: string
  cuenta: string
  clabe: string
  concepto: string
  reportarA: string
}

export type ContactoClave = {
  nombre: string
  rol: string
}

export type TecnicaCierre = {
  id: string
  nombre: string
  descripcion: string
  ejemplo: string
  cuandoUsar: string
}

export interface Cliente {
  id: string
  nombre: string
  email?: string
  telefono?: string
  medioContacto: 'contacto-directo' | 'referido' | 'medios-digitales' | 'pase' | 'inmobiliaria-externo' | 'espectacular' | 'cross-selling'
  asesorId: string
  interesClusterId?: string
  interesPrototipoId?: string
  presupuesto?: number
  status: 'nuevo' | 'seguimiento' | 'apartado' | 'escriturado' | 'perdido'
  fechaRegistro: string
  notas?: string
  etapaRecorrido?: number // 1-5 (confianza, necesidades, desarrollo, producto, cierre)
}

export const clusters: Cluster[] = [
  {
    id: 'oliveto',
    nombre: 'Oliveto',
    slug: 'oliveto',
    tipo: 'mixto',
    totalViviendas: 115,
    descripcion: '115 viviendas. Casas y departamentos con amenidades exclusivas.',
    precioDesde: 3090000,
    entregaGeneral: 'Inmediata',
    amenidades: [
      '2 áreas de fogateros',
      'Alberca climatizada',
      'Salón de eventos',
      'Terraza',
      'Área de yoga techada',
      'Gimnasio equipado',
      'Chapoteadero',
      'Áreas verdes'
    ],
    fotoPortada: '/clusters/oliveto.jpg',
    logo: '/desarrollos/la-vista/logos/oliveto.png',
    activo: true
  },
  {
    id: 'benevento',
    nombre: 'Benevento',
    slug: 'benevento',
    tipo: 'mixto',
    totalViviendas: 53,
    descripcion: '53 viviendas. Casas Castello y terrenos desde 182m².',
    precioDesde: 5240000,
    entregaGeneral: 'Agosto 2026',
    amenidades: [
      'Casa Club',
      'Alberca',
      'Áreas verdes'
    ],
    fotoPortada: '/clusters/benevento.jpg',
    logo: '/desarrollos/la-vista/logos/benevento.png',
    activo: true
  },
  {
    id: 'volterra',
    nombre: 'Volterra',
    slug: 'volterra',
    tipo: 'departamentos',
    totalViviendas: 134,
    descripcion: '134 departamentos en 3 etapas. Primera cancha de pickleball de La Vista.',
    precioDesde: 3090000,
    entregaGeneral: 'Etapa 1A: Inmediata | 1B: Agosto 2026 | 2A: Diciembre 2026',
    entregaEtapas: [
      { etapa: '1A', fecha: 'Inmediata' },
      { etapa: '1B', fecha: 'Agosto 2026' },
      { etapa: '2A', fecha: 'Diciembre 2026' }
    ],
    amenidades: [
      'Cancha de Pickleball',
      'Dog park',
      'Casa Club',
      'Alberca climatizada',
      'Gimnasio equipado',
      'Salón de Eventos',
      'Área de Asadores'
    ],
    fotoPortada: '/clusters/volterra.jpg',
    logo: '/desarrollos/la-vista/logos/volterra.png',
    activo: true
  },
  {
    id: 'pasaje-alamos-departamentos',
    desarrolloId: 'pasaje-alamos',
    nombre: 'Departamentos',
    slug: 'departamentos',
    tipo: 'departamentos',
    totalViviendas: 81,
    descripcion:
      '81 departamentos en 7 niveles. 12 modelos de 1, 2 o 3 recámaras con motor lobby, rooftop y amenidades compartidas.',
    precioDesde: 5099926,
    entregaGeneral: 'Por confirmar',
    amenidades: [
      'Motor lobby',
      'Elevadores',
      'Rooftop con vistas al centro histórico',
      'Alberca con firepit',
      'Family room',
      'Zona de paquetería',
      'Acceso al área comercial'
    ],
    fotoPortada: '/desarrollos/pasaje-alamos/departamentos-portada.jpg',
    logo: '/logos/pasaje-alamos.png',
    activo: true
  },
  {
    id: 'pasaje-alamos-oficinas',
    desarrolloId: 'pasaje-alamos',
    nombre: 'Oficinas',
    slug: 'oficinas',
    tipo: 'oficinas',
    totalViviendas: 57,
    descripcion:
      '57 oficinas en 6 niveles con coworking, salas de juntas, terrazas y acceso directo al pasaje comercial.',
    precioDesde: 3905405,
    entregaGeneral: 'Por confirmar',
    amenidades: [
      'Motor lobby',
      'Elevadores',
      'Coworking',
      'Salas de juntas',
      'Salas de espera',
      'Rooftop',
      'Zona de paquetería',
      'Kioscos comerciales'
    ],
    fotoPortada: '/desarrollos/pasaje-alamos/oficinas-portada.jpg',
    logo: '/logos/pasaje-alamos.png',
    activo: true
  },
  {
    id: 'mision-la-gavia-departamentos',
    desarrolloId: 'mision-la-gavia',
    nombre: 'Departamentos',
    slug: 'departamentos',
    tipo: 'departamentos',
    totalViviendas: misionLaGaviaCatalogSummary.total,
    descripcion:
      '105 departamentos en torres con modelos de 2 y 3 recámaras. Respiro Urbano: arquitectura contemporánea en Corregidora.',
    precioDesde: misionLaGaviaCatalogSummary.precioDesdeContado,
    entregaGeneral: 'Calendario por torre · consultar lista vigente',
    amenidades: [
      'Respiro Urbano · diseño contemporáneo',
      'Torres con modelos 2R y 3R',
      'Roof garden en niveles superiores',
      'Áreas verdes y amenidades del master plan',
    ],
    fotoPortada: '/logos/mision-la-gavia-mark.png',
    logo: '/logos/mision-la-gavia.png',
    activo: true,
  },
  ...investtiCatalogClusters,
]

export const prototipos: Prototipo[] = [
  {
    id: 'scordia',
    clusterId: 'oliveto',
    nombre: 'Scordia',
    slug: 'scordia',
    construccionM2: 151.65,
    terrenoM2: 137.75,
    jardinM2: 31,
    niveles: 2,
    recamaras: 3,
    banos: 2.5,
    precioBase: 4200000,
    bonoMaximo: 210000,
    precioFinal: 3990000,
    entrega: 'Inmediata',
    equipamientoIncluido: [
      'Horno', 'Parrilla', 'Campana', 'Microondas', 'Tarja',
      'Carpintería', 'Cubiertas', 'Despensa', 'Barandales',
      'Luces cortesía escalera', 'Mosquiteros', 'Clósets en todas las recámaras'
    ],
    noIncluye: [
      'Lambrín', 'Piso/Pérgola jardín (solo pasto natural)',
      'Espejos baños', 'Mueble TV', 'Refrigerador'
    ],
    casaMuestra: {
      numero: 'Rojo',
      clave: 'Llavero rojo',
      ubicacion: 'Casa muestra Scordia'
    },
    planos: ['/desarrollos/la-vista/planos/scordia.png'],
    fotos: ['/desarrollos/la-vista/fachadas/scordia.png'],
    activo: true,
    soldOut: false
  },
  {
    id: 'scordia-plus',
    clusterId: 'oliveto',
    nombre: 'Scordia Plus',
    slug: 'scordia-plus',
    construccionM2: 197.84,
    terrenoM2: 137,
    jardinM2: 31,
    niveles: 3,
    recamaras: 4,
    banos: 4.5,
    precioBase: 4850000,
    bonoMaximo: 100000,
    precioFinal: 4750000,
    entrega: 'Inmediata',
    equipamientoIncluido: [
      'Horno', 'Parrilla', 'Campana', 'Microondas', 'Tarja',
      'Carpintería', 'Cubiertas', 'Despensa', 'Barandales',
      'Luces cortesía escalera', 'Mosquiteros', 'Clósets en todas las recámaras'
    ],
    noIncluye: [
      'Lambrín', 'Piso/Pérgola jardín (solo pasto natural)',
      'Espejos baños', 'Mueble TV', 'Refrigerador'
    ],
    casaMuestra: {
      numero: '107',
      clave: '789512#',
      ubicacion: 'Casa #107'
    },
    planos: ['/desarrollos/la-vista/planos/scordia-plus.png'],
    fotos: ['/desarrollos/la-vista/fachadas/scordia-plus.png'],
    activo: true,
    soldOut: false
  },
  {
    id: 'pontevel',
    clusterId: 'oliveto',
    nombre: 'Pontevel',
    slug: 'pontevel',
    construccionM2: 151.82,
    terrenoM2: 137.75,
    jardinM2: 22,
    niveles: 2,
    recamaras: 3,
    banos: 2.5,
    precioBase: 4300000,
    bonoMaximo: 120000,
    precioFinal: 4180000,
    entrega: 'Casa #13',
    equipamientoIncluido: [
      'Horno', 'Parrilla', 'Campana', 'Microondas', 'Tarja',
      'Carpintería', 'Cubiertas', 'Despensa', 'Barandales',
      'Luces cortesía escalera', 'Mosquiteros', 'Clósets en todas las recámaras'
    ],
    noIncluye: [
      'Lambrín', 'Piso/Pérgola jardín (solo pasto natural)',
      'Espejos baños', 'Mueble TV', 'Refrigerador'
    ],
    casaMuestra: {
      numero: '13',
      clave: 'Llave verde',
      ubicacion: 'Casa #13'
    },
    planos: ['/desarrollos/la-vista/planos/pontevel.png'],
    fotos: ['/desarrollos/la-vista/fachadas/pontevel.png'],
    activo: true,
    soldOut: false
  },
  {
    id: 'castello-benevento',
    clusterId: 'benevento',
    nombre: 'Castello',
    slug: 'castello-benevento',
    construccionM2: 215.57,
    terrenoM2: 180,
    jardinM2: 39,
    frenteM: 9,
    niveles: 2,
    recamaras: 3,
    banos: 3.5,
    precioBase: 5400000,
    bonoMaximo: 160000,
    precioFinal: 5240000,
    entrega: 'Agosto 2026',
    equipamientoIncluido: [
      'Horno', 'Parrilla', 'Campana', 'Microondas', 'Tarja',
      'Carpintería', 'Cubiertas', 'Despensa', 'Barandales',
      'Luces cortesía escalera', 'Mosquiteros', 'Clósets en todas las recámaras'
    ],
    noIncluye: [
      'Lambrín', 'Piso/Pérgola jardín (solo pasto natural)',
      'Espejos baños', 'Mueble TV', 'Refrigerador'
    ],
    planos: ['/desarrollos/la-vista/planos/castello.png'],
    fotos: ['/desarrollos/la-vista/fachadas/castello.png'],
    activo: true,
    soldOut: false
  },
  {
    id: 'tarento-pb',
    clusterId: 'volterra',
    nombre: 'Tarento Planta Baja',
    slug: 'tarento-pb',
    construccionM2: 108.07,
    terrenoM2: 16.37,
    niveles: 1,
    recamaras: 2,
    banos: 2,
    precioBase: 3375000,
    bonoMaximo: 80000,
    precioFinal: 3295000,
    entrega: 'Inmediata',
    equipamientoIncluido: [
      'Cocina 100% equipada (sin refrigerador)',
      'Aire acondicionado acometida en sala',
      'Clósets', 'Mosquiteros'
    ],
    noIncluye: [
      'Refrigerador', 'Piso jardín (concreto + pasto natural)',
      'Espejos baños', 'Mueble TV'
    ],
    planos: ['/desarrollos/la-vista/planos/tarento.png'],
    fotos: ['/desarrollos/la-vista/fachadas/tarento.png'],
    activo: true,
    soldOut: false
  },
  {
    id: 'tarento-pa',
    clusterId: 'volterra',
    nombre: 'Tarento Planta Alta',
    slug: 'tarento-pa',
    construccionM2: 106.92,
    niveles: 1,
    recamaras: 2,
    banos: 2,
    precioBase: 3170000,
    bonoMaximo: 80000,
    precioFinal: 3090000,
    entrega: 'Inmediata',
    equipamientoIncluido: [
      'Cocina 100% equipada (sin refrigerador)',
      'Aire acondicionado acometida en sala',
      'Clósets', 'Mosquiteros'
    ],
    noIncluye: [
      'Refrigerador', 'Piso jardín',
      'Espejos baños', 'Mueble TV'
    ],
    planos: ['/desarrollos/la-vista/planos/tarento.png'],
    fotos: ['/desarrollos/la-vista/fachadas/tarento.png'],
    activo: true,
    soldOut: false
  }
]

export const disponibilidadPlanos: DisponibilidadPlano[] = [
  {
    clusterId: 'oliveto',
    titulo: 'Oliveto - Disponibilidad Mayo',
    fechaCorte: 'Mayo',
    imagen: '/disponibilidad/oliveto-mayo.svg',
    modoVisualizacion: 'referencial',
    tipoVistaPrincipal: 'lista',
    vistaGuia:
      'Cluster en SOLD OUT. Usa el plano como referencia histórica; confirma inventario con administración.',
    notas: 'El documento compartido indica SOLD OUT.'
  },
  {
    clusterId: 'benevento',
    titulo: 'Benevento - Disponibilidad Mayo',
    fechaCorte: 'Mayo',
    imagen: '/disponibilidad/benevento-mayo.svg',
    modoVisualizacion: 'mixto',
    tipoVistaPrincipal: 'recomendadas',
    vistaGuia:
      'Producto mixto: casas y terrenos. Empieza por “Qué mostrar”; filtra por tipo en Inventario. El plano orienta, los datos oficiales están en cada unidad.',
    notas: 'Plano esquemático basado en el documento de disponibilidad compartido.'
  },
  {
    clusterId: 'volterra',
    titulo: 'Volterra - Disponibilidad Mayo',
    fechaCorte: 'Mayo',
    imagen: '/disponibilidad/volterra-mayo.svg',
    modoVisualizacion: 'departamentos',
    tipoVistaPrincipal: 'recomendadas',
    vistaGuia:
      'Departamentos por etapa y nivel. “Qué mostrar” prioriza entrega inmediata; “Por etapa” ayuda a comparar PB vs PA.',
    notas: 'Vista por etapas para consultar departamentos disponibles.'
  }
]

export const disponibilidades: DisponibilidadUnidad[] = [
  {
    id: 'benevento-lote-23',
    clusterId: 'benevento',
    unidad: 'Lote 23',
    tipo: 'terreno',
    estatus: 'disponible',
    precio: 5240000,
    superficieM2: 196.43,
    entrega: 'Agosto 2026',
    etapa: 'URB 1',
    notas: 'Terreno identificado en plano de disponibilidad.',
    visitable: true,
    prioridadComercial: 'media',
    razonesVenta: [
      'Terreno amplio para cliente que prioriza personalización.',
      'Alternativa interesante si el cliente no quiere departamento.',
      'Superficie competitiva dentro de Benevento.'
    ],
    ubicacionComercial: 'Zona de lotes con frente amplio.',
    instruccionRecorrido: 'Mostrar después de explicar casa club y privacidad de Benevento.',
    notaAcceso: 'Confirmar acceso operativo antes del recorrido físico.',
    x: 36,
    y: 32
  },
  {
    id: 'benevento-lote-24',
    clusterId: 'benevento',
    unidad: 'Lote 24',
    tipo: 'terreno',
    estatus: 'disponible',
    precio: 5240000,
    superficieM2: 196.43,
    entrega: 'Agosto 2026',
    etapa: 'URB 1',
    visitable: true,
    prioridadComercial: 'media',
    razonesVenta: [
      'Terreno para cliente que busca construir o conservar flexibilidad.',
      'Mismo rango de superficie que otros lotes premium del cluster.',
      'Buena alternativa para comparar contra casa terminada.'
    ],
    ubicacionComercial: 'Corredor de lotes en Benevento.',
    instruccionRecorrido: 'Usarlo como segunda opción si el cliente pide terreno.',
    notaAcceso: 'Confirmar acceso operativo antes del recorrido físico.',
    x: 28,
    y: 32
  },
  {
    id: 'benevento-vivienda-50',
    clusterId: 'benevento',
    unidad: 'Vivienda 50',
    tipo: 'casa',
    estatus: 'disponible',
    prototipoId: 'castello-benevento',
    precio: 5400000,
    superficieM2: 180,
    entrega: 'Agosto 2026',
    etapa: 'URB 2',
    visitable: true,
    prioridadComercial: 'alta',
    razonesVenta: [
      'Coincide con cliente familiar que busca casa de 3 recámaras.',
      'Producto Castello con buena superficie y precio claro.',
      'Ideal para explicar estilo de vida de Benevento.'
    ],
    ubicacionComercial: 'Vivienda en corredor residencial.',
    instruccionRecorrido: 'Mostrar primero si el cliente busca casa y presupuesto superior a 5M.',
    notaAcceso: 'Confirmar disponibilidad y acceso antes de entrar.',
    x: 36,
    y: 47
  },
  {
    id: 'benevento-vivienda-51',
    clusterId: 'benevento',
    unidad: 'Vivienda 51',
    tipo: 'casa',
    estatus: 'apartado',
    prototipoId: 'castello-benevento',
    precio: 5400000,
    superficieM2: 180,
    entrega: 'Agosto 2026',
    etapa: 'URB 2',
    visitable: false,
    prioridadComercial: 'baja',
    razonesVenta: [
      'Sirve como referencia de producto, pero no debe ser primera opción.',
      'Apartada: usar solo como comparativo si el cliente quiere entender el cluster.'
    ],
    ubicacionComercial: 'Vivienda en corredor residencial.',
    instruccionRecorrido: 'No dirigir al cliente aquí salvo como referencia visual.',
    notaAcceso: 'Unidad apartada. Confirmar con administración comercial.',
    x: 43,
    y: 47
  },
  {
    id: 'benevento-vivienda-53',
    clusterId: 'benevento',
    unidad: 'Vivienda 53',
    tipo: 'casa',
    estatus: 'disponible',
    prototipoId: 'castello-benevento',
    precio: 5400000,
    superficieM2: 181.17,
    entrega: 'Agosto 2026',
    etapa: 'URB 2',
    visitable: true,
    prioridadComercial: 'alta',
    razonesVenta: [
      'Casa Castello disponible para cliente que busca amplitud.',
      'Superficie ligeramente mayor frente a otras viviendas del bloque.',
      'Buena opción de cierre si el cliente ya validó Benevento.'
    ],
    ubicacionComercial: 'Bloque residencial con acceso claro desde vialidad interna.',
    instruccionRecorrido: 'Mostrar como alternativa principal si Vivienda 50 no convence.',
    notaAcceso: 'Confirmar acceso operativo antes del recorrido físico.',
    x: 52,
    y: 47
  },
  {
    id: 'benevento-lote-40',
    clusterId: 'benevento',
    unidad: 'Lote 40',
    tipo: 'terreno',
    estatus: 'disponible',
    precio: 5240000,
    superficieM2: 226.08,
    entrega: 'Agosto 2026',
    etapa: 'URB 1',
    visitable: true,
    prioridadComercial: 'media',
    razonesVenta: [
      'Terreno de mayor superficie para cliente que valora amplitud.',
      'Puede funcionar como upgrade frente a lotes de menor metraje.',
      'Buena alternativa si el cliente busca inversión patrimonial.'
    ],
    ubicacionComercial: 'Zona de lotes con mayor superficie.',
    instruccionRecorrido: 'Mostrar después de explicar opciones de terreno disponibles.',
    notaAcceso: 'Confirmar acceso operativo antes del recorrido físico.',
    x: 65,
    y: 64
  },
  {
    id: 'volterra-1a-pb-101',
    clusterId: 'volterra',
    unidad: 'Depto 1A PB-101',
    tipo: 'departamento',
    estatus: 'disponible',
    prototipoId: 'tarento-pb',
    precio: 3295000,
    superficieM2: 108.07,
    entrega: 'Inmediata',
    etapa: '1A',
    torre: 'Volterra',
    nivel: 'Planta baja',
    nivelOrden: 1,
    unidadOrden: 1,
    visitable: true,
    prioridadComercial: 'alta',
    razonesVenta: [
      'Entrega inmediata: ideal para cliente que quiere decidir pronto.',
      'Planta baja con jardín, fácil de entender en recorrido.',
      'Precio dentro del rango de departamentos de entrada.'
    ],
    ubicacionComercial: 'Etapa 1A, planta baja.',
    instruccionRecorrido: 'Mostrar primero si el cliente busca departamento de entrega inmediata.',
    notaAcceso: 'Confirmar unidad visitable antes de llevar al cliente.',
    x: 14,
    y: 44
  },
  {
    id: 'volterra-1a-pa-102',
    clusterId: 'volterra',
    unidad: 'Depto 1A PA-102',
    tipo: 'departamento',
    estatus: 'apartado',
    prototipoId: 'tarento-pa',
    precio: 3090000,
    superficieM2: 106.92,
    entrega: 'Inmediata',
    etapa: '1A',
    torre: 'Volterra',
    nivel: 'Planta alta',
    nivelOrden: 2,
    unidadOrden: 2,
    visitable: false,
    prioridadComercial: 'baja',
    razonesVenta: [
      'Apartada: no usar como opción principal.',
      'Sirve para explicar diferencia entre planta baja y planta alta.'
    ],
    ubicacionComercial: 'Etapa 1A, planta alta.',
    instruccionRecorrido: 'Solo usar como referencia comparativa.',
    notaAcceso: 'Unidad apartada. Confirmar estatus antes de ofrecer.',
    x: 22,
    y: 44
  },
  {
    id: 'volterra-1b-pb-201',
    clusterId: 'volterra',
    unidad: 'Depto 1B PB-201',
    tipo: 'departamento',
    estatus: 'disponible',
    prototipoId: 'tarento-pb',
    precio: 3295000,
    superficieM2: 108.07,
    entrega: 'Agosto 2026',
    etapa: '1B',
    torre: 'Volterra',
    nivel: 'Planta baja',
    nivelOrden: 1,
    unidadOrden: 1,
    visitable: true,
    prioridadComercial: 'alta',
    razonesVenta: [
      'Buena alternativa si el cliente acepta entrega programada.',
      'Planta baja: fácil de vender por practicidad y jardín.',
      'Mismo producto Tarento con etapa futura.'
    ],
    ubicacionComercial: 'Etapa 1B, planta baja.',
    instruccionRecorrido: 'Mostrar como alternativa por entrega si la 1A no encaja.',
    notaAcceso: 'Confirmar acceso operativo de etapa 1B.',
    x: 45,
    y: 44
  },
  {
    id: 'volterra-2a-pa-301',
    clusterId: 'volterra',
    unidad: 'Depto 2A PA-301',
    tipo: 'departamento',
    estatus: 'disponible',
    prototipoId: 'tarento-pa',
    precio: 3090000,
    superficieM2: 106.92,
    entrega: 'Diciembre 2026',
    etapa: '2A',
    torre: 'Volterra',
    nivel: 'Planta alta',
    nivelOrden: 2,
    unidadOrden: 2,
    visitable: true,
    prioridadComercial: 'media',
    razonesVenta: [
      'Alternativa de menor precio para cliente sensible al presupuesto.',
      'Planta alta para quien prefiere privacidad.',
      'Entrega programada útil para inversionistas.'
    ],
    ubicacionComercial: 'Etapa 2A, planta alta.',
    instruccionRecorrido: 'Mostrar como opción por precio o inversión a mediano plazo.',
    notaAcceso: 'Confirmar acceso operativo de etapa 2A.',
    x: 82,
    y: 56
  }
]

export interface Comercializador {
  id: string
  nombre: string
  slug: string
  logo: string
  usuario: string
  password: string
  portalPath: string
  colorPrimary: string
  colorAccent: string
}

export const comercializadores: Comercializador[] = [
  {
    id: 'bbr',
    nombre: 'BBR Habitarea',
    slug: 'bbr',
    logo: '/logos/bbr-habitarea.png',
    usuario: 'bbr',
    password: 'habitarea',
    portalPath: "/portal/bbr",
    colorPrimary: '#201044',
    colorAccent: '#6cc24a'
  }
]

export const asesores: Asesor[] = [
  {
    id: 'ricardo',
    nombre: 'Ricardo Briseño',
    email: 'ricardo@bbrhabitarea.com',
    pin: '1234',
    rol: 'director',
    activo: true,
    // Asignaciones reales viven en Supabase; este seed solo aplica en fallback local / demo.
    desarrollosIds: ['mision-la-gavia']
  },
  {
    id: 'rodrigo',
    nombre: 'Rodrigo González',
    email: 'rodrigo@bbrhabitarea.com',
    pin: '5678',
    rol: 'asesor',
    activo: true,
    desarrollosIds: [...INVESTTI_DESARROLLO_IDS]
  },
  {
    id: 'investti-demo',
    nombre: 'Gerente Investti (pruebas)',
    email: 'simulador@grupoinvestti.com',
    pin: '8826',
    rol: 'gerente',
    activo: true,
    desarrollosIds: [...INVESTTI_DESARROLLO_IDS],
  },
]

export const desarrollos: Desarrollo[] = [
  {
    id: 'la-vista-residencial',
    nombre: 'La Vista Residencial',
    slug: 'la-vista-residencial',
    desarrollador: 'Grupo Vinte',
    comercializador: 'BBR Habitarea',
    ubicacion: 'Querétaro, México',
    descripcion: 'Casas, departamentos y terrenos en una comunidad planeada con alta plusvalía.',
    precioDesde: 3090000,
    tiposProducto: ['casas', 'departamentos', 'terrenos'],
    estado: 'activo',
    logo: '/logos/la-vista-residencial-transparent.png',
    desarrolladorLogo: '/logos/grupo-vinte.png',
    colorPrincipal: '#1B4332',
    colorAcento: '#C8A276',
    masterPlanImage: '/desarrollos/la-vista/master-plan.png',
    crm: {
      provider: 'hubspot',
      enabled: true
    }
  },
  {
    id: 'pasaje-alamos',
    nombre: 'Pasaje Álamos',
    slug: 'pasaje-alamos',
    desarrollador: 'Opera Desarrolladora',
    comercializador: 'BBR Habitarea',
    ubicacion: 'Álamos 2ª Sección, Querétaro, Qro.',
    descripcion:
      'Desarrollo de usos mixtos en el primer cuadro de Álamos: departamentos, oficinas y locales comerciales. Sin salir.',
    precioDesde: 3905405,
    tiposProducto: ['departamentos', 'oficinas'],
    estado: 'activo',
    logo: '/logos/pasaje-alamos.png',
    desarrolladorLogo: '/logos/opera-desarrolladora.png',
    colorPrincipal: '#242E38',
    colorAcento: '#C7A694',
    brochurePdf: '/documentos/pasaje-alamos/tarjetas-proceso.pdf',
    crm: {
      provider: 'none',
      enabled: false
    }
  },
  {
    id: 'mision-la-gavia',
    nombre: 'Misión La Gavia',
    slug: 'mision-la-gavia',
    desarrollador: 'BBR Habitarea',
    comercializador: 'BBR Habitarea',
    ubicacion: 'Corregidora, Querétaro',
    descripcion:
      'Departamentos Respiro Urbano en Corregidora: 2 y 3 recámaras con esquemas de pago flexibles. Comercialización exclusiva BBR Habitarea.',
    precioDesde: misionLaGaviaCatalogSummary.precioDesdeContado,
    tiposProducto: ['departamentos'],
    estado: 'activo',
    logo: '/logos/mision-la-gavia.png',
    desarrolladorLogo: '/logos/bbr-habitarea.png',
    colorPrincipal: '#14453D',
    colorAcento: '#5B8A7D',
    brochurePdf: '/documentos/mision-la-gavia/brochure-jun26.pdf',
    tarjetasProcesoPdf: '/documentos/mision-la-gavia/tarjetas-proceso.pdf',
    crm: {
      provider: 'none',
      enabled: false,
    },
  },
  ...investtiCatalogDesarrollos,
]

export const getDesarrollosByIds = (desarrollosIds: string[]): Desarrollo[] => {
  if (!desarrollosIds.length) {
    return []
  }

  return desarrollos.filter(
    (item) => desarrollosIds.includes(item.id) && item.estado === 'activo',
  )
}

export const getDesarrollosByAsesor = (asesorId: string): Desarrollo[] => {
  const asesor = asesores.find(a => a.id === asesorId && a.activo)

  if (!asesor) {
    return []
  }

  return getDesarrollosByIds(asesor.desarrollosIds)
}

export const tecnicasCierre: TecnicaCierre[] = [
  {
    id: 'doble-alternativa',
    nombre: 'Doble Alternativa',
    descripcion: 'Dar siempre dos opciones al cliente para escoger',
    ejemplo: '¿Se queda con el departamento de la esquina o el de en medio? ¿Nos vemos el lunes o el martes?',
    cuandoUsar: 'Cuando el cliente muestra interés pero no decide'
  },
  {
    id: 'amarre',
    nombre: 'El Amarre',
    descripcion: 'Acorralar al prospecto, comprometerlo a que diga Sí',
    ejemplo: '¿Si resolvemos el problema del financiamiento, se queda con el departamento?',
    cuandoUsar: 'Cuando hay una objeción específica que se puede resolver'
  },
  {
    id: 'compensacion',
    nombre: 'La Compensación',
    descripcion: 'Compensar una desventaja del producto con un beneficio evidente',
    ejemplo: 'El comprador dice: "Lo siento pequeño". El vendedor dice: "Pero cuenta con la mejor ubicación dentro del desarrollo"',
    cuandoUsar: 'Cuando el cliente saca a relucir algo que no es de su agrado'
  },
  {
    id: 'set-si',
    nombre: 'El Set "Sí"',
    descripcion: 'Conjunto de preguntas que generan respuesta "Sí" y preparan al cliente',
    ejemplo: '¿Desea seguridad en donde va a vivir? ¿Desea comprar en una zona con plusvalía?',
    cuandoUsar: 'Al inicio del cierre, para crear ambiente positivo'
  },
  {
    id: 'eliminacion',
    nombre: 'Por Eliminación',
    descripcion: 'Hacer lista de lo que SÍ le gusta vs lo que NO',
    ejemplo: 'Listar pros y contras. La lista del "Sí" siempre saldrá ganadora',
    cuandoUsar: 'Cuando el cliente está indeciso entre varias opciones'
  }
]

export const tecnicaDosMinutos = {
  titulo: 'Técnica de 2 Minutos',
  tiempo: 120,
  puntos: [
    'Sobre Fray Junípero Serra, a 5 min de Bernardo Quintana y 3-4 min de Paseo Querétaro',
    'Servicios diarios, educación privada, salud y conectividad a menos de 15 minutos',
    'Tenemos departamentos dúplex, 4 modelos de casas y terrenos de entrega inmediata',
    '3 privadas con amenidades exclusivas independientes',
    'Parque central de 4.2 hectáreas y parque deportivo con cancha de pádel, basketball y futbol 5',
    'Vinte: desarrolladora residencial más grande de México con más de 23 años de experiencia',
    'Más de 50,000 familias en sus comunidades',
    'Cotiza en la Bolsa Mexicana de Valores: garantiza seguridad y profesionalismo'
  ]
}

export const bondades = [
  'Mayor plusvalía en la zona',
  'Doble control de acceso',
  'Seguridad privada las 24hrs',
  'Experiencia y garantía del desarrollador',
  'Cerca de: Paseo Querétaro, Bernardo Quintana, H-E-B, Walmart, Hospital General',
  'Universidades y colegios: Anáhuac, Canadian, Tepeyac, Fontanar, Alberi, Kidu y más',
  'Aeropuerto Intercontinental a 20-25 min'
]

export type PuntoInteres = {
  id: string
  nombre: string
  categoria: string
  tiempo: string
  detalle: string
  destacado?: boolean
}

export const zonaLaVista = {
  titulo: 'Ubicación estratégica',
  subtitulo:
    'Sobre el libramiento Fray Junípero Serra, a 5 minutos de Bernardo Quintana — corredor de mayor plusvalía en el norte de Querétaro.',
  centro: 'La Vista Residencial',
  direccion: 'Anillo Vial Fray Junípero Serra #8900, San Isidro El Marqués, Qro.',
  mapaEmbedUrl:
    'https://maps.google.com/maps?q=Anillo+Vial+Fray+Jun%C3%ADpero+Serra+8900,+Quer%C3%A9taro,+Qro.&t=m&z=14&output=embed',
  mapaUrl:
    'https://www.google.com/maps/search/?api=1&query=Anillo+Vial+Fray+Jun%C3%ADpero+Serra+8900,+Quer%C3%A9taro,+Qro.',
  mensajeAsesor:
    'Antes de hablar de producto, ancla la decisión en ubicación: conectividad vial, servicios diarios, educación, salud y el respaldo de una zona en pleno crecimiento.',
  categoriasOrden: [
    'Comercio',
    'Supermercados',
    'Educación',
    'Salud',
    'Conectividad',
    'Cultura y ocio',
    'Empleo',
    'Vida diaria',
    'Entorno',
  ],
  puntosCercanos: [
    {
      id: 'paseo-queretaro',
      nombre: 'Paseo Querétaro',
      categoria: 'Comercio',
      tiempo: '3-4 min',
      detalle:
        'El centro comercial más grande del Bajío: Liverpool, cines, restaurantes, marcas premium y servicios.',
      destacado: true,
    },
    {
      id: 'bernardo-quintana',
      nombre: 'Av. Bernardo Quintana',
      categoria: 'Conectividad',
      tiempo: '5 min',
      detalle:
        'Eje corporativo y comercial del corredor Juriquilla–El Marqués; acceso rápido a toda la ciudad.',
      destacado: true,
    },
    {
      id: 'heb',
      nombre: 'H-E-B',
      categoria: 'Supermercados',
      tiempo: '5 min',
      detalle: 'Supermercado de referencia para la compra semanal del hogar.',
    },
    {
      id: 'walmart',
      nombre: 'Walmart',
      categoria: 'Supermercados',
      tiempo: '5 min',
      detalle: 'Gran formato con variedad de abarrotes, hogar y consumo diario.',
    },
    {
      id: 'chedraui',
      nombre: 'Chedraui / Comercial Mexicana',
      categoria: 'Supermercados',
      tiempo: '8 min',
      detalle: 'Alternativas de supermercado a pocos minutos del desarrollo.',
    },
    {
      id: 'hospital-general',
      nombre: 'Hospital General de Querétaro',
      categoria: 'Salud',
      tiempo: '5-8 min',
      detalle: 'Atención médica hospitalaria de primer nivel en la zona metropolitana.',
      destacado: true,
    },
    {
      id: 'anahuac',
      nombre: 'Universidad Anáhuac Querétaro',
      categoria: 'Educación',
      tiempo: '12 min',
      detalle: 'Universidad privada de prestigio; referente para familias con hijos en educación superior.',
      destacado: true,
    },
    {
      id: 'colegios-privados',
      nombre: 'Red de colegios privados',
      categoria: 'Educación',
      tiempo: '10-15 min',
      detalle:
        'Canadian School, Tepeyac, Fontanar, Alberi, Kidu, Víctor Frankl, Puerto Alto y Álamos, entre otros.',
    },
    {
      id: 'centro-historico',
      nombre: 'Centro Histórico de Querétaro',
      categoria: 'Cultura y ocio',
      tiempo: '15 min',
      detalle: 'Patrimonio UNESCO, restaurantes, vida cultural y entretenimiento urbano.',
    },
    {
      id: 'aeropuerto',
      nombre: 'Aeropuerto Intercontinental de Querétaro',
      categoria: 'Conectividad',
      tiempo: '20-25 min',
      detalle: 'Conexión a CDMX, Cancún, Monterrey y rutas corporativas nacionales.',
    },
    {
      id: 'parques-industriales',
      nombre: 'Parques industriales El Marqués',
      categoria: 'Empleo',
      tiempo: '10-15 min',
      detalle:
        'Corredor industrial con presencia de empresas automotrices, aeroespacial y manufactura avanzada.',
    },
    {
      id: 'restaurantes-corredor',
      nombre: 'Restaurantes y servicios del corredor',
      categoria: 'Vida diaria',
      tiempo: '5 min',
      detalle: 'Cafés, restaurantes, farmacias, bancos y conveniencia sobre Fray Junípero Serra.',
    },
    {
      id: 'bancos-cines',
      nombre: 'Bancos, cines y servicios financieros',
      categoria: 'Vida diaria',
      tiempo: '5 min',
      detalle: 'Sucursales bancarias y entretenimiento en el corredor comercial cercano.',
    },
    {
      id: 'entorno-plusvalia',
      nombre: 'Zona residencial consolidada',
      categoria: 'Entorno',
      tiempo: 'Entorno inmediato',
      detalle:
        'Desarrollos consolidados, doble acceso y entorno en crecimiento que sostiene la plusvalía.',
    },
  ] satisfies PuntoInteres[],
}

export const grupoVinte = {
  titulo: 'Grupo Vinte',
  subtitulo: 'Respaldo institucional, experiencia y comunidades consolidadas.',
  historia: 'Vinte es una desarrolladora residencial mexicana con más de 23 años de experiencia creando comunidades integrales.',
  metricas: [
    {
      valor: '+23 años',
      etiqueta: 'de experiencia'
    },
    {
      valor: '+50,000',
      etiqueta: 'familias en sus comunidades'
    },
    {
      valor: 'BMV',
      etiqueta: 'empresa que cotiza en bolsa'
    }
  ],
  respaldo: [
    'Desarrolladora residencial mexicana con procesos institucionales',
    'Comunidades planeadas con servicios, amenidades y seguridad',
    'Cotizar en la Bolsa Mexicana de Valores aporta transparencia y profesionalismo',
    'Trayectoria nacional que reduce incertidumbre para el comprador'
  ],
  fraseAsesor: 'Aquí no solo estás eligiendo una vivienda; estás comprando el respaldo de una empresa sólida, con historial y comunidades vivas.'
}

export const laVistaOverview = {
  titulo: 'La Vista Residencial',
  subtitulo:
    'Comunidad planeada de 210 ha con solo 4,000 viviendas, reserva natural y amenidades integradas.',
  narrativa: [
    'La Vista agrupa casas, departamentos y terrenos en clusters como Oliveto, Benevento y Volterra, con plazas comerciales y parques centrales.',
    'Reserva natural de 60 ha, parque central de 6,400 m² y sport park con pádel, basketball y futbol 5.',
    'Acceso controlado único; a 12 min de Los Arcos y de la Universidad Anáhuac. Cercanía a H-E-B, Walmart y Home Depot.'
  ],
  destacados: [
    'Solo 4,000 viviendas en 210 hectáreas',
    '60 ha de reserva natural + 4.4 ha de áreas verdes',
    'Parque central 6,400 m² · Sport park 4,135 m²',
    'Plaza Green Town y Plaza La Vista · acceso controlado'
  ],
  masterPlanImage: '/desarrollos/la-vista/master-plan.png',
  masterPlanStats: [
    { valor: '4,000', etiqueta: 'Viviendas' },
    { valor: '210 ha', etiqueta: 'Superficie total' },
    { valor: '60 ha', etiqueta: 'Reserva natural' },
    { valor: '12 min', etiqueta: 'Los Arcos · Anáhuac' }
  ] as Array<{ valor: string; etiqueta: string }>
}

export const enrichDesarrolloFromStatic = (remote: Desarrollo): Desarrollo => {
  const local = desarrollos.find((item) => item.id === remote.id)
  if (!local) {
    return remote
  }

  return {
    ...remote,
    logo: remote.logo ?? local.logo,
    desarrolladorLogo: remote.desarrolladorLogo ?? local.desarrolladorLogo,
    brochurePdf: remote.brochurePdf ?? local.brochurePdf,
    tarjetasProcesoPdf: remote.tarjetasProcesoPdf ?? local.tarjetasProcesoPdf,
    masterPlanImage: remote.masterPlanImage ?? local.masterPlanImage,
  }
}

export const misionLaGaviaDesarrollador = {
  titulo: 'BBR Habitarea',
  subtitulo: 'Desarrollo y comercialización en exclusiva',
  historia:
    'BBR Habitarea es la empresa que respalda Misión La Gavia. Tiene más de 50 años de experiencia comercializando desarrollos; este es su tercer desarrollo propio, junto a referencias como DEPOINT y Pasaje Álamos.',
  metricas: [
    { valor: '+50', etiqueta: 'Años de experiencia' },
    { valor: '3.er', etiqueta: 'Desarrollo propio BBR' },
    { valor: '105', etiqueta: 'Departamentos en La Gavia' },
  ],
  respaldo: [
    'Comercialización exclusiva BBR Habitarea',
    'Referencia: DEPOINT y Pasaje Álamos',
    'Lista mar26 y simulador alineados a Control Gerencia',
  ],
  fraseAsesor:
    'Presenta primero Misión La Gavia en sala audiovisual: ubicación, bondades y amenidades; después baja a plano, torre y cotización con simulador.',
}

export const misionLaGaviaOverview = {
  titulo: 'Misión La Gavia',
  subtitulo: 'Respiro Urbano · departamentos en Corregidora',
  narrativa: [
    '105 departamentos exclusivos y 20 locales comerciales en dos niveles, en el polo habitacional con mayor proyección de crecimiento y plusvalía del estado.',
    'Condominio con acceso controlado y seguridad privada las 24 hrs. Superficies desde 90.5 m².',
    'Amenidades: juegos infantiles, alberca, pet park, terraza, parque lineal y baños.',
  ],
  destacados: [
    'Respiro Urbano — concepto de diseño',
    '105 deptos · 20 locales comerciales',
    'Corregidora — zona estratégica',
    'Desde $2.3 MDP (precio contado mar26)',
  ],
  guiaAsesor:
    'Invita a sala audiovisual, presenta en TV ubicación y bondades, muestra plano de disponibilidad y cotiza con el simulador. Sigue las tarjetas de proceso al pie de la letra.',
}

export const bondadesMisionLaGavia = [
  '105 exclusivos departamentos y 20 locales comerciales en dos niveles',
  'Polo habitacional con mayor proyección de crecimiento y plusvalía en el estado',
  'Condominio con acceso controlado y seguridad privada las 24 hrs',
  'Zona estratégica: conectividad, comercio, escuelas y vialidades rápidas a minutos',
  'Hospitales San José, H+ y Santiago · UAQ, Tec Milenio, Wexford, Viktor Frankl, Celta',
  'Galerías Querétaro, Plaza Constituyentes, Citadina, Soriana, Walmart, Sam\'s, Esfera, La Comer',
  'Restaurantes en Jardines del Hacienda: Sushi Roll, Tacos el Pata, Rebel Wings, Cielito Querido, Crepería',
  'Amenidades: juegos infantiles, alberca, pet park, terraza, parque lineal y baños',
  'Superficies desde 90.5 m² · esquemas Contado, MSI, 30-70 y Libre (lista mar26)',
]

export const tecnicaDosMinutosMisionLaGavia = {
  titulo: 'Técnica de 2 minutos — Misión La Gavia',
  tiempo: 120,
  puntos: [
    'Misión La Gavia: 105 departamentos y 20 locales comerciales con acceso controlado y seguridad 24 hrs',
    '30 departamentos en preventa exclusiva · superficies desde 90.5 m²',
    'Amenidades: juegos infantiles, alberca, pet park, terraza, parque lineal y baños',
    'Corregidora, Querétaro — entidad con mayor potencial económico, turístico y social del estado',
    'BBR Habitarea respalda el proyecto: +50 años de experiencia, tercer desarrollo propio',
    'Referencias BBR: DEPOINT y Pasaje Álamos',
  ],
}

export const zonaMisionLaGavia = {
  titulo: 'Corregidora · Respiro Urbano',
  subtitulo:
    'Misión La Gavia — zona estratégica con conectividad, comercio, escuelas y servicios esenciales a minutos.',
  centro: 'Misión La Gavia',
  direccion: 'Corregidora, Querétaro',
  mapaEmbedUrl:
    'https://maps.google.com/maps?q=20.5407382,-100.4275012&t=m&z=16&output=embed',
  mapaUrl: 'https://maps.app.goo.gl/Vvqo3neNPWxdmuro8',
  mensajeAsesor:
    'Antes de hablar de torre y precio, ancla ubicación y bondades del entorno: salud, educación, consumo y plusvalía en Corregidora.',
  categoriasOrden: ['Salud', 'Educación', 'Supermercados', 'Centros comerciales', 'Restaurantes'],
  puntosCercanos: [
    {
      id: 'hospital-san-jose-gavia',
      nombre: 'Hospital San José',
      categoria: 'Salud',
      tiempo: 'Zona cercana',
      detalle: 'Referencia hospitalaria para familias que valoran salud a minutos.',
      destacado: true,
    },
    {
      id: 'hospital-hplus-gavia',
      nombre: 'Hospital H+',
      categoria: 'Salud',
      tiempo: 'Zona cercana',
      detalle: 'Opción de atención médica privada en el corredor.',
    },
    {
      id: 'hospital-santiago-gavia',
      nombre: 'Hospital Santiago',
      categoria: 'Salud',
      tiempo: 'Zona cercana',
      detalle: 'Infraestructura de salud complementaria en la zona.',
    },
    {
      id: 'uaq-gavia',
      nombre: 'UAQ',
      categoria: 'Educación',
      tiempo: 'Corredor Querétaro',
      detalle: 'Universidad Autónoma de Querétaro — referencia educativa regional.',
      destacado: true,
    },
    {
      id: 'tec-milenio-gavia',
      nombre: 'Universidad Tec Milenio',
      categoria: 'Educación',
      tiempo: 'Zona cercana',
      detalle: 'Oferta universitaria privada en el entorno.',
    },
    {
      id: 'wexford-gavia',
      nombre: 'Colegio Wexford',
      categoria: 'Educación',
      tiempo: 'Zona cercana',
      detalle: 'Educación privada de referencia para familias.',
    },
    {
      id: 'galerias-gavia',
      nombre: 'Galerías Querétaro',
      categoria: 'Centros comerciales',
      tiempo: 'Corredor',
      detalle: 'Centro comercial ancla para consumo y entretenimiento.',
      destacado: true,
    },
    {
      id: 'plaza-constituyentes-gavia',
      nombre: 'Plaza Constituyentes',
      categoria: 'Centros comerciales',
      tiempo: 'Corredor',
      detalle: 'Plaza comercial y servicios en zona consolidada.',
    },
    {
      id: 'soriana-gavia',
      nombre: 'Soriana',
      categoria: 'Supermercados',
      tiempo: 'Zona cercana',
      detalle: 'Supermercado para compra semanal y consumo diario.',
    },
    {
      id: 'walmart-gavia',
      nombre: 'Walmart',
      categoria: 'Supermercados',
      tiempo: 'Zona cercana',
      detalle: 'Gran formato con abarrotes y hogar.',
    },
    {
      id: 'sams-gavia',
      nombre: "Sam's Club",
      categoria: 'Supermercados',
      tiempo: 'Zona cercana',
      detalle: 'Club de precios para compras por volumen.',
    },
    {
      id: 'la-comer-gavia',
      nombre: 'La Comer',
      categoria: 'Supermercados',
      tiempo: 'Zona cercana',
      detalle: 'Supermercado premium en el corredor.',
    },
    {
      id: 'sushi-roll-gavia',
      nombre: 'Sushi Roll · Jardines del Hacienda',
      categoria: 'Restaurantes',
      tiempo: 'Entorno',
      detalle: 'Oferta gastronómica en la zona de Jardines del Hacienda.',
    },
    {
      id: 'tacos-pata-gavia',
      nombre: 'Tacos el Pata',
      categoria: 'Restaurantes',
      tiempo: 'Entorno',
      detalle: 'Referencia local de comida casual.',
    },
  ],
}

export const zonaPasajeAlamos = {
  titulo: 'Primer cuadro de Álamos',
  subtitulo:
    'Avenida Industrialización #09 — circuito Álamos con restaurantes, supers, bancos y servicios a menos de 1 km.',
  centro: 'Pasaje Álamos',
  direccion: 'Av. Industrialización #09, Álamos 2ª Sección, Querétaro, Qro.',
  mapaEmbedUrl:
    'https://maps.google.com/maps?q=Av.+Industrializaci%C3%B3n+9,+%C3%81lamos+2da+Secc,+76220+Quer%C3%A9taro,+Qro.&t=m&z=15&output=embed',
  mapaUrl: 'https://maps.app.goo.gl/TmuXEeubV1CvK7Y97',
  mensajeAsesor:
    'Antes de hablar de producto, ancla la decisión en ubicación: el único desarrollo mixto en Álamos, con todo a un paso — vivienda, trabajo y consumo sin salir del pasaje.',
  categoriasOrden: [
    'Supermercados',
    'Restaurantes',
    'Café',
    'Bancos',
    'Salud y belleza',
    'Deportes',
    'Parques',
    'Entorno',
  ],
  puntosCercanos: [
    {
      id: 'heb-alamos',
      nombre: 'H-E-B',
      categoria: 'Supermercados',
      tiempo: '< 1 km',
      detalle: 'Supermercado de referencia para compra semanal a pie del desarrollo.',
      destacado: true,
    },
    {
      id: 'walmart-alamos',
      nombre: 'Walmart',
      categoria: 'Supermercados',
      tiempo: '< 1 km',
      detalle: 'Gran formato con abarrotes, hogar y consumo diario.',
    },
    {
      id: 'costco-alamos',
      nombre: 'Costco',
      categoria: 'Supermercados',
      tiempo: '< 1 km',
      detalle: 'Club de precios para compras de volumen y servicios.',
      destacado: true,
    },
    {
      id: 'restaurantes-alamos',
      nombre: 'Restaurantes de autor',
      categoria: 'Restaurantes',
      tiempo: '< 1 km',
      detalle:
        'La Barra Verde, Las Estancia Argentina, Andador 58, Nicos, 52-60, Mochomos, Restaurante el 9.',
      destacado: true,
    },
    {
      id: 'cafes-alamos',
      nombre: 'Cafeterías',
      categoria: 'Café',
      tiempo: '< 1 km',
      detalle: 'MUEN Coffee Shop, Pan de Lucio, Silverio Urban Coffee, Claudinette, D Concha & Nata.',
    },
    {
      id: 'bancos-alamos',
      nombre: 'Bancos',
      categoria: 'Bancos',
      tiempo: '< 1 km',
      detalle: 'Citibanamex, Scotiabank, BBVA, Santander y Sanborns.',
    },
    {
      id: 'salud-alamos',
      nombre: 'Salud y farmacias',
      categoria: 'Salud y belleza',
      tiempo: '< 1 km',
      detalle:
        'Clínica Integral Care, Dental Clinic, Similares, Farmacia Guadalajara, Benavides y centros de belleza.',
    },
    {
      id: 'deportes-alamos',
      nombre: 'Gimnasios y deporte',
      categoria: 'Deportes',
      tiempo: '< 1 km',
      detalle: 'Station 24 Fitness, Troop, FIT Factory, Ponte en Forma, Natación Álamos y cancha de fútbol.',
    },
    {
      id: 'parques-alamos',
      nombre: 'Parques y cultura',
      categoria: 'Parques',
      tiempo: '< 1 km',
      detalle: 'Parque las Hadas, Parque de Álamos, Parroquia de la Inmaculada Concepción, La Fábrica.',
    },
    {
      id: 'centro-historico-qro',
      nombre: 'Centro Histórico de Querétaro',
      categoria: 'Entorno',
      tiempo: 'Minutos',
      detalle: 'Vistas al centro desde rooftops residencial y de oficinas.',
      destacado: true,
    },
    {
      id: 'unico-mixto',
      nombre: 'Único desarrollo mixto en Álamos',
      categoria: 'Entorno',
      tiempo: 'En el predio',
      detalle: 'Residencial + oficinas + retail bajo un mismo pasaje; no hay alternativa comparable en la zona.',
      destacado: true,
    },
  ] satisfies PuntoInteres[],
}

export const pasajeAlamosDesarrollador = {
  titulo: 'Opera Desarrolladora',
  subtitulo: 'Experiencia en proyectos residenciales y centros de negocio desde 2010.',
  historia:
    'Opera Desarrolladora desarrolla Pasaje Álamos, un proyecto de usos mixtos en Álamos 2ª Sección que integra vivienda, oficinas y comercio. Enfoque en funcionalidad, plusvalía y experiencia del usuario.',
  metricas: [
    { valor: 'Desde 2010', etiqueta: 'en el mercado' },
    { valor: '81', etiqueta: 'departamentos' },
    { valor: '57', etiqueta: 'oficinas' },
    { valor: '12', etiqueta: 'modelos residenciales' },
  ],
  respaldo: [
    'Desarrolladora con proyectos residenciales y corporativos en México',
    'Único desarrollo mixto en la zona de Álamos',
    'Productos de nivel medio-alto diseñados para plusvalía',
    'Amenidades de autor: motor lobby, rooftop, alberca, firepit, coworking',
  ],
  fraseAsesor:
    'Aquí no solo eliges m²: eliges un ecosistema donde vivir, trabajar y consumir converge en un solo pasaje.',
}

export const pasajeAlamosOverview = {
  titulo: 'Pasaje Álamos',
  subtitulo: 'Vive, trabaja y consume. Sin salir. A un paso de todo.',
  narrativa: [
    'Proyecto de usos mixtos en Álamos 2ª Sección: residencial, oficinas y locales comerciales bajo un mismo techo.',
    '81 departamentos en 7 niveles y 57 oficinas en 6 niveles, con 4 niveles de estacionamiento.',
    'Motor lobby, rooftops con vista al centro, alberca con firepit, coworking y salas de juntas.',
  ],
  destacados: [
    '81 departamentos · 12 modelos (1, 2 y 3 recámaras)',
    '57 oficinas en 6 niveles',
    '4 niveles de estacionamiento',
    'Locales comerciales y kioscos en planta baja',
    'A un paso de H-E-B, Costco, Walmart, restaurantes y bancos',
  ],
}

export const bondadesPasajeAlamos = [
  'Desarrollo de usos mixtos: residencial, oficinas y comercio',
  '81 departamentos con 12 modelos · 57 oficinas en formato centro de negocios',
  'Ubicación estratégica en Álamos 2ª Sección, Querétaro',
  'Acceso inmediato a vialidades principales y Blvd. Bernardo Quintana',
  'Motor lobby, estacionamiento subterráneo, rooftop y coworking',
  'Integración con zona comercial y servicios a menos de 1 km',
  'Cerca de Centro Histórico, H-E-B, Walmart, Costco, restaurantes y gimnasios',
  'Superficies de ~71 m² a más de 200 m² con terrazas y home office',
]

export const tecnicaDosMinutosPasajeAlamos = {
  titulo: 'Técnica de 2 Minutos',
  tiempo: 120,
  puntos: [
    'Pasaje Álamos es un desarrollo de usos mixtos en Álamos 2ª Sección, Querétaro',
    'Integra vida residencial, espacios de trabajo y comercio en un solo lugar',
    '81 departamentos y 57 oficinas en dos torres con múltiples niveles',
    'Superficies de ~71 m² a más de 200 m², con terrazas, home office y áreas sociales',
    'Sobre Av. Industrialización, a metros de Blvd. Bernardo Quintana',
    'Conectividad al Centro Histórico y alta actividad comercial en la zona',
    'Concepto: reducir traslados y concentrar actividades clave en un solo punto',
    'Desarrollado por Opera Desarrolladora, con experiencia desde 2010',
  ],
}

export const datosBancariosLaVista: DatosBancarios = {
  razonSocial: 'PROMOTORA DE VIVIENDAS INTEGRALES S.A DE C.V.',
  rfc: 'PVI020927QR3',
  banco: 'BANCOMER',
  sucursal: '1823',
  cuenta: '0110130907',
  clabe: '0121-8000-110130-9070',
  concepto: 'NOMBRE, DESARROLLO Y NUM. DE VIVIENDA',
  reportarA: 'cobranza.lavista@vinte.com',
}

/** Datos confirmados con cobranza BBR — fideicomiso del proyecto Pasaje Álamos. */
export const datosBancariosPasajeAlamos: DatosBancarios = {
  razonSocial: 'FIDEICOMISO 6486/2023 GFM',
  rfc: 'FGF230324PZ9',
  banco: 'Banca Mifel',
  sucursal: '—',
  cuenta: '01600640948',
  clabe: '042180016006409483',
  concepto: 'NOMBRE, PRODUCTO Y NUM. DE UNIDAD · PASAJE ÁLAMOS',
  reportarA: 'cobranza@bbrhabitarea.com',
}

/** Datos bancarios para apartado — Misión La Gavia (fideicomiso del proyecto). */
export const datosBancariosMisionLaGavia: DatosBancarios = {
  razonSocial: 'Fideicomiso 9268/2025 GFM',
  rfc: 'FGF250918RF4',
  banco: 'Banca Mifel',
  sucursal: '—',
  cuenta: '01600831603',
  clabe: '042180016008316037',
  concepto: 'NOMBRE, DESARROLLO Y NUM. DE UNIDAD · MISIÓN LA GAVIA',
  reportarA: 'cobranza@bbrhabitarea.com',
}

/** @deprecated Usar getDatosBancarios(desarrolloId, campoConfig) */
export const datosBancarios = datosBancariosLaVista

export const getDatosBancarios = (
  desarrolloId?: string | null,
  campoConfig?: {
    datosBancarios?: Partial<DatosBancarios> | null
  } | null,
): DatosBancarios => {
  let fallback: DatosBancarios = datosBancariosLaVista
  if (desarrolloId === 'pasaje-alamos') {
    fallback = datosBancariosPasajeAlamos
  } else if (desarrolloId === 'mision-la-gavia') {
    fallback = datosBancariosMisionLaGavia
  } else if (desarrolloId && INVESTTI_DESARROLLO_IDS.includes(desarrolloId)) {
    fallback = datosBancariosPasajeAlamos
  }

  const override = campoConfig?.datosBancarios
  if (!override) {
    return fallback
  }

  return {
    razonSocial: override.razonSocial ?? fallback.razonSocial,
    rfc: override.rfc ?? fallback.rfc,
    banco: override.banco ?? fallback.banco,
    sucursal: override.sucursal ?? fallback.sucursal,
    cuenta: override.cuenta ?? fallback.cuenta,
    clabe: override.clabe ?? fallback.clabe,
    concepto: override.concepto ?? fallback.concepto,
    reportarA: override.reportarA ?? fallback.reportarA,
  }
}

export const contactosClaveLaVista: ContactoClave[] = [
  { nombre: 'Paty', rol: 'Actualiza disponibilidades' },
  { nombre: 'Penélope', rol: 'Documentos Enkontrol' },
  { nombre: 'Irwin', rol: 'Cotizaciones/simuladores' },
  { nombre: 'Esteban/Salma', rol: 'Registro visitas caseta' },
  { nombre: 'Lucía', rol: 'Tarjetas de proceso digitales' },
]

export const contactosClavePasajeAlamos: ContactoClave[] = [
  { nombre: 'Gerente comercial', rol: 'Seguimiento prospectos tipo A (24 h / semanal)' },
  { nombre: 'Asesor', rol: 'Seguimiento semanal y registro en CRM / afluencia' },
  { nombre: 'Cobranza BBR', rol: 'Anticipos, datos bancarios y formalización' },
]

export const contactosClaveInvestti: ContactoClave[] = [
  { nombre: 'Control Gerencia Investti', rol: 'Lista vigente, metrajes y condiciones comerciales' },
  { nombre: 'Gerente comercial BBR', rol: 'Seguimiento prospectos tipo A (24 h / semanal)' },
  { nombre: 'Asesor', rol: 'Seguimiento semanal · afluencia y CRM' },
  { nombre: 'Cobranza BBR', rol: 'Apartados, datos bancarios y formalización' },
]

export const getContactosClave = (desarrolloId?: string | null): ContactoClave[] => {
  if (desarrolloId === 'pasaje-alamos') {
    return contactosClavePasajeAlamos
  }
  if (desarrolloId && INVESTTI_DESARROLLO_IDS.includes(desarrolloId)) {
    return contactosClaveInvestti
  }
  return contactosClaveLaVista
}

/** @deprecated Usar getContactosClave(desarrolloId) */
export const contactosClave = contactosClaveLaVista

// Funciones helper
export { formatPrice, formatTicket, roundMoney } from '@/lib/format/money'

export const getClusterById = (id: string): Cluster | undefined => {
  return clusters.find(c => c.id === id)
}

export const getPrototiposByCluster = (clusterId: string): Prototipo[] => {
  return [...prototipos, ...pasajeAlamosPrototipos, ...misionLaGaviaPrototipos].filter(
    (p) => p.clusterId === clusterId && p.activo,
  )
}

export const getPrototipoById = (id: string): Prototipo | undefined => {
  return [...prototipos, ...pasajeAlamosPrototipos, ...misionLaGaviaPrototipos].find((p) => p.id === id)
}

export const getDisponibilidadPlanoByCluster = (clusterId: string): DisponibilidadPlano | undefined => {
  return disponibilidadPlanos.find(plano => plano.clusterId === clusterId)
}

export const getDisponibilidadesByCluster = (clusterId: string): DisponibilidadUnidad[] => {
  return [...disponibilidades, ...pasajeAlamosDisponibilidades, ...misionLaGaviaDisponibilidades].filter(
    (unidad) => unidad.clusterId === clusterId,
  )
}

export const validatePin = (pin: string): Asesor | undefined => {
  return asesores.find(a => a.pin === pin && a.activo)
}