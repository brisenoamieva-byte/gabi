import { comercializadores, type Comercializador } from "@/lib/data";

const portalPasswordEnvKey = (slug: string) =>
  `PORTAL_${slug.toUpperCase().replace(/-/g, "_")}_PASSWORD`;

export const resolvePortalPassword = (slug: string, devPassword: string): string | null => {
  const fromEnv = process.env[portalPasswordEnvKey(slug)]?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  if (process.env.NODE_ENV === "development") {
    return devPassword;
  }

  return null;
};

export const authenticateComercializador = (
  usuario: string,
  password: string,
): Comercializador | null => {
  const normalizedUser = usuario.trim().toLowerCase();
  const match = comercializadores.find(
    (item) => item.usuario.toLowerCase() === normalizedUser,
  );

  if (!match) {
    return null;
  }

  const expected = resolvePortalPassword(match.slug, match.password);
  if (!expected || password !== expected) {
    return null;
  }

  return match;
};
