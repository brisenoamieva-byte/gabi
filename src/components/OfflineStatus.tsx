"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { CheckCircle2, CloudOff, RefreshCcw, Wifi } from "lucide-react";
import {
  isDesarrolloCrmEnabled,
  shouldRemoveLeadFromCrmQueue,
} from "@/lib/crm/sync-policy";

const CRM_PENDING_KEY = "gabi_crm_pending";
const LEADS_KEY = "gabi_leads";

type PendingLead = {
  id?: string;
  asesorId?: string;
  desarrolloId?: string;
  normalizedEmail?: string;
  normalizedPhone?: string;
  email?: string;
  telefono?: string;
  medioContacto?: string;
  cliente?: {
    nombre?: string;
    email?: string;
    telefono?: string;
    medioContacto?: string;
  };
  nombre?: string;
  crmStatus?: string;
};

const ASESOR_ROUTE_PREFIXES = ["/dashboard", "/desarrollos", "/recorrido", "/cotizador"];

const readArray = <T,>(key: string): T[] => {
  try {
    const value = localStorage.getItem(key);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
};

const writeArray = <T,>(key: string, value: T[]) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const filterActionablePending = (leads: PendingLead[], crmConfigured: boolean) => {
  if (!crmConfigured) {
    return [];
  }

  return leads.filter((lead) => isDesarrolloCrmEnabled(lead.desarrolloId));
};

export function OfflineStatus() {
  const pathname = usePathname();
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncOk, setLastSyncOk] = useState(false);
  const [crmConfigured, setCrmConfigured] = useState(false);
  const [crmChecked, setCrmChecked] = useState(false);

  const isAsesorRoute = ASESOR_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  const refreshPendingCount = useCallback(
    (configured = crmConfigured) => {
      const actionable = filterActionablePending(
        readArray<PendingLead>(CRM_PENDING_KEY),
        configured,
      );
      setPendingCount(actionable.length);
    },
    [crmConfigured],
  );

  const purgeNonActionablePending = useCallback((configured: boolean) => {
    const allPending = readArray<PendingLead>(CRM_PENDING_KEY);

    if (!configured) {
      if (allPending.length) {
        writeArray(CRM_PENDING_KEY, []);
      }
      setPendingCount(0);
      return;
    }

    const actionable = filterActionablePending(allPending, true);
    if (actionable.length !== allPending.length) {
      writeArray(CRM_PENDING_KEY, actionable);
    }
    setPendingCount(actionable.length);
  }, []);

  const syncPendingLeads = useCallback(async () => {
    if (!navigator.onLine || syncing || !crmConfigured) {
      return;
    }

    const pending = filterActionablePending(readArray<PendingLead>(CRM_PENDING_KEY), true);

    if (!pending.length) {
      setPendingCount(0);
      return;
    }

    setSyncing(true);
    setLastSyncOk(false);

    const remaining: PendingLead[] = [];
    const syncedIds = new Set<string>();

    for (const lead of pending) {
      try {
        const response = await fetch("/api/crm/contacts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            desarrolloId: lead.desarrolloId,
            asesorId: lead.asesorId,
            cliente: {
              nombre: lead.cliente?.nombre ?? lead.nombre,
              email: lead.normalizedEmail ?? lead.email ?? lead.cliente?.email,
              telefono: lead.normalizedPhone ?? lead.telefono ?? lead.cliente?.telefono,
              medioContacto: lead.medioContacto ?? lead.cliente?.medioContacto,
            },
          }),
        });
        const result = (await response.json()) as { status?: string; reason?: string };

        if (shouldRemoveLeadFromCrmQueue(result)) {
          if (lead.id) {
            syncedIds.add(lead.id);
          }
        } else {
          remaining.push(lead);
        }
      } catch {
        remaining.push(lead);
      }
    }

    if (syncedIds.size) {
      const leads = readArray<PendingLead>(LEADS_KEY).map((lead) =>
        lead.id && syncedIds.has(lead.id) ? { ...lead, crmStatus: "synced" } : lead,
      );
      writeArray(LEADS_KEY, leads);
    }

    writeArray(CRM_PENDING_KEY, remaining);
    setPendingCount(remaining.length);
    setLastSyncOk(Boolean(pending.length && !remaining.length));
    setSyncing(false);
  }, [crmConfigured, syncing]);

  useEffect(() => {
    let cancelled = false;

    const loadCrmStatus = async () => {
      try {
        const response = await fetch("/api/crm/status");
        const data = (await response.json()) as { configured?: boolean };
        if (cancelled) {
          return;
        }
        const configured = Boolean(data.configured);
        setCrmConfigured(configured);
        purgeNonActionablePending(configured);
      } catch {
        if (!cancelled) {
          setCrmConfigured(false);
          purgeNonActionablePending(false);
        }
      } finally {
        if (!cancelled) {
          setCrmChecked(true);
        }
      }
    };

    void loadCrmStatus();

    return () => {
      cancelled = true;
    };
  }, [purgeNonActionablePending]);

  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
      refreshPendingCount();
    };

    updateOnlineStatus();
    const onStorageChange = () => refreshPendingCount();
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    window.addEventListener("storage", onStorageChange);

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
      window.removeEventListener("storage", onStorageChange);
    };
  }, [refreshPendingCount]);

  useEffect(() => {
    if (crmChecked && crmConfigured && isOnline && pendingCount) {
      void syncPendingLeads();
    }
  }, [crmChecked, crmConfigured, isOnline, pendingCount, syncPendingLeads]);

  const status = useMemo(() => {
    if (!crmChecked) {
      return null;
    }

    if (!isOnline) {
      return {
        icon: CloudOff,
        label: "Sin internet",
        detail: crmConfigured && pendingCount
          ? `${pendingCount} prospecto(s) por enviar al CRM`
          : "Puedes seguir usando gabi con datos locales",
        className: "bg-gabi-navy text-white",
      };
    }

    if (!crmConfigured) {
      return null;
    }

    if (syncing) {
      return {
        icon: RefreshCcw,
        label: "Sincronizando",
        detail: `${pendingCount} prospecto(s) por enviar al CRM`,
        className: "bg-gabi-teal text-gabi-navy-dark",
      };
    }

    if (pendingCount) {
      return {
        icon: Wifi,
        label: "Con internet",
        detail: `${pendingCount} prospecto(s) por enviar al CRM`,
        className: "bg-gabi-teal text-gabi-navy-dark",
      };
    }

    if (lastSyncOk) {
      return {
        icon: CheckCircle2,
        label: "Sincronizado",
        detail: "Los prospectos pendientes fueron enviados al CRM",
        className: "bg-gabi-emerald text-white",
      };
    }

    return null;
  }, [crmChecked, crmConfigured, isOnline, lastSyncOk, pendingCount, syncing]);

  useEffect(() => {
    if (!lastSyncOk) {
      return;
    }

    const timeout = window.setTimeout(() => setLastSyncOk(false), 4500);
    return () => window.clearTimeout(timeout);
  }, [lastSyncOk]);

  if (!isAsesorRoute || !status) {
    return null;
  }

  const Icon = status.icon;

  return (
    <div className="fixed bottom-4 left-4 z-[80] max-w-[calc(100vw-2rem)]">
      <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 shadow-2xl ${status.className}`}>
        <Icon className={`h-5 w-5 shrink-0 ${syncing ? "animate-spin" : ""}`} />
        <div>
          <p className="text-sm font-black">{status.label}</p>
          <p className="text-xs font-semibold opacity-85">{status.detail}</p>
        </div>
        {crmConfigured && isOnline && pendingCount ? (
          <button
            type="button"
            onClick={() => void syncPendingLeads()}
            className="rounded-xl bg-white/15 px-3 py-2 text-xs font-black"
          >
            Reintentar
          </button>
        ) : null}
      </div>
    </div>
  );
}
