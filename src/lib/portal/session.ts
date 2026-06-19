import { GABI_PORTAL_KEY } from "@/lib/session/keys";

export type PortalSession = {
  id: string;
  nombre: string;
  slug: string;
  logo: string;
  portalPath: string;
  colorPrimary: string;
  colorAccent: string;
};

export const PORTAL_STORAGE_KEY = GABI_PORTAL_KEY;

export const portalPinPath = (slug: string) => `/portal/${slug}`;

export const readPortalSession = (): PortalSession | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = localStorage.getItem(PORTAL_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as PortalSession;
  } catch {
    localStorage.removeItem(PORTAL_STORAGE_KEY);
    return null;
  }
};

export const resolveAdvisorEntryPath = (session?: PortalSession | null) =>
  session?.portalPath ?? "/portal";

export const resolvePortalLogoutPath = () => "/portal";
