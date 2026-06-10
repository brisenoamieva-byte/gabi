# Misión La Gavia — mapa del Excel simulador

Fuente oficial: `Simulador La Gavia 13abr26.xlsx`  
Sembrado: `Sembrado Misión La Agavia.xlsx` (Control Gerencia)

## Pestañas del simulador

| Pestaña | Para qué sirve |
|---|---|
| **Depas** | Calendario comercial por unidad: paquete de construcción, torre (módulo), lado, número, **fecha inicio venta**, **fecha entrega**, nivel y prototipo. 105 deptos. |
| **Listas** | Reglas de negocio: esquemas de pago (Contado, 6MSI, 12MSI, 30-70, 15-85), incrementos por **m² externos**, **nivel** del edificio, m² de referencia por tipología (jardín/roof), **11 listas de precio** con **+3%** entre listas (col O fila descuentos en Precios). |
| **Descuentos** | Motor financiero de referencia: tasa **11% anual**, plazo entrega **24 meses**, tabla de enganche / mensualidades / finiquito por esquema (validación PMT). |
| **Precios** | **Lista mar26** por unidad: edificio, lado, modelo, m², precio lista, precios precalculados (contado, 30-30-40, 30-70, 15-85) y estatus Disponible/VENDIDO. |
| **Simulador** | UI del asesor: prospecto, edificio, lado, nivel, unidad → cotización (930 filas de layout). |
| **Imagenes** | Mapa planta ↔ archivo de imagen (`21izquierdo`, etc.) para UI/PDF. |
| **Hoja1 / Hoja2** | Master plan lógico: posición de torres (P, Q, R, O, N…) y etapas de venta. |

## Esquemas de pago (Listas)

| Esquema | Descuento lista | Enganche | Meses | Finiquito |
|---|---:|---:|---|---:|
| Contado | 17.2% | 90% | 0 | 10% |
| 6MSI | 15.4% | 20% | 6 | 0 |
| 12MSI | 13.5% | 20% | 12 | 0 |
| 30-70 | 10.1% | 30% | varía | 70% |
| 15-85 | 8.6% | 15% | varía | 85% |

## Sembrado (Control Gerencia)

| Pestaña | Contenido |
|---|---|
| **Sembrado Depas** | 105 unidades · estatus comercial · cliente · lista aplicable · equipo/promotor |
| **Cancelados** | Operaciones canceladas (ej. A-101, N-201) → inventario bloqueado |
| **Bodegas** | Inventario bodegas (fase posterior) |
| **Sembrado (2)** | Histórico otro proyecto — **ignorar** para La Gavia |

### Estatus sembrado → gabi (jun 2026)

- Disponibles → `disponible` (102)
- Apartado / Vendido Cobrado 1er Parte → `apartado` (2)
- Vendidas Cobradas → `vendido` (1)
- Cancelado → `bloqueado`

## Scripts

```bash
npm run catalog:mision-la-gavia   # Regenera catálogo + config desde Excel
npm run sembrado:import:gavia     # Sincroniza estatus a Supabase
npm run catalog:sync              # Catálogo completo + inventario La Gavia
```

## Precio “desde”

**$2,325,024** — mínimo precio **contado** (lista mar26), unidad tipo 2R primer nivel.
