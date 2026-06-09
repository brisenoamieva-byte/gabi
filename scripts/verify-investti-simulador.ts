import data from "../public/data/investti-simulador-lotes.json";
import { simularLoteInvestti } from "../src/lib/corredor/investti-simulador";

const lote = data.lotes.find(
  (l) => l.desarrollo === "Cañadas_del_Valle" && l.manzana === "_1" && l.lote === "3",
)!;

const sim = simularLoteInvestti(lote, { fechaBase: new Date(2026, 1, 4) });

const checks: [string, number, number][] = [
  ["contado", sim.esquemas.find((e) => e.id === "contado")!.total, lote.contado!],
  ["m6", sim.esquemas.find((e) => e.id === "m6")!.total, lote.m6!],
  ["m12", sim.esquemas.find((e) => e.id === "m12")!.total, lote.m12!],
  ["m24", sim.esquemas.find((e) => e.id === "m24")!.total, lote.m24!],
  ["m60", sim.esquemas.find((e) => e.id === "m60")!.total, lote.m60!],
];

let ok = true;
for (const [id, calc, excel] of checks) {
  const diff = Math.abs(calc - excel);
  const pass = diff < 2;
  console.log(id, pass ? "OK" : "FAIL", { calc, excel, diff });
  if (!pass) ok = false;
}

const m6 = sim.esquemas.find((e) => e.id === "m6")!;
console.log("m6 mensualidad", m6.mensualidad, "enganche", m6.engancheTotal);

const tabla = m6.tablaAmortizacion;
const sumPagos = tabla.reduce((s, f) => s + f.aportacion, 0);
const tablaOk = tabla.length === 7 && Math.abs(sumPagos - m6.total) < 2 && tabla.at(-1)?.saldoFinal === 0;
console.log("tabla m6", tablaOk ? "OK" : "FAIL", { filas: tabla.length, sumPagos, total: m6.total });
if (!tablaOk) ok = false;

process.exit(ok ? 0 : 1);
