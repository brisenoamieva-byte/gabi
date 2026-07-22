# Garantía SLA — contrato y reporte semanal

## Qué es

Producto comercial de Gabi: no solo CRM, sino **seguimiento medible** con sello semanal (verde / riesgo / rojo) y PDF contractual.

## Dónde configurarlo

1. `/admin/desarrollos` → ficha → **Garantía SLA (contrato)**  
   - Activar contrato  
   - Emails / WhatsApp del dueño  
   - Notas del PDF  
2. `/admin/crm-compliance` → pestaña **Garantía SLA**  
   - Ver sello y checks  
   - Descargar PDF  
   - **Enviar ahora** (prueba forzada)

## Cron

Vercel: lunes `14:00 UTC` (~08:00 Ciudad de México)

`GET/POST /api/cron/garantia-sla-weekly`  
Header: `Authorization: Bearer $CRON_SECRET`

Query opcional: `?desarrolloId=…&force=1`

## Destinatarios

- Emails en `campo_config.garantiaContrato.recipientEmails`
- Más gerentes/admins Gabi del desarrollo
- WhatsApp: `recipientPhones` (plantilla `gabi_crm_pendiente_asesor`)

## Compromisos (v2026.1)

Ver `GARANTIA_SLA_CONTRACT` y `GARANTIA_SLA_TARGETS` en `src/lib/comercial/garantia-sla.ts`.

## Desempeño (AsesorScore)

Pestaña **Desempeño** en `/admin/crm-compliance?tab=desempeno`.

Score 0–100 compuesto (v2026.2): contacto 25% · **speed-to-lead 15%** · funnel 15% · playbook 20% · cadencia 15% · iScore 10%.

Speed-to-lead usa `prospectos.first_contacted_at` (migración `076`, set-once al completar cadencia/playbook de contacto o al salir de etapa `nuevo`). Excluye WhatsApp automático del sistema.

API: `GET /api/admin/crm-compliance/scorecard` · CSV: `.../scorecard/export`.  
Lógica: `src/lib/comercial/asesor-scorecard.ts` + `speed-to-lead.ts`.
