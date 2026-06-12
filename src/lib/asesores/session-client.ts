import { asesorSessionLookupIds } from "@/lib/asesores/seed-match";
import type { AsesorSession } from "@/lib/asesores/types";

const USER_STORAGE_KEY = "gabi_user";

export const readStoredAsesorSession = (): AsesorSession | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = localStorage.getItem(USER_STORAGE_KEY);
  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as AsesorSession;
  } catch {
    return null;
  }
};

export const writeStoredAsesorSession = (asesor: AsesorSession) => {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(asesor));
};

const fetchAsesorSessionById = async (id: string): Promise<AsesorSession | null> => {
  const response = await fetch(`/api/asesores/session?id=${encodeURIComponent(id)}`);
  const data = (await response.json()) as { asesor?: AsesorSession; error?: string };
  if (!response.ok || !data.asesor) {
    return null;
  }
  return data.asesor;
};

export const refreshStoredAsesorSession = async (
  stored: AsesorSession,
): Promise<AsesorSession | null> => {
  try {
    for (const lookupId of asesorSessionLookupIds(stored.id)) {
      const asesor = await fetchAsesorSessionById(lookupId);
      if (asesor) {
        writeStoredAsesorSession(asesor);
        return asesor;
      }
    }

    return stored;
  } catch {
    return stored;
  }
};
