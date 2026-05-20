"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Copy, LogOut, MapPinned } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CotizadorPanel } from "@/components/CotizadorPanel";
import {
  getPrototiposCotizables,
  type CotizadorEsquema,
} from "@/lib/cotizador";
import { clusters, datosBancarios, desarrollos, type Asesor, type Desarrollo } from "@/lib/data";
import { useClusterInventario } from "@/lib/inventario/use-cluster-inventario";

const RECORRIDO_KEY = "gabi_recorrido_actual";

type SessionUser = Pick<Asesor, "id" | "nombre" | "email" | "rol" | "desarrollosIds">;

type PortalSession = {
  nombre: string;
  logo: string;
};

type RecorridoSnapshot = {
  clusterId?: string;
  prototipoId?: string;
  descuento?: number;
  esquema?: CotizadorEsquema;
  cliente?: { nombre?: string };
};

function resolveDefaultCluster(recorrido: RecorridoSnapshot | null): string {
  const recorridoClusterId = recorrido?.clusterId?.trim();
  const recorridoCluster =
    recorridoClusterId && clusters.some((cluster) => cluster.id === recorridoClusterId)
      ? recorridoClusterId
      : undefined;

  return (
    recorridoCluster ??
    clusters.find((cluster) => getPrototiposCotizables(cluster.id).length > 0)?.id ??
    clusters[0]?.id ??
    ""
  );
}

function resolveDefaultPrototipo(
  cluster: string,
  recorrido: RecorridoSnapshot | null,
): string | undefined {
  const prototipos = cluster ? getPrototiposCotizables(cluster) : [];
  const recorridoPrototipoId = recorrido?.prototipoId?.trim();

  if (
    recorridoPrototipoId &&
    prototipos.some((prototipo) => prototipo.id === recorridoPrototipoId)
  ) {
    return recorridoPrototipoId;
  }

  return prototipos[0]?.id;
}

type SessionStatus = "loading" | "ready" | "redirecting";

