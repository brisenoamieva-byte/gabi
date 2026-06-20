import { useCallback, useEffect, useState } from "react";
import {
  resolveAdminDesarrolloId,
  writeStoredAdminDesarrolloId,
} from "@/lib/admin/admin-desarrollo-session";

type DesarrolloOption = { id: string };

type UseAdminDesarrolloOptions = {
  urlDesarrolloId?: string | null;
  fallbackDesarrolloId?: string | null;
  /** No escribe en sesión al cambiar (ej. selector embebido en otra pantalla). */
  persist?: boolean;
};

/**
 * Desarrollo activo del backoffice: URL → sessionStorage → fallback → primer ítem.
 * Al cambiar, persiste para que otros módulos admin respeten el mismo contexto.
 */
export function useAdminDesarrolloSelection(
  desarrollos: DesarrolloOption[],
  options?: UseAdminDesarrolloOptions,
) {
  const persist = options?.persist ?? true;

  const resolve = useCallback(
    () =>
      resolveAdminDesarrolloId(desarrollos, {
        urlDesarrolloId: options?.urlDesarrolloId,
        fallbackDesarrolloId: options?.fallbackDesarrolloId,
      }),
    [desarrollos, options?.urlDesarrolloId, options?.fallbackDesarrolloId],
  );

  const [desarrolloId, setDesarrolloIdState] = useState(() => resolve());

  useEffect(() => {
    setDesarrolloIdState(resolve());
  }, [resolve]);

  const setDesarrolloId = useCallback(
    (id: string) => {
      if (persist) {
        writeStoredAdminDesarrolloId(id);
      }
      setDesarrolloIdState(id);
    },
    [persist],
  );

  return { desarrolloId, setDesarrolloId };
}
