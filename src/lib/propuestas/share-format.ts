export function formatShareExpiry(expiresAt: string | null | undefined): string {
  if (!expiresAt) return "Sin vencimiento";
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return "Sin vencimiento";
  const now = Date.now();
  if (date.getTime() < now) return "Vencido";
  return date.toLocaleString("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function isShareExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now();
}
