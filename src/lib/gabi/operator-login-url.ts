import { absoluteDmbUrl, isDmbHostname, isLocalDevHost } from "@/lib/dmb/host";
import { isDmbContentRoute } from "@/lib/dmb/routes";
import { OPERATOR_LOGIN_PATH } from "@/lib/gabi/operator";

const DEFAULT_AFTER_LOGIN = "/gabi";

function resolveHost(host?: string): string {
  if (host) {
    return host;
  }
  if (typeof window !== "undefined") {
    return window.location.host;
  }
  return "";
}

/** true cuando el login debe ocurrir en dmb.mx (contenido consultoría en prod). */
export function shouldUseDmbOperatorLogin(nextPath: string | null | undefined, host?: string): boolean {
  const next = nextPath?.trim();
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return false;
  }
  const resolvedHost = resolveHost(host);
  if (isDmbHostname(resolvedHost) || isLocalDevHost(resolvedHost)) {
    return false;
  }
  return isDmbContentRoute(next);
}

/** URL de login operador respetando el dominio correcto (gabi.mx vs dmb.mx). */
export function operatorLoginHref(nextPath?: string, host?: string): string {
  const next = nextPath?.trim();
  const query = next ? `?next=${encodeURIComponent(next)}` : "";

  if (shouldUseDmbOperatorLogin(next, host)) {
    return absoluteDmbUrl(`${OPERATOR_LOGIN_PATH}${query}`);
  }

  return `${OPERATOR_LOGIN_PATH}${query}`;
}

/** Destino tras login exitoso (mismo origen que la ruta protegida). */
export function operatorPostLoginUrl(nextPath: string | null | undefined, host?: string): string {
  const next = nextPath?.trim();
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return DEFAULT_AFTER_LOGIN;
  }

  const resolvedHost = resolveHost(host);
  const isDmb = isDmbHostname(resolvedHost);
  const isLocal = isLocalDevHost(resolvedHost);

  if (!isLocal && isDmbContentRoute(next) && !isDmb) {
    return absoluteDmbUrl(next);
  }

  return next;
}
