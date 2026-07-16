#!/usr/bin/env node
/**
 * Smoke go-live: valida que producción responde.
 * Uso: node scripts/smoke-go-live.mjs
 *      node scripts/smoke-go-live.mjs https://www.gabi.mx
 */

const base = (process.argv[2] || process.env.NEXT_PUBLIC_SITE_URL || "https://www.gabi.mx").replace(
  /\/$/,
  "",
);

const endpoints = [
  { path: "/api/health", expectJson: true },
  { path: "/", expectJson: false },
  { path: "/acceso", expectJson: false },
];

async function check(path, expectJson) {
  const url = `${base}${path}`;
  const started = Date.now();
  const response = await fetch(url, {
    headers: { Accept: expectJson ? "application/json" : "text/html" },
    redirect: "follow",
  });
  const ms = Date.now() - started;
  let detail = `HTTP ${response.status} · ${ms}ms`;

  if (expectJson) {
    const body = await response.json();
    detail += ` · status=${body.status ?? "?"}`;
    if (body.status === "down" || response.status >= 500) {
      return { ok: false, url, detail, body };
    }
    if (body.status === "degraded") {
      return { ok: true, warn: true, url, detail, body };
    }
    return { ok: response.ok, url, detail, body };
  }

  const text = await response.text();
  const hasHtml = text.includes("<html") || text.includes("<!DOCTYPE");
  return {
    ok: response.ok && hasHtml,
    url,
    detail: `${detail}${hasHtml ? "" : " · sin HTML"}`,
  };
}

async function main() {
  console.log(`gabi smoke · ${base}\n`);
  let failed = 0;
  let warned = 0;

  for (const item of endpoints) {
    try {
      const result = await check(item.path, item.expectJson);
      if (!result.ok) {
        failed += 1;
        console.log(`FAIL  ${result.url}`);
        console.log(`      ${result.detail}`);
        if (result.body) {
          console.log(`      ${JSON.stringify(result.body.checks ?? result.body)}`);
        }
      } else if (result.warn) {
        warned += 1;
        console.log(`WARN  ${result.url}`);
        console.log(`      ${result.detail}`);
      } else {
        console.log(`OK    ${result.url}`);
        console.log(`      ${result.detail}`);
      }
    } catch (error) {
      failed += 1;
      console.log(`FAIL  ${base}${item.path}`);
      console.log(`      ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log("");
  if (failed) {
    console.log(`Resultado: ${failed} fallo(s). No listo para piloto.`);
    process.exit(1);
  }
  if (warned) {
    console.log(`Resultado: OK con ${warned} aviso(s). Revisa degraded en /api/health.`);
    process.exit(0);
  }
  console.log("Resultado: OK — superficie básica responde.");
}

main();