export default function CotizadorPage() {
  const router = useRouter();
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("loading");
  const [user, setUser] = useState<SessionUser | null>(null);
  const [desarrollo, setDesarrollo] = useState<Desarrollo | null>(null);
  const [portal, setPortal] = useState<PortalSession | null>(null);
  const [clusterId, setClusterId] = useState("");
  const [prototipoId, setPrototipoId] = useState<string | undefined>();
  const [unidadId, setUnidadId] = useState<string | undefined>();
  const [descuento, setDescuento] = useState(0);
  const [esquema, setEsquema] = useState<CotizadorEsquema>("mensualidades");
  const [clienteNombre, setClienteNombre] = useState<string | undefined>();
  const [copiedBank, setCopiedBank] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("gabi_user");
    const storedDevelopment = localStorage.getItem("gabi_desarrollo");

    if (!storedUser) {
      setSessionStatus("redirecting");
      router.replace("/portal/bbr");
      return;
    }

    if (!storedDevelopment) {
      setSessionStatus("redirecting");
      router.replace("/desarrollos");
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser) as SessionUser;
      const selectedDevelopment = desarrollos.find(
        (item) =>
          item.id === storedDevelopment &&
          parsedUser.desarrollosIds.includes(item.id) &&
          item.estado === "activo",
      );

      if (!selectedDevelopment) {
        localStorage.removeItem("gabi_desarrollo");
        setSessionStatus("redirecting");
        router.replace("/desarrollos");
        return;
      }

      const storedPortal = localStorage.getItem("gabi_portal");
      if (storedPortal) {
        setPortal(JSON.parse(storedPortal) as PortalSession);
      }

      const recorridoRaw = localStorage.getItem(RECORRIDO_KEY);
      const recorrido = recorridoRaw
        ? (JSON.parse(recorridoRaw) as RecorridoSnapshot)
        : null;

      const defaultCluster = resolveDefaultCluster(recorrido);

      setUser(parsedUser);
      setDesarrollo(selectedDevelopment);
      setClusterId(defaultCluster);
      setPrototipoId(resolveDefaultPrototipo(defaultCluster, recorrido));
      setDescuento(recorrido?.descuento ?? 0);
      setEsquema(recorrido?.esquema ?? "mensualidades");
      setClienteNombre(recorrido?.cliente?.nombre);
      setSessionStatus("ready");
    } catch {
      localStorage.removeItem("gabi_user");
      localStorage.removeItem("gabi_desarrollo");
      setSessionStatus("redirecting");
      router.replace("/portal/bbr");
    }
  }, [router]);

  const handleClusterChange = (nextClusterId: string) => {
    const prototipos = getPrototiposCotizables(nextClusterId);
    setClusterId(nextClusterId);
    setPrototipoId(prototipos[0]?.id);
    setUnidadId(undefined);
    setDescuento(0);
  };

  const handlePrototipoChange = (nextPrototipoId: string | undefined) => {
    setPrototipoId(nextPrototipoId);
    setUnidadId(undefined);
    setDescuento(0);
  };

  const { units: inventarioUnidades } = useClusterInventario(
    desarrollo?.id,
    clusterId || undefined,
  );

  const copyBankData = async () => {
    const text = [
      datosBancarios.razonSocial,
      `RFC: ${datosBancarios.rfc}`,
      `Banco: ${datosBancarios.banco}`,
      `Sucursal: ${datosBancarios.sucursal}`,
      `Cuenta: ${datosBancarios.cuenta}`,
      `CLABE: ${datosBancarios.clabe}`,
      `Concepto: ${datosBancarios.concepto}`,
      `Reportar a: ${datosBancarios.reportarA}`,
    ].join("\n");

    await navigator.clipboard.writeText(text);
    setCopiedBank(true);
    window.setTimeout(() => setCopiedBank(false), 2000);
  };

  const handleLogout = () => {
    localStorage.removeItem("gabi_user");
    localStorage.removeItem("gabi_desarrollo");
    router.replace("/portal/bbr");
  };

  if (sessionStatus !== "ready" || !user || !desarrollo) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F2F0E9] px-6 text-center text-[#1e293b]">
        <p className="text-base font-semibold sm:text-lg">
          {sessionStatus === "redirecting"
            ? "Redirigiendo al acceso de asesores..."
            : "Cargando cotizador..."}
        </p>
      </main>
    );
  }

  if (!clusterId) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F2F0E9] px-6 text-center text-[#1e293b]">
        <p className="text-base font-semibold sm:text-lg">
          No hay clusters disponibles para cotizar en {desarrollo.nombre}.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#201044] px-5 text-sm font-bold text-white"
        >
          Volver al dashboard
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F2F0E9] text-[#1e293b]">
      <header className="border-b border-[#201044]/10 bg-white px-4 py-4 shadow-sm sm:px-6 md:px-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
            {portal?.logo ? (
              <Image
                src={portal.logo}
                alt={portal.nombre}
                width={420}
                height={260}
                className="mt-0.5 h-9 w-auto shrink-0 object-contain mix-blend-multiply sm:mt-0 sm:h-10"
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#6cc24a] sm:text-[11px]">
                Cotización express
              </p>
              <h1 className="mt-1 text-balance text-xl font-black leading-tight text-[#201044] sm:text-2xl md:text-[1.75rem]">
                Cotizador
                <span className="font-bold text-[#201044]/55"> · {desarrollo.nombre}</span>
              </h1>
              <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-500 sm:text-[0.9375rem]">
                {clienteNombre ? (
                  <>
                    Cliente:{" "}
                    <span className="font-semibold text-[#201044]">{clienteNombre}</span>
                    {" · "}
                    inventario real o prototipo
                  </>
                ) : (
                  "Arma números rápidos con inventario real o prototipo."
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 lg:shrink-0 lg:justify-end">
            <Link
              href="/dashboard"
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[#201044]/12 bg-white px-4 text-sm font-semibold text-[#201044] shadow-sm transition hover:bg-slate-50 sm:min-h-12 sm:flex-none sm:rounded-2xl sm:px-5"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>
            <Link
              href="/recorrido"
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#6cc24a] px-4 text-sm font-bold text-[#201044] shadow-sm transition hover:bg-[#5bad3e] sm:min-h-12 sm:flex-none sm:rounded-2xl sm:px-5"
            >
              <MapPinned className="h-4 w-4" />
              Recorrido
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#201044] px-4 text-sm font-semibold text-white shadow-md sm:min-h-12 sm:rounded-2xl sm:px-5"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-5 px-4 py-6 sm:gap-6 sm:px-6 sm:py-8 md:px-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)] lg:items-start">
        <div className="rounded-2xl border border-[#201044]/8 bg-white p-5 shadow-lg shadow-[#201044]/5 sm:rounded-[1.75rem] sm:p-6 md:p-8">
          <div className="border-b border-slate-100 pb-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6CC24A] sm:text-[11px]">
              Configuración
            </p>
            <h2 className="mt-1.5 text-lg font-black text-[#201044] sm:text-xl">
              Producto y números
            </h2>
          </div>
          <div className="mt-5 sm:mt-6">
            <CotizadorPanel
              desarrolloId={desarrollo.id}
              desarrolloNombre={desarrollo.nombre}
              clusterId={clusterId}
              prototipoId={prototipoId}
              unidadId={unidadId}
              inventarioUnidades={inventarioUnidades}
              descuento={descuento}
              esquema={esquema}
              clienteNombre={clienteNombre}
              showSelectors
              showCopy
              onClusterChange={handleClusterChange}
              onPrototipoChange={handlePrototipoChange}
              onUnidadChange={setUnidadId}
              onDescuentoChange={setDescuento}
              onEsquemaChange={setEsquema}
            />
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6">
          <div className="rounded-2xl border border-[#201044]/8 bg-white p-5 shadow-md sm:rounded-[1.75rem] sm:p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6CC24A] sm:text-[11px]">
              Datos bancarios
            </p>
            <h3 className="mt-1.5 text-lg font-black text-[#201044]">Para apartado</h3>
            <dl className="mt-4 space-y-2.5 text-sm">
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Razón social
                </dt>
                <dd className="mt-0.5 break-words text-[0.9375rem] font-semibold leading-snug text-slate-700">
                  {datosBancarios.razonSocial}
                </dd>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    RFC
                  </dt>
                  <dd className="mt-0.5 font-semibold text-slate-700">{datosBancarios.rfc}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Banco
                  </dt>
                  <dd className="mt-0.5 font-semibold text-slate-700">{datosBancarios.banco}</dd>
                </div>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  CLABE
                </dt>
                <dd className="mt-0.5 font-mono text-sm font-semibold tracking-wide text-slate-700">
                  {datosBancarios.clabe}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Concepto
                </dt>
                <dd className="mt-0.5 text-sm leading-relaxed text-slate-500">
                  {datosBancarios.concepto}
                </dd>
              </div>
            </dl>
            <button
              type="button"
              onClick={() => void copyBankData()}
              className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-bbr-purple/12 bg-bbr-cream px-4 text-sm font-bold text-bbr-purple transition hover:bg-slate-100 sm:min-h-12"
            >
              <Copy className="h-4 w-4" />
              {copiedBank ? "Datos copiados" : "Copiar datos bancarios"}
            </button>
          </div>

          <div className="rounded-2xl bg-[#201044] p-5 sm:rounded-[1.75rem] sm:p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6CC24A] sm:text-[11px]">
              Guía gabi
            </p>
            <p className="mt-2.5 text-sm leading-relaxed text-white/85">
              Propuesta comercial del momento. Seguimiento del prospecto y simulaciones
              bancarias en el CRM del desarrollador.
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}
