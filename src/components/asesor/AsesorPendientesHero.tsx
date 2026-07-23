"use client";

import { ArrowRight, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { PlaybookQueueItem } from "@/lib/comercial/crm-playbook";
import { prospectoEtapaLabel } from "@/lib/comercial/prospecto-etapas";

const STORAGE_KEY = "gabi-pendientes-hero-dismissed-on";

const isStandalonePwa = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean(
      "standalone" in navigator &&
        (navigator as Navigator & { standalone?: boolean }).standalone,
    )
  );
};

const todayKey = () => new Date().toISOString().slice(0, 10);

type AsesorPendientesHeroProps = {
  overdueCount: number;
  queue: PlaybookQueueItem[];
  onSelectLead: (prospectoId: string) => void;
  onDismiss?: () => void;
};

export function AsesorPendientesHero({
  overdueCount,
  queue,
  onSelectLead,
  onDismiss,
}: AsesorPendientesHeroProps) {
  const [visible, setVisible] = useState(false);
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    const isStandalone = isStandalonePwa();
    setStandalone(isStandalone);
    if (!isStandalone || overdueCount <= 0) {
      setVisible(false);
      return;
    }
    try {
      const dismissed = window.localStorage.getItem(STORAGE_KEY);
      setVisible(dismissed !== todayKey());
    } catch {
      setVisible(true);
    }
  }, [overdueCount]);

  const topItems = useMemo(() => queue.slice(0, 3), [queue]);

  if (!standalone || !visible || overdueCount <= 0) {
    return null;
  }

  const dismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, todayKey());
    } catch {
      // ignore
    }
    setVisible(false);
    onDismiss?.();
  };

  const primary = topItems[0];

  return (
    <div className="relative overflow-hidden rounded-3xl bg-[#13315C] text-white shadow-[0_16px_40px_rgba(19,49,92,0.28)]">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse at 20% 0%, rgba(45,212,191,0.35), transparent 55%), radial-gradient(ellipse at 90% 100%, rgba(34,211,238,0.18), transparent 45%)",
        }}
      />
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
        aria-label="Cerrar"
      >
        <X className="h-4 w-4" strokeWidth={2} />
      </button>

      <div className="relative px-5 pb-5 pt-6 sm:px-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#2DD4BF]">
          Pendientes de hoy
        </p>
        <p className="mt-2 text-5xl font-semibold tabular-nums tracking-tight sm:text-6xl">
          {overdueCount}
        </p>
        <p className="mt-1 text-base text-white/75">
          {overdueCount === 1 ? "paso vencido en tu CRM" : "pasos vencidos en tu CRM"}
        </p>

        {topItems.length > 0 ? (
          <ul className="mt-5 space-y-2">
            {topItems.map((item) => (
              <li key={item.prospectoId}>
                <button
                  type="button"
                  onClick={() => {
                    onSelectLead(item.prospectoId);
                    dismiss();
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl bg-white/10 px-3.5 py-3 text-left transition hover:bg-white/15"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{item.nombre}</span>
                    <span className="mt-0.5 block truncate text-xs text-white/55">
                      {item.nextStep?.label ?? "Revisar playbook"} ·{" "}
                      {prospectoEtapaLabel[item.etapa]}
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-[#2DD4BF]" strokeWidth={2} />
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <button
          type="button"
          onClick={() => {
            if (primary) {
              onSelectLead(primary.prospectoId);
            }
            dismiss();
          }}
          className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#2DD4BF] px-4 text-sm font-bold text-[#0F2A4A] transition hover:bg-[#5EEAD4]"
        >
          Atender ahora
          <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
