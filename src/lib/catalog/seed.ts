import {
  clusters,
  comercializadores,
  desarrollos,
  prototipos,
  type DisponibilidadUnidad,
} from "@/lib/data";
import {
  pasajeAlamosDisponibilidades,
  pasajeAlamosPrototipos,
} from "@/lib/catalog/pasaje-alamos.generated";
import { getDefaultRecorridoContenido } from "@/lib/catalog/recorrido-content";
import { DEFAULT_RECORRIDO_ETAPAS } from "@/lib/catalog/types";
import { syncSuperficieLegacyFields } from "@/lib/inventario/productos-recomendados";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export type CatalogSeedResult = {
  comercializadoras: number;
  desarrollos: number;
  clusters: number;
  prototipos: number;
  inventarioPasaje: number;
};

const PASAJE_DESARROLLO_ID = "pasaje-alamos";
const INVENTARIO_BATCH_SIZE = 50;

const clusterDesarrolloLookup = new Map(
  clusters.map((cluster) => [cluster.id, cluster.desarrolloId ?? PASAJE_DESARROLLO_ID]),
);

const disponibilidadToRow = (unit: DisponibilidadUnidad) => {
  const desarrolloId = clusterDesarrolloLookup.get(unit.clusterId) ?? PASAJE_DESARROLLO_ID;
  const superficies = syncSuperficieLegacyFields(
    unit.tipo,
    unit.superficieTerrenoM2 ?? null,
    unit.superficieConstruccionM2 ?? null,
  );

  return {
    desarrollo_id: desarrolloId,
    cluster_id: unit.clusterId,
    unidad: unit.unidad.trim(),
    tipo: unit.tipo,
    estatus: unit.estatus,
    prototipo_id: unit.prototipoId ?? null,
    precio: unit.precio ?? null,
    ...superficies,
    superficie_interna_m2: unit.superficieInternaM2 ?? null,
    superficie_externa_m2: unit.superficieExternaM2 ?? null,
    superficie_bodega_m2: unit.superficieBodegaM2 ?? null,
    cajones: unit.cajones ?? null,
    entrega: unit.entrega?.trim() || null,
    etapa: unit.etapa?.trim() || null,
    torre: unit.torre?.trim() || null,
    nivel: unit.nivel?.trim() || null,
    nivel_orden: unit.nivelOrden ?? null,
    notas: unit.notas?.trim() || null,
    orden: unit.orden ?? 0,
    visitable: unit.visitable,
    prioridad_comercial: unit.prioridadComercial,
    razones_venta: unit.razonesVenta ?? [],
    ubicacion_comercial: unit.ubicacionComercial?.trim() || null,
    instruccion_recorrido: unit.instruccionRecorrido?.trim() || null,
    nota_acceso: unit.notaAcceso?.trim() || null,
    activo: true,
    updated_at: new Date().toISOString(),
  };
};

export const seedPasajeAlamosInventario = async (): Promise<number> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado. Revisa las variables de entorno.");
  }

  const rows = pasajeAlamosDisponibilidades.map(disponibilidadToRow);
  let loaded = 0;

  for (let index = 0; index < rows.length; index += INVENTARIO_BATCH_SIZE) {
    const batch = rows.slice(index, index + INVENTARIO_BATCH_SIZE);
    const { error } = await supabase.from("disponibilidad_unidades").upsert(batch, {
      onConflict: "desarrollo_id,cluster_id,unidad",
    });

    if (error) {
      const hint = error.message.includes("cajones")
        ? " Aplica supabase/migrations/017_pasaje_unidad_detalles.sql en Supabase (npm run db:migrate:hint)."
        : "";
      throw new Error(`No se pudo cargar inventario Pasaje Álamos: ${error.message}.${hint}`);
    }

    loaded += batch.length;
  }

  return loaded;
};

