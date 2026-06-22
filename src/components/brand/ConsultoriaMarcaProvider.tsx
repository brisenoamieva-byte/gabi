"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";
import {
  CONSULTORIA_MARCA_STORAGE_KEY,
  DEFAULT_CONSULTORIA_MARCA,
  parseConsultoriaMarca,
  resolveConsultoriaMarca,
  type ConsultoriaMarcaPresentacion,
} from "@/lib/brand/consultoria-marca";

type ConsultoriaMarcaContextValue = {
  marca: ConsultoriaMarcaPresentacion;
  storedMarca: ConsultoriaMarcaPresentacion;
  setMarca: (marca: ConsultoriaMarcaPresentacion) => void;
  previewMarca: ConsultoriaMarcaPresentacion | null;
  setPreviewMarca: (marca: ConsultoriaMarcaPresentacion | null) => void;
};

const ConsultoriaMarcaContext = createContext<ConsultoriaMarcaContextValue | null>(null);

type ProviderProps = {
  children: ReactNode;
  /** Marca persistida del documento (propuesta, estudio, etc.). */
  initialMarca?: ConsultoriaMarcaPresentacion | null;
  /** Permite override temporal vía ?marca=bbr|dmb (solo operador en preview). */
  allowUrlOverride?: boolean;
  /** Persistencia local para módulos sin BD (p. ej. Investti). */
  storageKey?: string;
};

export function ConsultoriaMarcaProvider({
  children,
  initialMarca,
  allowUrlOverride = false,
  storageKey,
}: ProviderProps) {
  const searchParams = useSearchParams();
  const urlMarcaRaw = allowUrlOverride ? searchParams.get("marca") : null;
  const urlMarca = urlMarcaRaw ? parseConsultoriaMarca(urlMarcaRaw) : null;

  const [storedMarca, setStoredMarca] = useState<ConsultoriaMarcaPresentacion>(() =>
    resolveConsultoriaMarca(initialMarca),
  );
  const [previewMarca, setPreviewMarca] = useState<ConsultoriaMarcaPresentacion | null>(null);

  useEffect(() => {
    setStoredMarca(resolveConsultoriaMarca(initialMarca));
  }, [initialMarca]);

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return;
    const saved = window.localStorage.getItem(storageKey);
    if (saved) {
      setStoredMarca(parseConsultoriaMarca(saved));
    }
  }, [storageKey]);

  const setMarca = useCallback(
    (marca: ConsultoriaMarcaPresentacion) => {
      setStoredMarca(marca);
      setPreviewMarca(null);
      if (storageKey && typeof window !== "undefined") {
        window.localStorage.setItem(storageKey, marca);
      }
    },
    [storageKey],
  );

  const marca = previewMarca ?? urlMarca ?? storedMarca ?? DEFAULT_CONSULTORIA_MARCA;

  const value = useMemo(
    () => ({
      marca,
      storedMarca,
      setMarca,
      previewMarca,
      setPreviewMarca,
    }),
    [marca, storedMarca, setMarca, previewMarca],
  );

  return (
    <ConsultoriaMarcaContext.Provider value={value}>{children}</ConsultoriaMarcaContext.Provider>
  );
}

export function useConsultoriaMarca(): ConsultoriaMarcaContextValue {
  const ctx = useContext(ConsultoriaMarcaContext);
  if (!ctx) {
    return {
      marca: DEFAULT_CONSULTORIA_MARCA,
      storedMarca: DEFAULT_CONSULTORIA_MARCA,
      setMarca: () => {},
      previewMarca: null,
      setPreviewMarca: () => {},
    };
  }
  return ctx;
}

export { CONSULTORIA_MARCA_STORAGE_KEY };
