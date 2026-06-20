import { GABI_ADMIN_DESARROLLO_KEY } from "@/lib/session/keys";

export const ADMIN_DESARROLLO_CHANGE_EVENT = "gabi-admin-desarrollo-change";

type DesarrolloOption = { id: string };

type ResolveOptions = {
  /** Valor desde searchParams (?desarrolloId= o ?desarrollo=). */
  urlDesarrolloId?: string | null;
  /** Si no hay URL ni sesión guardada, usar este id (ej. piloto de guardias). */
  fallbackDesarrolloId?: string | null;
};

export function readStoredAdminDesarrolloId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return sessionStorage.getItem(GABI_ADMIN_DESARROLLO_KEY);
  } catch {
    return null;
  }
}

export function writeStoredAdminDesarrolloId(id: string): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    sessionStorage.setItem(GABI_ADMIN_DESARROLLO_KEY, id);
    window.dispatchEvent(new CustomEvent(ADMIN_DESARROLLO_CHANGE_EVENT, { detail: id }));
  } catch {
    // sessionStorage bloqueado o sin cuota
  }
}

export function resolveAdminDesarrolloId(
  desarrollos: DesarrolloOption[],
  options?: ResolveOptions,
): string {
  const allowed = new Set(desarrollos.map((item) => item.id));

  const fromUrl = options?.urlDesarrolloId;
  if (fromUrl && allowed.has(fromUrl)) {
    return fromUrl;
  }

  const stored = readStoredAdminDesarrolloId();
  if (stored && allowed.has(stored)) {
    return stored;
  }

  const fallback = options?.fallbackDesarrolloId;
  if (fallback && allowed.has(fallback)) {
    return fallback;
  }

  return desarrollos[0]?.id ?? "";
}
