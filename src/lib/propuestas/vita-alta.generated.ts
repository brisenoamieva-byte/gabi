/**
 * Propuesta comercial Vita Alta — borrador inicial a partir de lotificación Fracción 8.
 * Actualizar precios, escenario y detalle de lotes cuando el desarrollador confirme cifras.
 */
import type { PropuestaComercialData } from "@/lib/propuestas/types";

const TOTAL_LOTES = 373;
const LOTE_PROMEDIO_M2 = 105;
const PRECIO_M2_LISTA = 4_200;
const PCT_CONTADO = 0.14;
const INGRESO_TOTAL = TOTAL_LOTES * LOTE_PROMEDIO_M2 * PRECIO_M2_LISTA;
const ABSORCION_MENSUAL = 8;
const MESES_VENTA = Math.ceil(TOTAL_LOTES / ABSORCION_MENSUAL);

export const VITA_ALTA_PROPUESTA_GENERATED: PropuestaComercialData = {
  id: "vita-alta-fraccion-8",
  slug: "vita-alta",
  estado: "borrador",
  meta: {
    titulo: "Vita Alta",
    subtitulo: "Propuesta de comercialización",
    ubicacion: "El Marqués, Querétaro · Carretera Estatal 420 Los Cues–Huimilpan",
    desarrollador: "Grupo FRISA",
    preparadoPara: "Grupo FRISA",
    elaboradoPor: "BBR Habitarea",
    fecha: "junio 2026",
    clasificacion: "Propuesta comercial · Confidencial",
  },
  escenario: {
    totalLotes: TOTAL_LOTES,
    absorcionMensual: ABSORCION_MENSUAL,
    mesesVenta: MESES_VENTA,
    areaTotalM2: TOTAL_LOTES * LOTE_PROMEDIO_M2,
    ingresoTotal: INGRESO_TOTAL,
    precioM2Promedio: PRECIO_M2_LISTA,
    ticketPromedio: LOTE_PROMEDIO_M2 * PRECIO_M2_LISTA,
    lotePromedioM2: LOTE_PROMEDIO_M2,
    pctContado: PCT_CONTADO,
    precioBaseM2: PRECIO_M2_LISTA,
    listasPrecio: 8,
    incrementoLista: 0.02,
    mesesEntreListas: 3,
    pctPublicidad: 0.025,
    presupuestoPublicidad: INGRESO_TOTAL * 0.025,
    publicidadMensual: (INGRESO_TOTAL * 0.025) / MESES_VENTA,
    terrenoMinM2: 105,
    terrenoMaxM2: 128,
  },
  esquemas: [
    { nombre: "Contado", descuento: 0.09, enganche: 1, mesesEnganche: 1, mensualidades: 1, finiquito: 0, pctMensualidades: 0, pctFiniquito: 0 },
    { nombre: "6 MSI", descuento: 0.06, enganche: 0.2, mesesEnganche: 1, mensualidades: 6, finiquito: 0, pctMensualidades: 0, pctFiniquito: 0 },
    { nombre: "12 MSI", descuento: 0.04, enganche: 0.2, mesesEnganche: 1, mensualidades: 12, finiquito: 0, pctMensualidades: 0.8, pctFiniquito: 0 },
    { nombre: "18 MSI", descuento: 0.02, enganche: 0.2, mesesEnganche: 1, mensualidades: 18, finiquito: 0, pctMensualidades: 0.8, pctFiniquito: 0 },
    { nombre: "24 MSI", descuento: 0, enganche: 0.2, mesesEnganche: 1, mensualidades: 24, finiquito: 0, pctMensualidades: 0.8, pctFiniquito: 0 },
    { nombre: "30-70", descuento: 0.03, enganche: 0.3, mesesEnganche: 1, mensualidades: 20, finiquito: 1, pctMensualidades: 0, pctFiniquito: 0.7 },
  ],
  tiposLote: [
    {
      tipo: "Estándar",
      precioM2Lista: PRECIO_M2_LISTA,
      precioM2Contado: PRECIO_M2_LISTA * 0.91,
      precioM26Msi: PRECIO_M2_LISTA * 0.94,
      precioM212Msi: PRECIO_M2_LISTA * 0.96,
      precioM218Msi: PRECIO_M2_LISTA * 0.98,
      precioM224Msi: PRECIO_M2_LISTA,
      precioM23070: PRECIO_M2_LISTA * 1.03,
    },
  ],
  lotes: [],
  tipoCounts: { Estándar: TOTAL_LOTES },
  tasaDescuentoAnual: 0.12,
  publicidad: {
    porcentaje: 0.025,
    total: INGRESO_TOTAL * 0.025,
    mensual: (INGRESO_TOTAL * 0.025) / MESES_VENTA,
    rubros: [
      "Campaña digital (Meta, Google, TikTok)",
      "Material de ventas y renders",
      "Eventos de lanzamiento y referidos",
      "Señalización en campo y accesos",
      "Medios locales y alianzas con brokers",
    ],
  },
  propuestaBbr: {
    exclusiva: true,
    comision: 0.05,
    comisionVentaDirecta: 0.02,
    comisionInmobiliaria: 0.06,
    iva: true,
    pagoComision: "100% a la firma de OC/contrato y pago de enganche",
    equipo: ["Director comercial", "Gerente de ventas", "Asesores de venta", "Marketing", "Tramitología"],
    mesesConstruccion: 24,
  },
  narrativa: {
    quienesSomos:
      "BBR Habitarea es una consultoría inmobiliaria especializada en desarrollos residenciales en el Bajío. Acompañamos al desarrollador desde la estrategia comercial hasta la venta y postventa, con equipos propios en campo y trazabilidad en GABI.",
    estrategia: [
      "Comercialización integral de los 373 lotes habitacionales de Vita Alta (Fracción 8, Ex-Hacienda La Machorra).",
      "Posicionamiento en corredor Los Cues–Huimilpan, dentro del ecosistema Ciudad Marqués impulsado por Grupo FRISA en El Marqués.",
      "Lanzamiento por etapas con listas de precio escalonadas cada 3 meses (+2%).",
      "Mix de venta balanceado: contado, MSI y esquema 30-70 para diferentes perfiles de comprador.",
      "Canales: venta interna BBR, inmobiliarias aliadas, digital, eventos en sitio y referidos.",
      "Operación comercial BBR en exclusiva con reportes semanales de inventario y funnel.",
    ],
    clasificacionLotes:
      "373 lotes habitacionales unifamiliares · cajón tipo 7×15 m (~105 m²) · Etapas 1 y 2 · Fracción 8 Ex-Hacienda La Machorra · Desarrollador: Grupo FRISA",
  },
};
