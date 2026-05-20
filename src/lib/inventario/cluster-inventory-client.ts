import { getDisponibilidadesByCluster, type DisponibilidadUnidad } from "@/lib/data";

export type ClusterInventarioSource = "supabase" | "local";

export type ClusterInventarioResult = {
  units: DisponibilidadUnidad[];
  source: ClusterInventarioSource;
};

export async function fetchClusterInventario(
  desarrolloId: string,
  clusterId: string,
): Promise<ClusterInventarioResult> {
  const fallback = getDisponibilidadesByCluster(clusterId);

  try {
    const params = new URLSearchParams({ desarrolloId, clusterId });
    const response = await fetch(`/api/inventario/recomendados?${params}`);
    const data = (await response.json()) as {
      productos?: DisponibilidadUnidad[];
      curated?: boolean;
    };

    if (response.ok && data.curated && data.productos?.length) {
      return { units: data.productos, source: "supabase" };
    }
  } catch {
    // Sin red o API caída: inventario estático local.
  }

  return { units: fallback, source: "local" };
}
