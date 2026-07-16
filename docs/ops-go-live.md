# Go-live — checklist de confiabilidad Gabi

Antes de ofrecer Gabi a un cliente (o de prometer uptime), confirma esta lista.

## Infraestructura

- [ ] Deploy Production en Vercel (`main`) en verde
- [ ] Dominio `www.gabi.mx` apunta al deployment correcto
- [ ] Supabase Production con backups / PITR activos (plan Supabase)
- [ ] Migraciones SQL aplicadas (última: `063_partners.sql` y anteriores)

## Secretos en Vercel (Production + Preview)

Obligatorios:

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `GABI_MASTER_PASSWORD`
- [ ] `ASESOR_SESSION_SECRET` (nuevo secreto largo; no reutilizar SERVICE_ROLE)
- [ ] `CRON_SECRET`
- [ ] `NEXT_PUBLIC_SITE_URL=https://www.gabi.mx`
- [ ] `EMAIL_FROM` + `RESEND_API_KEY` (si hay notificaciones)

Según producto:

- [ ] `PORTAL_BBR_PASSWORD`
- [ ] Google Drive (`GOOGLE_SERVICE_ACCOUNT_*`, folder IDs)
- [ ] Meta Lead Ads (`META_WEBHOOK_VERIFY_TOKEN`, `META_APP_SECRET`, `META_PAGE_ACCESS_TOKEN`)
- [ ] WhatsApp Cloud (`WHATSAPP_*`) si aplica
- [ ] `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` (recomendado)

## Confiabilidad operativa

- [ ] CI verde en GitHub (workflow `.github/workflows/ci.yml`)
- [ ] Monitor externo apuntando a `https://www.gabi.mx/api/health` (esperar HTTP 200)
- [ ] Probar un lead de punta a punta en el desarrollo piloto
- [ ] Confirmar crons Vercel (CRM digest / cadencia) con `CRON_SECRET`

## Activar Sentry (cuando tengas DSN)

1. Crea proyecto Next.js en [sentry.io](https://sentry.io)
2. Copia el DSN a Vercel: `SENTRY_DSN` y `NEXT_PUBLIC_SENTRY_DSN`
3. Redeploy
4. Provoca un error de prueba y verifica que llega a Sentry

Sin DSN la app no falla: el reporter queda en stand-by.

## Health check

```http
GET https://www.gabi.mx/api/health
```

Respuesta `status: ok | degraded | down`.  
`down` → HTTP 503 (monitor debe alertar).
