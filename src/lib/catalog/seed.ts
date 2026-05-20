import {
  clusters,
  comercializadores,
  desarrollos,
  prototipos,
} from "@/lib/data";
import { DEFAULT_RECORRIDO_ETAPAS } from "@/lib/catalog/types";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export type CatalogSeedResult = {
  comercializadoras: number;
  desarrollos: number;
  clusters: number;
  prototipos: number;
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
    const { id, ...payload } = cluster;
    const { error } = await supabase.from("clusters_catalog").upsert(
      {
        id,
        desarrollo_id: desarrolloId,
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

  for (const prototipo of prototipos) {
    const { id, clusterId, ...payload } = prototipo;
    const { error } = await supabase.from("prototipos_catalog").upsert(
      {
        id,
        desarrollo_id: desarrolloId,
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

  return {
    comercializadoras: comercializadorasCount,
    desarrollos: desarrollosCount,
    clusters: clustersCount,
    prototipos: prototiposCount,
  };
};
