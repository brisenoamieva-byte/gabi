# Alta de un desarrollo nuevo (sin Cursor)

Gabi debe permitir armar un desarrollo de **campo** desde el admin. La paridad total con La Gavia (simulador propio + plano interactivo + plantas) sigue requiriendo ingeniería; el resto no.

## Qué ya se hace 100% en Gabi

| Paso | Dónde |
|------|--------|
| Comercializadora | `/admin/catalogo` → Comercializadoras |
| Crear desarrollo | `/admin/catalogo` → Desarrollos → **Nuevo desarrollo** |
| Clusters y prototipos | `/admin/catalogo` → Producto |
| Inventario / sembrado | `/admin/sembrado` o `/admin/inventario` (CSV) |
| Guión / recorrido | `/admin/guion` |
| Cotizador genérico (enganche, apartado) | `/admin/desarrollos` → ficha → **Cotizador, bancarios y Drive** |
| Datos bancarios | misma ficha |
| Documentos PDF | `/admin/documentos` |
| Campañas (+ Meta form ID) | `/admin/campanas` |
| Asesores | `/admin/asesores` |
| Playbook CRM | `/admin/crm-playbook` |
| Activar / pausar | `/admin/desarrollos` → Estado operativo |
| Checklist de progreso | `/admin/desarrollos` → Checklist operativo |

El checklist marca con ★ lo obligatorio para “listo para campo”: catálogo, clusters, prototipos e inventario.

## Migración requerida

Aplica en Supabase SQL Editor:

`supabase/migrations/064_desarrollo_campo_config.sql`

Sin esa columna no se guardan cotizador/bancarios/Drive desde admin. El health check (`064`) lo reporta.

## Drive (expedientes)

1. Crea carpeta en Google Drive y comparte con la cuenta de servicio.
2. Pega el **ID de carpeta** en la ficha del desarrollo, **o** define en Vercel:

`GOOGLE_DRIVE_<ID_EN_MAYUSCULAS_CON_GUIONES_BAJOS>_FOLDER_ID`

Ejemplo: desarrollo `torre-norte` → `GOOGLE_DRIVE_TORRE_NORTE_FOLDER_ID`.

## Flujo recomendado (½–1 día)

1. Crear desarrollo en Catálogo (nombre, ID, colores, logos).
2. Producto: un cluster + prototipos.
3. Importar inventario (CSV) en Sembrado/Inventario.
4. Editar guión en Guión.
5. En la ficha del desarrollo: bancarios + % enganche + Drive.
6. Documentos, campañas, asignar asesores.
7. Activar desarrollo y probar `/recorrido`, `/disponibilidad`, `/cotizador`, `/mis-leads`.

## Qué NO se arma solo en admin (aún)

- Simulador tipo La Gavia / Pasaje (esquemas propios + PDF dedicado)
- Plano interactivo de edificios
- Plantas tipológicas por lado/nivel
- Templates DOCX de expediente específicos del proyecto

Esos se agregan como producto de ingeniería reutilizando el pack de La Gavia. El checklist lo indica en la nota “self-serve”.

## Contraseña portal B2B

Tras crear comercializadora, Vercel necesita `PORTAL_PASSWORD_<SLUG>` (el admin lo recuerda en el formulario).
