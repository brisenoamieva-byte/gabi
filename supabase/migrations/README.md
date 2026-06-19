# Migraciones Supabase (GABI)

Aplica en **SQL Editor** del proyecto, **en orden numérico**, una por query (o varias pegadas si ya conoces dependencias).

## Orden recomendado (comercial)

| # | Archivo | Qué habilita |
|---|---------|----------------|
| 018 | `018_comercial_crm_sembrado.sql` | prospectos, operaciones, cotizaciones, cobranza |
| 019 | `019_campanas.sql` | campañas y atribución |
| 020 | `020_xperience_lead_fields.sql` | calificación, iScore, spam, duplicados |
| 021 | `021_prospecto_nivel_interes.sql` | nivel de interés |
| 022 | `022_expediente_ventas.sql` | expediente_documentos + bucket |
| 023 | **`023_expediente_comisiones.sql` únicamente** | checklist en docs, enganche, comisiones |
| 024 | `024_lead_captura_logs.sql` | logs webhook Parseur |
| 036 | `036_asesores_telefono.sql` | teléfono en asesores |
| 037 | `037_prospecto_qa_satisfaccion.sql` | QA / satisfacción + `prospecto_encuestas` |
| 038 | `038_crm_playbook.sql` | playbook CRM + cola «Siguiente paso» |

Migraciones **001–017** son catálogo, admin, inventario y recorrido (suelen estar ya aplicadas en producción).

## Importante: no ejecutar el 023 duplicado

Existe un borrador antiguo renombrado a:

`023_expediente_checklist_comisiones.sql.deprecated`

Ese archivo crea `solicitudes_comision` con columnas distintas (`precio_base`, `notas_solicitud`, …) que **no coinciden** con la app (`precio_venta`, `monto_comision_total`, `autorizado_por`, …).

Si por error ya corriste el borrador, aplica **`025_solicitudes_comision_align.sql`** después del 023 canónico.

Si ya aplicaste **`023_expediente_comisiones.sql`** (canónico), **no necesitas el 025** — el banner de salud debería marcar comisiones OK.

## Comprobar en Supabase

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'prospectos', 'campanas', 'lead_captura_logs',
    'expediente_documentos', 'solicitudes_comision'
  );
```

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'prospectos'
  AND column_name IN ('calificacion', 'es_duplicado', 'nivel_interes');
```

En local:

```bash
npm run db:verify:migrations   # comprueba 033–038
npm run db:apply:037-038         # requiere SUPABASE_DB_URL o SUPABASE_DB_PASSWORD
npm run db:print:037-038         # imprime SQL para pegar en SQL Editor
npm run db:open-sql-editor       # abre SQL Editor del proyecto
npm run db:smoke:playbook        # tras aplicar, valida tablas + seed piloto
```

En `.env.local` basta con **una** de estas opciones:

```env
SUPABASE_DB_URL=postgresql://postgres:[PASSWORD]@db.[ref].supabase.co:5432/postgres
# o solo:
SUPABASE_DB_PASSWORD=[PASSWORD]
```

Si falta conexión Postgres, pega en SQL Editor (una query):

`supabase/migrations/_bundle_037_038_apply_once.sql`

O por archivo: `037_prospecto_qa_satisfaccion.sql` y luego `038_crm_playbook.sql`.

En admin: banner **Salud de plataforma** (`/admin`) indica migraciones faltantes.
