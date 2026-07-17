import { GABI_ADMIN_SHOW_INACTIVE_DESARROLLOS_KEY } from "@/lib/session/keys";

/** Por defecto se ocultan los desarrollos pausados de la vista personal. */
export const readShowInactiveDesarrollos = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    return window.localStorage.getItem(GABI_ADMIN_SHOW_INACTIVE_DESARROLLOS_KEY) === "1";
  } catch {
    return false;
  }
};

export const writeShowInactiveDesarrollos = (show: boolean): void => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(
      GABI_ADMIN_SHOW_INACTIVE_DESARROLLOS_KEY,
      show ? "1" : "0",
    );
  } catch {
    // localStorage bloqueado
  }
};

export const isDesarrolloActivoEnCatalogo = (desarrollo: {
  catalogActivo?: boolean;
}): boolean => desarrollo.catalogActivo !== false;

export const filterDesarrollosForPersonalVista = <
  T extends { catalogActivo?: boolean },
>(
  desarrollos: T[],
  showInactive: boolean,
): T[] => {
  if (showInactive) {
    return desarrollos;
  }
  return desarrollos.filter(isDesarrolloActivoEnCatalogo);
};
