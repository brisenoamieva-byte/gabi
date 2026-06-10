import {
  buildMesesPagoPlan,
  calcAportacionDeseadaInvestti,
  calcResumenDescuentoInvestti,
  pagoConDescuentoInvestti,
  simularPlanPersonalizadoInvestti,
  toFilasProspecto,
} from "../src/lib/corredor/investti-simulador";

const precioContado = 3217759.567389288;

const aport = calcAportacionDeseadaInvestti(precioContado, 0.3, 1, 70, 1);
const excelAport = 45346.29027247697;
const aportOk = Math.abs(aport - excelAport) < 0.01;
console.log("aportación deseada", aportOk ? "OK" : "FAIL", { aport, excelAport });

const plan = simularPlanPersonalizadoInvestti("simate", {
  precioContado,
  enganchePct: 0.3,
  engancheDiferidoMeses: 1,
  plazoMeses: 70,
  aportacionCadaMeses: 1,
});

const engancheRow = plan.tablaAmortizacion.find((f) => f.numero === 1);
const row2 = plan.tablaAmortizacion.find((f) => f.numero === 2);
const lastPay = plan.tablaAmortizacion.find((f) => f.numero === 71);

const checks = [
  ["enganche mes 1", engancheRow?.aportacion, 965327.8702167864],
  ["saldo mes 2", row2?.saldoInicial, 2274956.0141442264],
  ["pago mes 2", row2?.aportacion, excelAport],
  ["saldo final mes 71", lastPay?.saldoFinal, 0],
] as const;

let ok = aportOk;
for (const [label, calc, expected] of checks) {
  const diff = Math.abs((calc ?? 0) - expected);
  const pass = diff < 2;
  console.log(label, pass ? "OK" : "FAIL", { calc, expected, diff });
  if (!pass) ok = false;
}

const invalid = simularPlanPersonalizadoInvestti("simate", {
  precioContado,
  enganchePct: 0.3,
  engancheDiferidoMeses: 1,
  plazoMeses: 70,
  aportacionCadaMeses: 1,
});
const hasPlazoError = invalid.errores.some((e) => e.includes("MÁXIMO 36"));
console.log("validación plazo simate", hasPlazoError ? "OK" : "FAIL", invalid.errores);

const semestral = simularPlanPersonalizadoInvestti("canadas_del_valle", {
  precioContado: 1100196.61,
  enganchePct: 0.3,
  engancheDiferidoMeses: 1,
  plazoMeses: 60,
  aportacionCadaMeses: 6,
  mensualidadDeseada: 7000,
});

const mesesSem = buildMesesPagoPlan(1, 60, 6);
const aportSem = calcAportacionDeseadaInvestti(1100196.61, 0.3, 1, 60, 6, 7000);
const filasSem = toFilasProspecto(semestral.tablaAmortizacion);

const pagosSem = filasSem.filter((f) => f.tipo !== "enganche");
const mes7 = semestral.tablaAmortizacion.find((f) => f.numero === 7);
const mes8 = semestral.tablaAmortizacion.find((f) => f.numero === 8);
const mes61 = semestral.tablaAmortizacion.find((f) => f.numero === 61);
const semChecks = [
  ["meses aportación semestral", mesesSem.length, 10],
  ["aportación periódica calculada > 0", aportSem > 0, true],
  ["pagos en tabla (enganche + 60 meses)", pagosSem.length, 61],
  ["mes 8 solo mensualidad", mes8?.aportacion, 7000],
  ["mes 7 incluye mensualidad", (mes7?.aportacionManual ?? 0) >= 7000, true],
  ["mes 7 incluye aportación", (mes7?.aportacionProgramada ?? 0) > 0, true],
  ["mes 7 pago total > mensualidad", (mes7?.aportacion ?? 0) > 7000, true],
  ["saldo final semestral", semestral.tablaAmortizacion.at(-1)?.saldoFinal, 0],
  ["última aportación cierra saldo", mes61?.saldoFinal, 0],
] as const;

