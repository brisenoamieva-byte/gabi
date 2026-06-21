"use client";

import { useEffect, useState } from "react";

export const useCrmPlaybookEnabled = (
  asesorId: string | undefined,
  desarrolloId: string | undefined,
): boolean => {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!asesorId || !desarrolloId) {
      setEnabled(false);
      return;
    }

    let cancelled = false;

    void fetch(
      `/api/asesores/crm-playbook/status?asesorId=${encodeURIComponent(asesorId)}&desarrolloId=${encodeURIComponent(desarrolloId)}`,
    )
      .then((res) => res.json())
      .then((data: { enabled?: boolean }) => {
        if (!cancelled) {
          setEnabled(Boolean(data.enabled));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEnabled(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [asesorId, desarrolloId]);

  return enabled;
};
