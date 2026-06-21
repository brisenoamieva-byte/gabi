# WhatsApp + Meta Lead Ads en gabi

Guía para activar notificaciones automáticas de leads (prospecto + asesor en guardia) vía WhatsApp Cloud API.

## Qué hace gabi al recibir un lead

1. **Asigna asesor** por **guardia del día publicada** + **carrusel** (rota entre asesores con guardia hoy).
2. **WhatsApp al prospecto** (template): confirma solicitud y nombra al asesor.
3. **WhatsApp al asesor** (template): alerta con datos del lead.
4. Si el asesor no tiene teléfono o WhatsApp no está configurado → **email** al asesor con link `wa.me` al prospecto.
5. Registra todo en `lead_contact_events`.

Fuentes soportadas:

- Parseur / webhook actual
- `POST /api/leads/capture` (landing propia)
- Meta Lead Ads → `POST /api/webhooks/meta-leads`

---

## Paso 1 — Meta Business Manager

1. Entra a [business.facebook.com](https://business.facebook.com).
2. Crea o selecciona el **Portfolio comercial** del desarrollo (ej. Misión La Gavia).
3. En **Configuración del negocio** → **Cuentas** → **Cuentas de WhatsApp**:
   - Agrega o crea un número WhatsApp Business del desarrollo.
4. En **Configuración del negocio** → **Usuarios** → agrega tu usuario con permisos sobre la WABA.

---

## Paso 2 — App Meta (Developers)

1. [developers.facebook.com](https://developers.facebook.com) → **Crear app** → tipo **Business**.
2. Agrega el producto **WhatsApp**.
3. En WhatsApp → **API Setup**:
   - Copia **Phone number ID** (por desarrollo).
   - Genera un **Access token** permanente (System User en Business Manager recomendado).
4. Agrega el producto **Webhooks** (misma app):
   - Callback URL: `https://www.gabi.mx/api/webhooks/meta-leads`
   - Verify token: el valor que pondrás en `META_WEBHOOK_VERIFY_TOKEN`
   - Suscríbete al objeto **Page** → campo **leadgen**

---

## Paso 3 — Plantillas WhatsApp (obligatorio)

En **WhatsApp Manager** → **Message templates** → **Create template**:

### Template 1 — Prospecto

| Campo | Valor |
|--------|--------|
| Nombre | `gabi_lead_confirmacion_prospecto` |
| Categoría | **Utility** |
| Idioma | Spanish (MEX) |

**Body:**

```
Hola {{1}}, gracias por tu interés en {{2}}.

Recibimos tu solicitud de información. En los próximos minutos {{3}} se pondrá en contacto contigo por este mismo canal.

Equipo {{2}}
```

Variables: `{{1}}` nombre, `{{2}}` desarrollo, `{{3}}` asesor.

### Template 2 — Asesor

| Campo | Valor |
|--------|--------|
| Nombre | `gabi_lead_alerta_asesor` |
| Categoría | **Utility** |
| Idioma | Spanish (MEX) |

**Body:**

```
Nuevo lead en {{1}}: {{2}} · Tel: {{3}} · Campaña: {{4}}.

Por favor contacta en menos de 5 minutos.
```

Variables: desarrollo, nombre prospecto, teléfono, campaña.

### Plantilla 3 — Nudge cumplimiento CRM (asesor)

| Campo | Valor |
|--------|--------|
| Nombre | `gabi_crm_pendiente_asesor` |
| Categoría | **Utility** |
| Idioma | Spanish (MEX) |

**Body:**

```
Hola {{1}}, tienes {{2}} paso(s) vencido(s) en {{3}}.

Prioridad: {{4}}.

Actualiza tu CRM en GABI hoy.
```

Variables: nombre asesor, cantidad vencidos, desarrollo, prioridad (prospecto + paso).

> Se envía solo si hay pasos **vencidos** (no solo pendientes), vía cron de cumplimiento CRM.

> Los nombres deben coincidir exactamente con los del código. La revisión de Meta puede tardar 24–48 h.

---

## Paso 4 — Variables de entorno (Vercel + `.env.local`)

```env
# WhatsApp Cloud API
WHATSAPP_CLOUD_ENABLED=true
WHATSAPP_CLOUD_ACCESS_TOKEN=EAAxxxxx
WHATSAPP_PHONE_NUMBER_ID_MISION_LA_GAVIA=123456789012345
WHATSAPP_ENABLED_DESARROLLO_IDS=mision-la-gavia

# Meta Lead Ads webhook
META_WEBHOOK_VERIFY_TOKEN=tu_token_secreto_largo
META_APP_SECRET=app_secret_de_la_app_meta
META_PAGE_ACCESS_TOKEN=page_token_con_leads_access
META_GRAPH_API_VERSION=v21.0

# Landing (opcional, recomendado)
LEAD_CAPTURE_SECRET=otro_token_secreto

# Email fallback (ya existente)
RESEND_API_KEY=
EMAIL_FROM=gabi <notificaciones@gabi.mx>
NEXT_PUBLIC_SITE_URL=https://www.gabi.mx
```

Para otro desarrollo, usa `WHATSAPP_PHONE_NUMBER_ID_<ID_DESARROLLO>` (guiones → guiones bajos, mayúsculas), ej. `WHATSAPP_PHONE_NUMBER_ID_PASAJE_ALAMOS`.

---

## Paso 5 — Migración 041 en Supabase

Ejecuta en SQL Editor:

`supabase/migrations/_bundle_041_apply_once.sql`

O desde admin salud de plataforma si `db:apply` está habilitado (migración `041`).

---

## Paso 6 — Guardias (asignación carrusel)

1. Admin → **Guardias** → publica la semana.
2. Solo guardias con estado **Publicada** reciben leads.
3. El carrusel rota entre asesores con guardia **hoy**; prioriza el turno vigente (matutino 10–15 h, vespertino 15–20 h, hora México).

---

## Paso 7 — Campañas Meta Lead Ads

1. Admin → **Campañas** → crea campaña del desarrollo.
2. En Meta Ads, al crear el formulario de leads, copia el **Form ID**.
3. Guarda ese ID en la campaña como `meta_lead_form_id` (SQL por ahora):

```sql
update campanas
set meta_lead_form_id = 'TU_FORM_ID_META'
where id = 'uuid-de-la-campana';
```

4. Conecta el webhook de la **Página** de Facebook a la app (paso 2).

---

## Paso 8 — Landing propia

```http
POST https://www.gabi.mx/api/leads/capture
Content-Type: application/json
X-Lead-Capture-Secret: tu_LEAD_CAPTURE_SECRET

{
  "desarrolloId": "mision-la-gavia",
  "campanaId": "uuid-opcional",
  "nombre": "María López",
  "email": "maria@ejemplo.com",
  "telefono": "4421234567",
  "source": "Landing Gavia"
}
```

---

## Prueba

1. `GET /api/admin/whatsapp/test?desarrolloId=mision-la-gavia` (sesión admin) → verifica configuración.
2. `POST /api/admin/whatsapp/test` con `{ "desarrolloId", "telefono" }` → envía template de prueba al teléfono indicado.
3. Simula captura en Admin → Leads → Captura, o webhook Parseur.

---

## Teléfonos de asesores

Actualiza en Admin → **Equipo** el teléfono de cada asesor (10 dígitos México). El mensaje llega a ese número (personal o Business).

---

## Limitaciones actuales

- La conversación posterior sigue en el WhatsApp del asesor (no hay inbox unificado aún).
- Sin teléfono del prospecto: solo se notifica al asesor.
- Sin guardia publicada hoy: lead sin asesor automático (revisar manualmente en Leads).
- Duplicados: no se reenvían notificaciones automáticas.
