import {
  computePasajeSimulador,
  type PasajeSimuladorInput,
} from "../src/lib/cotizador/pasaje-simulador";

const tests: Array<{ label: string; input: PasajeSimuladorInput; expected?: Record<string, number> }> = [
  {
    label: "Depto 101 (Modelo 1) · Contado",
    input: {
      precioLista: 9081302.731901368,
      tipo: "departamento",
      esquema: "contado",
      fechaCotizacion: new Date(2026, 4, 1),
    },
    expected: { precioContado: 7637375.6 },
  },
  {
    label: "Depto 101 · Contado diferido (50% + 33 meses)",
    input: {
      precioLista: 9081302.731901368,
      tipo: "departamento",
      esquema: "contado-diferido",
      fechaCotizacion: new Date(2026, 4, 1),
    },
  },
  {
    label: "Depto 101 · MSI (30% + N hasta entrega)",
    input: {
      precioLista: 9081302.731901368,
      tipo: "departamento",
      esquema: "msi",
      fechaCotizacion: new Date(2026, 4, 1),
    },
  },
  {
    label: "Depto 101 · 30-30-40",
    input: {
      precioLista: 9081302.731901368,
      tipo: "departamento",
      esquema: "30-30-40",
      fechaCotizacion: new Date(2026, 4, 1),
    },
  },
  {
    label: "Depto 507 (3B) · 30-30-40 · mayo 2026",
    input: {
      precioLista: 8725316,
      tipo: "departamento",
      esquema: "30-30-40",
      fechaCotizacion: new Date(2026, 4, 27),
    },
  },
  {
    label: "Depto 101 · Libre (defaults 20/15/65)",
    input: {
      precioLista: 9081302.731901368,
      tipo: "departamento",
      esquema: "libre",
      fechaCotizacion: new Date(2026, 4, 1),
    },
  },
  {
    label: "Depto 101 · Libre con finiquito custom (jul-2028)",
    input: {
      precioLista: 9081302.731901368,
      tipo: "departamento",
      esquema: "libre",
      fechaCotizacion: new Date(2026, 4, 1),
      libre: {
        enganchePct: 0.25,
        mensualidadesPct: 0.2,
        fechaFiniquito: new Date(2028, 6, 15),
      },
    },
  },
  {
    label: "Oficina 206 · Libre sin mens. (pago dic-2027, finiquito mar-2029)",
    input: {
      precioLista: 9170526.00838724,
      tipo: "oficina",
      esquema: "libre-sin-mensualidades",
      fechaCotizacion: new Date(2026, 4, 1),
      libreSinMens: {
        enganchePct: 0.2,
        pagoPct: 0.3,
        fechaPagoIntermedio: new Date(2027, 11, 15),
        fechaFiniquito: new Date(2029, 2, 17),
      },
    },
  },
  {
    label: "Caso de error · pago > finiquito",
    input: {
      precioLista: 9081302.73,
      tipo: "departamento",
      esquema: "libre-sin-mensualidades",
      fechaCotizacion: new Date(2026, 4, 1),
      libreSinMens: {
        enganchePct: 0.2,
        pagoPct: 0.2,
        fechaPagoIntermedio: new Date(2029, 2, 17),
        fechaFiniquito: new Date(2028, 5, 1),
      },
    },
  },
];

const fmt = (n: number | undefined) =>
  typeof n === "number" && Number.isFinite(n)
    ? n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 })
    : "-";

for (const test of tests) {
  console.log("\n========", test.label, "========");
  const result = computePasajeSimulador(test.input);
  console.log(
    JSON.stringify(
      {
        esquema: result.esquema,
        precioLista: fmt(result.precioLista),
        precioContado: fmt(result.precioContado),
        precioTotal: fmt(result.precioTotal),
        descuentoEfectivo: `${(result.descuentoEfectivoPct * 100).toFixed(2)}%`,
        enganche: fmt(result.enganche),
        enganchePct: `${(result.enganchePct * 100).toFixed(1)}%`,
        numMensualidades: result.numMensualidades,
        mensualidadCliente: fmt(result.mensualidadCliente),
        pagoIntermedio: fmt(result.pagoIntermedio),
        finiquito: fmt(result.finiquito),
        rentaMensual: fmt(result.rentaMensual),
        rendimientoAnual: `${(result.rendimientoTotalAnual * 100).toFixed(2)}%`,
        error: result.error ?? "ok",
      },
      null,
      2,
    ),
  );
}
