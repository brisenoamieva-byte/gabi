/**
 * Configuraciones de sembrado por desarrollo (hojas, filas de header, matching de unidad).
 */
export const SEMBRADO_IMPORT_CONFIGS = {
  "pasaje-alamos": {
    desarrolloId: "pasaje-alamos",
    defaultXlsx:
      "G:/Unidades compartidas/Pasaje Álamos/6. Control Gerencia/1. Sembrado 5sep24.xlsx",
    unitLookupMode: "unidad|tipo",
    sheets: [
      {
        name: "Sembrado Deptos",
        headerRowIndex: 7,
        tipoProducto: "departamento",
        unitValidator: (unidad) => /^\d+$/.test(unidad),
        unitColumnIndex: 3,
      },
      {
        name: "Sembrado Oficinas",
        headerRowIndex: 10,
        tipoProducto: "oficina",
        unitValidator: (unidad) => /^\d+$/.test(unidad),
        unitColumnIndex: 2,
      },
    ],
    cancelSheets: [
      {
        name: "Cancelados Deptos",
        headerRowIndex: 7,
        tipoProducto: "departamento",
        unitValidator: (unidad) => /^\d+$/.test(unidad),
        unitColumnIndex: 2,
        cancelada: true,
      },
      {
        name: "Cancelados Oficinas",
        headerRowIndex: 7,
        tipoProducto: "oficina",
        unitValidator: (unidad) => /^\d+$/.test(unidad),
        unitColumnIndex: 2,
        cancelada: true,
      },
    ],
  },
  "mision-la-gavia": {
    desarrolloId: "mision-la-gavia",
    defaultXlsx:
      "G:/Unidades compartidas/Misión La Gavia/6. Control Gerencia/1. Sembrado Misión La Agavia.xlsx",
    unitLookupMode: "unidad",
    sheets: [
      {
        name: "Sembrado Depas",
        headerRowIndex: 8,
        tipoProducto: "departamento",
        unitValidator: (unidad) => unidad.includes("-"),
      },
    ],
    cancelSheets: [
      {
        name: "Cancelados ",
        headerRowIndex: 0,
        tipoProducto: "departamento",
        unitValidator: (unidad) => Boolean(unidad),
        cancelada: true,
        mergeOntoActive: true,
      },
    ],
  },
};

export const resolveSembradoConfig = (desarrolloId) => {
  const config = SEMBRADO_IMPORT_CONFIGS[desarrolloId];
  if (!config) {
    throw new Error(
      `Desarrollo no configurado: ${desarrolloId}. Disponibles: ${Object.keys(SEMBRADO_IMPORT_CONFIGS).join(", ")}`,
    );
  }
  return config;
};
