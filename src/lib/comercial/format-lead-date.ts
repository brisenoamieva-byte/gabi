export const formatLeadDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export const formatLeadActivity = (iso: string) => {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return date.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays === 1) {
    return "Ayer";
  }
  if (diffDays < 7) {
    return `Hace ${diffDays} días`;
  }

  return date.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
};

export type LeadPeriodFilter = "" | "7d" | "30d" | "month";

export const leadPeriodToRange = (
  period: LeadPeriodFilter,
): { desde?: string; hasta?: string } => {
  if (!period) {
    return {};
  }

  const now = new Date();
  const hasta = now.toISOString().slice(0, 10);

  if (period === "7d") {
    const desdeDate = new Date(now);
    desdeDate.setDate(desdeDate.getDate() - 7);
    return { desde: desdeDate.toISOString().slice(0, 10), hasta };
  }

  if (period === "30d") {
    const desdeDate = new Date(now);
    desdeDate.setDate(desdeDate.getDate() - 30);
    return { desde: desdeDate.toISOString().slice(0, 10), hasta };
  }

  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    desde: start.toISOString().slice(0, 10),
    hasta: end.toISOString().slice(0, 10),
  };
};
