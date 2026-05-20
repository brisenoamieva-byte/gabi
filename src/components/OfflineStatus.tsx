"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, CloudOff, RefreshCcw, Wifi } from "lucide-react";

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

export function OfflineStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncOk, setLastSyncOk] = useState(false);

  const refreshPendingCount = useCallback(() => {
    setPendingCount(readArray<PendingLead>(CRM_PENDING_KEY).length);
  }, []);

  const syncPendingLeads = useCallback(async () => {
    if (!navigator.onLine || syncing) {
      return;
    }

    const pending = readArray<PendingLead>(CRM_PENDING_KEY);

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
        const result = (await response.json()) as { status?: string };

        if (result.status === "synced" || result.status === "duplicate") {
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
  }, [syncing]);

  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
      refreshPendingCount();
    };

    updateOnlineStatus();
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    window.addEventListener("storage", refreshPendingCount);

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
      window.removeEventListener("storage", refreshPendingCount);
    };
  }, [refreshPendingCount]);

  useEffect(() => {
    if (isOnline && pendingCount) {
      void syncPendingLeads();
    }
  }, [isOnline, pendingCount, syncPendingLeads]);

  const status = useMemo(() => {
    if (!isOnline) {
      return {
        icon: CloudOff,
        label: "Sin internet",
        detail: pendingCount
          ? `${pendingCount} prospecto(s) por enviar al CRM`
          : "Puedes seguir usando gabi con datos locales",
        className: "bg-gabi-navy text-white",
      };
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
  }, [isOnline, lastSyncOk, pendingCount, syncing]);

  useEffect(() => {
    if (!lastSyncOk) {
      return;
    }

    const timeout = window.setTimeout(() => setLastSyncOk(false), 4500);
    return () => window.clearTimeout(timeout);
  }, [lastSyncOk]);

  if (!status) {
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
        {isOnline && pendingCount ? (
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