export const seedCatalogFromData = async (): Promise<CatalogSeedResult> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado. Revisa las variables de entorno.");
  }

  let comercializadorasCount = 0;
  let desarrollosCount = 0;
  let clustersCount = 0;
  let prototiposCount = 0;

  for (const item of comercializadores) {
    const { error } = await supabase.from("comercializadoras").upsert(
      {
        id: item.id,
        slug: item.slug,
        nombre: item.nombre,
        logo: item.logo,
        usuario: item.usuario.toLowerCase(),
        color_primary: item.colorPrimary,
        color_accent: item.colorAccent,
        activo: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

    if (error) {
      throw new Error(`No se pudo cargar comercializadora ${item.slug}: ${error.message}`);
    }
    comercializadorasCount += 1;
  }

  for (const item of desarrollos) {
    const { error } = await supabase.from("desarrollos_catalog").upsert(
      {
        id: item.id,
        comercializadora_id: "bbr",
        nombre: item.nombre,
        slug: item.slug,
        desarrollador: item.desarrollador,
        ubicacion: item.ubicacion,
        descripcion: item.descripcion,
        precio_desde: item.precioDesde,
        tipos_producto: item.tiposProducto,
        estado: item.estado,
        logo: item.logo ?? null,
        desarrollador_logo: item.desarrolladorLogo ?? null,
        color_principal: item.colorPrincipal,
        color_acento: item.colorAcento,
        brochure_pdf: item.brochurePdf ?? null,
        crm: item.crm,
        recorrido_etapas: [...DEFAULT_RECORRIDO_ETAPAS],
        recorrido_version: 2,
        recorrido_contenido: getDefaultRecorridoContenido(item.id),
        activo: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

    if (error) {
      throw new Error(`No se pudo cargar desarrollo ${item.id}: ${error.message}`);
    }
    desarrollosCount += 1;
  }

  const desarrolloId = desarrollos[0]?.id ?? "la-vista-residencial";

  for (let index = 0; index < clusters.length; index += 1) {
    const cluster = clusters[index];
    const clusterDesarrolloId = cluster.desarrolloId ?? desarrolloId;
    const { id, ...payload } = cluster;
    const { error } = await supabase.from("clusters_catalog").upsert(
      {
        id,
        desarrollo_id: clusterDesarrolloId,
        payload,
        orden: index,
        activo: cluster.activo,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

    if (error) {
      throw new Error(`No se pudo cargar cluster ${id}: ${error.message}`);
    }
    clustersCount += 1;
  }

  for (const prototipo of [...prototipos, ...pasajeAlamosPrototipos]) {
    const { id, clusterId, ...payload } = prototipo;
    const clusterDesarrolloId = clusters.find((c) => c.id === clusterId)?.desarrolloId ?? desarrolloId;
    const { error } = await supabase.from("prototipos_catalog").upsert(
      {
        id,
        desarrollo_id: clusterDesarrolloId,
        cluster_id: clusterId,
        payload,
        activo: prototipo.activo,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

    if (error) {
      throw new Error(`No se pudo cargar prototipo ${id}: ${error.message}`);
    }
    prototiposCount += 1;
  }

  const validPasajePrototipoIds = pasajeAlamosPrototipos.map((p) => p.id);
  if (validPasajePrototipoIds.length) {
    const { error: cleanupError } = await supabase
      .from("prototipos_catalog")
      .delete()
      .eq("desarrollo_id", PASAJE_DESARROLLO_ID)
      .not("id", "in", `(${validPasajePrototipoIds.map((id) => `"${id}"`).join(",")})`);

    if (cleanupError) {
      throw new Error(
        `No se pudieron limpiar prototipos antiguos de Pasaje Álamos: ${cleanupError.message}`,
      );
    }
  }

  const inventarioPasaje = await seedPasajeAlamosInventario();

  return {
    comercializadoras: comercializadorasCount,
    desarrollos: desarrollosCount,
    clusters: clustersCount,
    prototipos: prototiposCount,
    inventarioPasaje,
  };
};