for (const [label, calc, expected] of semChecks) {
  const pass =
    typeof expected === "boolean"
      ? calc === expected
      : Math.abs(Number(calc) - Number(expected)) < 2;
  console.log(label, pass ? "OK" : "FAIL", { calc, expected });
  if (!pass) ok = false;
}

const casoAsesor = simularPlanPersonalizadoInvestti("canadas_del_valle", {
  precioContado: 1100196.6,
  enganchePct: 0.25,
  engancheDiferidoMeses: 1,
  plazoMeses: 24,
  aportacionCadaMeses: 6,
  mensualidadDeseada: 8000,
});

const aportCaso = calcAportacionDeseadaInvestti(1100196.6, 0.25, 1, 24, 6, 8000);
const mes25 = casoAsesor.tablaAmortizacion.find((f) => f.numero === 25);
const mes7caso = casoAsesor.tablaAmortizacion.find((f) => f.numero === 7);
const casoChecks = [
  ["aportación caso asesor > 100k", aportCaso > 100000, true],
  ["mes 7 caso incluye aportación", (mes7caso?.aportacionProgramada ?? 0) > 100000, true],
  ["mes 25 no balloon masivo", (mes25?.aportacion ?? 0) < 500000, true],
  ["mes 25 pago cercano a mes 7", Math.abs((mes25?.aportacion ?? 0) - (mes7caso?.aportacion ?? 0)) < 5, true],
  ["saldo final caso asesor", casoAsesor.tablaAmortizacion.at(-1)?.saldoFinal, 0],
  [
    "resumen = tabla (mens + aportación)",
    casoAsesor.montoMesAportacion,
    mes7caso?.aportacion ?? 0,
  ],
  [
    "resumen semestral = tabla mes 7",
    semestral.montoMesAportacion,
    mes7?.aportacion ?? 0,
  ],
] as const;

for (const [label, calc, expected] of casoChecks) {
  const pass =
    typeof expected === "boolean"
      ? calc === expected
      : Math.abs(Number(calc) - Number(expected)) < 2;
  console.log(label, pass ? "OK" : "FAIL", { calc, expected });
  if (!pass) ok = false;
}

const planDesc = simularPlanPersonalizadoInvestti("simate", {
  precioContado,
  enganchePct: 0.3,
  engancheDiferidoMeses: 1,
  plazoMeses: 70,
  aportacionCadaMeses: 1,
});

const resDesc = calcResumenDescuentoInvestti(planDesc.tablaAmortizacion, 0.02);
const filaEng = planDesc.tablaAmortizacion.find((f) => f.numero === 1)!;
const filaAport = planDesc.tablaAmortizacion.find((f) => f.numero === 2)!;
const descChecks = [
  ["total sin descuento Excel", resDesc.totalSinDescuento, 4139568.1892901794],
  ["total con descuento Excel", resDesc.totalConDescuento, 4056776.8255043756],
  ["enganche sin descuento", pagoConDescuentoInvestti(filaEng, resDesc.factorMensAport), 965327.8702167864],
  ["aportación con 2% desc", pagoConDescuentoInvestti(filaAport, resDesc.factorMensAport), 44163.55650410834],
  ["requiere autorización 2%", resDesc.requiereAutorizacion, true],
  [
    "1.5% sin autorización",
    calcResumenDescuentoInvestti(planDesc.tablaAmortizacion, 0.015).requiereAutorizacion,
    false,
  ],
  [
    "tabla prospecto con descuento",
    toFilasProspecto(planDesc.tablaAmortizacion, 0, 0.02)[1]?.pagoTotal,
    44163.55650410834,
  ],
] as const;

for (const [label, calc, expected] of descChecks) {
  const pass =
    typeof expected === "boolean"
      ? calc === expected
      : label.includes("total")
        ? Math.abs(Number(calc) - Number(expected)) < 1
        : Math.abs(Number(calc) - Number(expected)) < 0.02;
  console.log(label, pass ? "OK" : "FAIL", { calc, expected });
  if (!pass) ok = false;
}

process.exit(ok && hasPlazoError ? 0 : 1);
