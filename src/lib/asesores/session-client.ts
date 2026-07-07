import { GABI_USER_KEY } from "@/lib/session/keys";
import type { AsesorSession } from "@/lib/asesores/types";

const USER_STORAGE_KEY = GABI_USER_KEY;

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

const fetchAsesorSessionFromServer = async (): Promise<AsesorSession | null> => {
  const response = await fetch("/api/asesores/session");
  const data = (await response.json()) as { asesor?: AsesorSession; error?: string };
  if (!response.ok || !data.asesor) {
    return null;
  }
  return data.asesor;
};

const fetchOperatorSessionFromServer = async (): Promise<AsesorSession | null> => {
  const response = await fetch("/api/gabi/operator/session", { credentials: "same-origin" });
  const data = (await response.json()) as { asesor?: AsesorSession; error?: string };
  if (!response.ok || !data.asesor) {
    return null;
  }
  return data.asesor;
};

export const refreshStoredAsesorSession = async (): Promise<AsesorSession | null> => {
  try {
    const fromPin = await fetchAsesorSessionFromServer();
    if (fromPin) {
      writeStoredAsesorSession(fromPin);
      return fromPin;
    }

    const fromOperator = await fetchOperatorSessionFromServer();
    if (fromOperator) {
      writeStoredAsesorSession(fromOperator);
      return fromOperator;
    }

    return null;
  } catch {
    return null;
  }
};
