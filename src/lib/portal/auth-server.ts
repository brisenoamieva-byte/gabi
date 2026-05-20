import { getComercializadoraByUsuario } from "@/lib/catalog/service";
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

const fallbackAuthenticate = (
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

  return {
    ...match,
    portalPath: match.portalPath.startsWith("/portal/")
      ? match.portalPath
      : `/portal/${match.slug}`,
  };
};

export const authenticateComercializador = async (
  usuario: string,
  password: string,
): Promise<Comercializador | null> => {
  const record = await getComercializadoraByUsuario(usuario);
  if (!record) {
    return fallbackAuthenticate(usuario, password);
  }

  const fallback = comercializadores.find((item) => item.slug === record.slug);
  const expected = resolvePortalPassword(record.slug, fallback?.password ?? "");
  if (!expected || password !== expected) {
    return null;
  }

  return {
    id: record.id,
    nombre: record.nombre,
    slug: record.slug,
    logo: record.logo ?? "",
    usuario: record.usuario,
    password: fallback?.password ?? "",
    portalPath: record.portalPath,
    colorPrimary: record.colorPrimary,
    colorAccent: record.colorAccent,
  };
};
