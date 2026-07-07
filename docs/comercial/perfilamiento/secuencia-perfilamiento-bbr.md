# Secuencia de perfilamiento BBR — referencia operativa

Documentos fuente (mayo 2025):

- [Secuencia-Perfilamiento-Resumen.pdf](./Secuencia-Perfilamiento-Resumen.pdf)
- [Secuencia-Perfilamiento-Detalle.pdf](./Secuencia-Perfilamiento-Detalle.pdf)

## Objetivo estratégico

**Llevar al prospecto a visitar el desarrollo.** No cerrar venta por teléfono ni WhatsApp; el canal digital sirve para generar confianza, perfilar y **agendar la visita**.

## Principios (síntesis BBR + mejores prácticas)

1. **Velocidad al primer contacto** — WhatsApp en minutos, no en 24 h.
2. **Multicanal alternado** — WhatsApp y llamada se complementan; si uno no responde, el otro sigue.
3. **Pausas intencionales** — Días 2, 5 y 6 sin toques para no saturar (efecto “no perseguidor”).
4. **Ventanas horarias** — Priorizar 9–11 h, 12–14 h y 17–19 h (hora local del prospecto).
5. **Buzón de voz con valor** — Cada llamada sin respuesta deja mensaje breve: quién eres, desarrollo, invitación a visita.
6. **Cierre por caducidad** — Tras ~8 días y hasta 10 intentos sin respuesta → marcar **Perdido** y liberar energía del asesor.
7. **Si contesta** — Dejar de insistir en la cadencia; pasar a **agendar visita** y documentar perfil.

## Cadencia de contacto (8 días, máx. 10 toques)

| Día | Acción 1 | Acción 2 | Notas |
|-----|----------|----------|-------|
| **0** | WhatsApp (inmediato) | Llamada 2–5 h después | Si no contesta → buzón |
| **1** | Llamada 12–14 h | WhatsApp 17–19 h | |
| **2** | — Pausa — | | |
| **3** | WhatsApp 9–11 h | Llamada 17–19 h | |
| **4** | Llamada 12–14 h | WhatsApp 17–19 h | |
| **5–6** | — Pausa — | | |
| **7** | WhatsApp 9–11 h (último mensaje) | Llamada 12–14 h | Sin respuesta → **Perdido** |

### Rama de respuesta

```
Lead entra
    → WhatsApp inmediato
    → ¿Responde?
         Sí → Agendar visita (salir de cadencia)
         No → Llamada D0 → continuar cadencia días 1, 3, 4, 7
```

## Cómo se traduce al playbook GABI

El CRM **no replica los 10 toques como 10 checkboxes** (genera fricción y no refleja la realidad del asesor). En su lugar, el playbook define **hitos medibles** alineados a la cadencia:

| Hito GABI | Alineación BBR | SLA |
|-----------|----------------|-----|
| WhatsApp de bienvenida | Día 0, acción 1 | 1 h desde alta del lead |
| Primera llamada (mismo día) | Día 0, acción 2 | 5 h desde alta |
| Email y teléfono registrados | Datos para multicanal | 48 h (auto) |
| Visita agendada | Meta del perfilamiento | 7 días desde alta |
| Recorrido guiado | Post-visita | 72 h en etapa Contactado |
| Necesidades perfiladas | Presupuesto, producto, plazo | 72 h |
| Cotización enviada | Post-recorrido | 96 h |
| Seguimiento documentado | Negociación | 7 días |

La **cadencia detallada** (días 1, 3, 4, 7) queda como guía operativa en este documento y en los hints del checklist; el asesor la ejecuta con su calendario y notas. Si un lead sigue en **Nuevo** sin respuesta después del día 7, el sistema marcará vencido el hito “Visita agendada” y el asesor debe moverlo a **Perdido**.

## Post-visita (sin cambio de filosofía)

Tras el recorrido: perfilar necesidades, enviar cotización y documentar seguimiento con próximo contacto explícito. La venta ocurre en el desarrollo y en visitas de seguimiento, no en la cadencia inicial.

## Automatización en GABI

| Capa | Comportamiento |
|------|----------------|
| Lead nuevo | Se crea cadencia de 10 toques + WA automático al prospecto (si está configurado) |
| Dashboard asesor | Panel **Hoy toca** con WhatsApp 1-clic y guiones |
| Recordatorios | Cron 9/12/17 h (México) → WA o email al **asesor** |
| Recorrido / cambio etapa | Cadencia se pausa o completa automáticamente |
| Día 7 sin respuesta | Cadencia expira → revisar marcar **Perdido** |
