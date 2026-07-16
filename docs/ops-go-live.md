# Go-live — checklist de confiabilidad Gabi

Antes de ofrecer Gabi a un cliente (o de prometer uptime), confirma esta lista.

## Estado rápido (hoy)

```bash
node scripts/smoke-go-live.mjs
# o
node scripts/smoke-go-live.mjs https://www.gabi.mx
```

También: `GET https://www.gabi.mx/api/health` → debe responder `status: "ok"` (o `degraded` con detalle).

## Continuidad (pérdida de laptop)

Ver [docs/dr-laptop-loss.md](./dr-laptop-loss.md): qué sobrevive, qué se pierde y checklist de vault + segundo admin.

## Infraestructura

- [x] Deploy Production en Vercel (`main`) en verde (CI lint+build)
- [x] `ASESOR_SESSION_SECRET` en Vercel Production
- [x] Health público `/api/health`
- [ ] Monitor externo 24/7 a `/api/health` (UptimeRobot / Better Stack) — **hazlo hoy**
- [ ] Supabase Production con backups / PITR activos (revisar plan)
- [x] Migración `063_partners` aplicada (Alianzas)

## Secretos en Vercel (Production)

Obligatorios (ya suelen estar):

- [x] `NEXT_PUBLIC_SUPABASE_*` + `SUPABASE_SERVICE_ROLE_KEY`
- [x] `GABI_OPERATOR_ACCESS_CODE` / `GABI_MASTER_PASSWORD`
- [x] `ASESOR_SESSION_SECRET`
- [x] `CRON_SECRET`
- [x] `NEXT_PUBLIC_SITE_URL`
- [x] `EMAIL_FROM` + `RESEND_API_KEY`
- [x] `PORTAL_BBR_PASSWORD`
- [x] `PARSEUR_WEBHOOK_SECRET`

Meta Lead Ads (cuando la agencia termine):

- [x] `META_WEBHOOK_VERIFY_TOKEN`
- [ ] `META_APP_SECRET`
- [ ] `META_PAGE_ACCESS_TOKEN`
- [ ] Form ID de Gavia → `campanas.meta_lead_form_id`

Observabilidad (recomendado antes de vender):

- [ ] `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN`

## Monitor externo (5 minutos)

1. Crea cuenta en [UptimeRobot](https://uptimerobot.com) o Better Stack
2. Monitor tipo **HTTP(s)** → URL: `https://www.gabi.mx/api/health`
3. Intervalo: 5 minutos
4. Alerta a tu email/WhatsApp si no es HTTP 200
5. Keyword opcional: `"status":"ok"` (si el monitor lo soporta)

## Piloto / venta ASAP (alcance seguro)

Ofrece primero un **piloto de 1 comercializadora + 1–2 desarrollos** (ej. BBR + Gavia):

Incluye en el piloto:

- Acceso asesores (PIN) + dashboard
- Leads / CRM básico + asignación
- Guardias + marcaje (si aplica caseta)
- Cotizador / disponibilidad del desarrollo
- Alianzas (inmobiliarias) vinculadas a leads
- Reportes admin

Deja explícito “en activación” (no prometido día 1):

- Meta Lead Ads automático (depende de la agencia digital)
- WhatsApp Cloud templates (si aún no están aprobados)
- Multi-empresa hard isolation / SLA formal

## Smoke manual (15 min antes de una demo)

1. `node scripts/smoke-go-live.mjs`
2. Admin → Salud de plataforma: todo verde (incluye 063 Alianzas)
3. Crear un aliado de prueba en `/admin/partners`
4. Vincularlo a un lead de Gavia y filtrar por Aliado
5. Entrada matutina / salida vespertina (guardia corrida) si hay caseta
6. Cotizar una unidad cotizable de Gavia

## Activar Sentry (cuando tengas DSN)

1. Proyecto Next.js en [sentry.io](https://sentry.io)
2. Vercel: `SENTRY_DSN` y `NEXT_PUBLIC_SENTRY_DSN`
3. Redeploy → error de prueba debe aparecer en Sentry

Sin DSN la app no falla: el reporter queda en stand-by.
