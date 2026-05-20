const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const slugifyCatalogId = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const assertCatalogId = (value: string, label: string) => {
  const normalized = value.trim().toLowerCase();
  if (!ID_PATTERN.test(normalized)) {
    throw new Error(`${label} inválido. Usa minúsculas, números y guiones.`);
  }
  return normalized;
};
