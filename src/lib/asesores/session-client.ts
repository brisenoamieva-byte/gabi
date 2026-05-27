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

export const refreshStoredAsesorSession = async (
  stored: AsesorSession,
): Promise<AsesorSession | null> => {
  try {
    const response = await fetch(
      `/api/asesores/session?id=${encodeURIComponent(stored.id)}`,
    );
    const data = (await response.json()) as { asesor?: AsesorSession; error?: string };

    if (!response.ok || !data.asesor) {
      return stored;
    }

    writeStoredAsesorSession(data.asesor);
    return data.asesor;
  } catch {
    return stored;
  }
};
