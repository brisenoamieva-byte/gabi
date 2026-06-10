import { evaluarAutorizacionesInvestti } from "../src/lib/corredor/investti-autorizaciones";

let ok = true;

const checks = [
  [
    "descuento 2% requiere auth",
    evaluarAutorizacionesInvestti({
      desarrolloId: "simate",
      descuentoFraccion: 0.02,
      plazoMeses: 24,
    }).descuento,
    true,
  ],
  [
    "descuento 1.5% sin auth",
    evaluarAutorizacionesInvestti({
      desarrolloId: "simate",
      descuentoFraccion: 0.015,
      plazoMeses: 24,
    }).descuento,
    false,
  ],
  [
    "plazo mayor simate",
    evaluarAutorizacionesInvestti({
      desarrolloId: "simate",
      descuentoFraccion: 0,
      plazoMeses: 70,
    }).plazoMayor,
    true,
  ],
  [
    "mensualidad baja simate",
    evaluarAutorizacionesInvestti({
      desarrolloId: "simate",
      descuentoFraccion: 0,
      plazoMeses: 24,
      mensualidadDeseada: 8000,
      aportacionCadaMeses: 6,
    }).mensualidadBaja,
    true,
  ],
  [
    "mensualidad ok canadas",
    evaluarAutorizacionesInvestti({
      desarrolloId: "canadas-del-valle",
      descuentoFraccion: 0,
      plazoMeses: 24,
      mensualidadDeseada: 8000,
      aportacionCadaMeses: 6,
    }).mensualidadBaja,
    false,
  ],
] as const;

for (const [label, calc, expected] of checks) {
  const pass = calc === expected;
  console.log(label, pass ? "OK" : "FAIL", { calc, expected });
  if (!pass) ok = false;
}

process.exit(ok ? 0 : 1);
