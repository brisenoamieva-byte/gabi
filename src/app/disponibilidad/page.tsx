"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Building2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AsesorDisponibilidadRow } from "@/lib/inventario/asesor-disponibilidad";
import { formatPrice, type Asesor, type Cluster, type Desarrollo } from "@/lib/data";
import {
  readPortalSession,
  resolveAdvisorEntryPath,
} from "@/lib/portal/session";

type SessionUser = Pick<Asesor, "id" | "nombre" | "desarrollosIds">;

const estatusClass = (estatus: string) => {
  if (estatus === "Disponibles") {
    return "bg-emerald-50 text-emerald-800";
  }
  if (estatus.includes("Apartado")) {
    return "bg-amber-50 text-amber-900";
  }
  if (estatus.includes("Vendid")) {
    return "bg-slate-100 text-slate-600";
  }
  return "bg-slate-50 text-slate-700";
};

export default function DisponibilidadPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [desarrollo, setDesarrollo] = useState<Desarrollo | null>(null);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [clusterId, setClusterId] = useState<string>("");
  const [unidades, setUnidades] = useState<AsesorDisponibilidadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const portal = readPortalSession();
    const storedUser = localStorage.getItem("gabi_user");
    const storedDevelopment = localStorage.getItem("gabi_desarrollo");

    if (!storedUser) {
      router.replace(portal ? resolveAdvisorEntryPath(portal) : "/portal");
      return;
    }

    if (!storedDevelopment) {
      router.replace("/desarrollos");
      return;
    }

    void (async () => {
      try {
        const parsedUser = JSON.parse(storedUser) as SessionUser;
        if (!parsedUser.desarrollosIds.includes(storedDevelopment)) {
          router.replace("/desarrollos");
          return;
        }

        const catalogResponse = await fetch(
          `/api/catalog/recorrido?desarrolloId=${encodeURIComponent(storedDevelopment)}`,
        );
        const catalogData = (await catalogResponse.json()) as {
          desarrollo?: Desarrollo;
          clusters?: Cluster[];
        };

        if (!catalogData.desarrollo) {
          router.replace("/desarrollos");
          return;
        }

        const loadedClusters = catalogData.clusters ?? [];
        setUser(parsedUser);
        setDesarrollo(catalogData.desarrollo);
        setClusters(loadedClusters);
        setClusterId(loadedClusters[0]?.id ?? "");
      } catch {
        router.replace("/dashboard");
      }
    })();
  }, [router]);

  useEffect(() => {
    if (!desarrollo?.id || !clusterId) {
      return;
    }

    void (async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          desarrolloId: desarrollo.id,
          clusterId,
        });
        const response = await fetch(`/api/inventario/asesor?${params}`);
        const data = (await response.json()) as {
          unidades?: AsesorDisponibilidadRow[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(data.error ?? "No se pudo cargar la disponibilidad.");
        }
        setUnidades(data.unidades ?? []);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Error al cargar.");
        setUnidades([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [desarrollo?.id, clusterId]);

  const resumen = useMemo(() => {
    const counts = { disponibles: 0, apartados: 0, vendidos: 0, otros: 0 };
    for (const row of unidades) {
      if (row.estatusSembrado === "Disponibles") {
        counts.disponibles += 1;
      } else if (row.estatusSembrado.includes("Apartado")) {
        counts.apartados += 1;
      } else if (row.estatusSembrado.includes("Vendid")) {
        counts.vendidos += 1;
      } else {
        counts.otros += 1;
      }
    }
    return counts;
  }, [unidades]);

  if (!user || !desarrollo) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F2F0E9]">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </main>
    );
  }

  const activeCluster = clusters.find((item) => item.id === clusterId);

  return (
    <main className="min-h-screen bg-[#F2F0E9] text-[#201044]">
      <header className="border-b border-[#201044]/8 bg-white/90 px-5 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl border border-[#201044]/12 bg-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
              Sembrado · solo lectura
            </p>
            <h1 className="truncate text-lg font-black">Disponibilidad</h1>
            <p className="truncate text-xs text-slate-500">{desarrollo.nombre}</p>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-3xl space-y-4 px-5 py-6">
        {clusters.length > 1 ? (
          <div className="flex flex-wrap gap-2">
            {clusters.map((cluster) => (
              <button
                key={cluster.id}
                type="button"
                onClick={() => setClusterId(cluster.id)}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                  clusterId === cluster.id
                    ? "bg-[#201044] text-white"
                    : "bg-white text-[#201044] ring-1 ring-[#201044]/10"
                }`}
              >
                {cluster.nombre}
              </button>
            ))}
          </div>
        ) : null}

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-white p-3 text-center shadow-sm">
            <p className="text-xl font-black text-emerald-700">{resumen.disponibles}</p>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Disponibles</p>
          </div>
          <div className="rounded-xl bg-white p-3 text-center shadow-sm">
            <p className="text-xl font-black text-amber-700">{resumen.apartados}</p>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Apartados</p>
          </div>
          <div className="rounded-xl bg-white p-3 text-center shadow-sm">
            <p className="text-xl font-black text-slate-600">{resumen.vendidos}</p>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Vendidos</p>
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-bold">{activeCluster?.nombre ?? "Unidades"}</p>
            <p className="text-xs text-slate-500">
              Estatus en tiempo real desde sembrado (sin datos de clientes).
            </p>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 px-4 py-8 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando unidades…
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {unidades.map((row) => (
                <li
                  key={row.unidadId}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-[#201044]">
                      {row.tipo === "oficina" ? "Of." : "Depto"} {row.unidad}
                      {row.prototipoId ? (
                        <span className="ml-1 font-normal text-slate-500">· {row.prototipoId}</span>
                      ) : null}
                    </p>
                    <p className="text-xs text-slate-500">
                      {row.precio ? formatPrice(row.precio) : "Sin precio"}
                      {row.listaPrecios ? ` · ${row.listaPrecios}` : ""}
                      {row.visitable ? " · Recorrido" : ""}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${estatusClass(row.estatusSembrado)}`}
                  >
                    {row.estatusLabel}
                  </span>
                </li>
              ))}
              {!unidades.length && !loading ? (
                <li className="px-4 py-8 text-center text-sm text-slate-500">
                  No hay unidades en este segmento.
                </li>
              ) : null}
            </ul>
          )}
        </div>

        <p className="flex items-center gap-2 text-xs text-slate-400">
          <Building2 className="h-3.5 w-3.5" />
          Gerencia actualiza estatus en Admin → Sembrado.
        </p>
      </section>
    </main>
  );
}
