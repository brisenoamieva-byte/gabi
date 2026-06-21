export const getComplianceRecorridoBlockThreshold = (): number => {
  const raw = process.env.COMPLIANCE_RECORRIDO_BLOCK_OVERDUE?.trim();
  if (!raw) {
    return 3;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 3;
};

export const isComplianceServerEnforced = (): boolean =>
  process.env.COMPLIANCE_SERVER_ENFORCE?.trim() === "true";
