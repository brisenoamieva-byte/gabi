# Continuidad si pierdes la laptop (Gabi)

**Respuesta corta:** `www.gabi.mx` sigue vivo. Lo que se cae es **tu capacidad de operar** si no tienes accesos y secretos fuera de esa máquina.

## Qué NO se pierde con la laptop

| Pieza | Dónde vive |
|---|---|
| Código | GitHub `brisenoamieva-byte/gabi` |
| Deploy + env de producción | Vercel (equipo Lumien / proyecto `gabi`) |
| Base de datos + storage | Supabase (proyecto de producción) |
| Dominio / DNS | GoDaddy → Vercel |
| Correo `@gabi.mx` | Google Workspace |
| Expedientes en Drive | Google Drive (cuenta de servicio en Vercel) |
| Assets de la app | `public/` en el repo |

## Qué SÍ se pierde (si no está respaldado)

| Pieza | Riesgo |
|---|---|
| `.env.local` | Solo en la laptop (gitignored) |
| Carpeta `.tmp/` | Extractos de trabajo; no van al repo |
| Llave SSH `~/.ssh/...` | Necesitas PAT o nueva llave en GitHub |
| WIP sin push | Código no subido a `main` |
| Códigos 2FA solo en el teléfono/laptop | Quedas fuera de GitHub/Vercel/Supabase |

## Recuperación en máquina nueva (&lt; 2 h si el vault está bien)

1. Instalar Node 24 + Git  
2. Abrir **1Password / vault “Gabi prod”**  
3. Entrar a GitHub → clonar `gabi` (HTTPS + PAT, o nueva SSH)  
4. Entrar a Vercel → confirmar proyecto y domains  
5. Entrar a Supabase → confirmar proyecto  
6. `npm ci` + crear `.env.local` copiando valores del vault (nombres en `.env.example`)  
7. `npm run smoke:go-live`  
8. Seguir desarrollando / aplicando migraciones

## Must (esta semana)

1. **Vault de secretos** (1Password / Bitwarden) con:
   - GitHub (password + recovery 2FA)
   - Vercel
   - Supabase (dashboard + DB password)
   - GoDaddy
   - Google Workspace + Cloud (service account)
   - Resend
   - Todos los env de Vercel Production (copiar nombres desde dashboard; valores al vault)
2. **2FA + recovery codes** impresos / en vault para cada cuenta  
3. **Segundo admin de confianza** en GitHub, Vercel, Supabase, GoDaddy, Google Workspace  
4. Confirmar **backups / PITR** en Supabase (o `pg_dump` semanal cifrado a Drive)  
5. Monitor a `https://www.gabi.mx/api/health`  
6. PAT de GitHub en el vault (por si se pierde la SSH)

## Should

7. No guardar PDFs bancarios / plantillas solo en `.tmp` — Drive o `public/` según corresponda  
8. Completar en Vercel (cuando existan): `META_APP_SECRET`, `META_PAGE_ACCESS_TOKEN`, WhatsApp, Sentry  
9. Considerar repo en **organización** GitHub con 2 owners (hoy es cuenta personal, 1 colaborador)

## Nice

10. Simulacro anual: laptop nueva → clonar → vault → smoke en &lt; 2 horas  
11. Sentry activo  

## Inventario de accesos (sin secretos)

| Sistema | Para qué |
|---|---|
| GitHub `brisenoamieva-byte/gabi` | Código + CI |
| Vercel proyecto `gabi` | Deploy, env, dominios |
| Supabase (ref del proyecto en `NEXT_PUBLIC_SUPABASE_URL`) | DB, Auth, Storage |
| GoDaddy | DNS `gabi.mx` / `dmb.mx` |
| Google Workspace | Correo |
| Google Cloud / Drive | Expedientes SA |
| Resend | Email transaccional |
| Meta Business / Developers | Lead Ads (cuando se active) |

Detalle operativo diario: [ops-go-live.md](./ops-go-live.md).
