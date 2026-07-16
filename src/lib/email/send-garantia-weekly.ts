import { getEmailConfig, isEmailConfigured } from "@/lib/email/config";
import {
  GARANTIA_SLA_CONTRACT,
  type GarantiaSlaReport,
} from "@/lib/comercial/garantia-sla";
import {
  buildGarantiaSlaPdfBytes,
  garantiaSlaPdfFilename,
} from "@/lib/comercial/garantia-sla-pdf";

const bytesToBase64 = (bytes: Uint8Array): string => {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, i + chunk);
    binary += String.fromCharCode(...Array.from(slice));
  }
  return btoa(binary);
};

export const sendGarantiaWeeklyReportEmail = async (input: {
  to: string;
  desarrolloNombre: string;
  report: GarantiaSlaReport;
  planLabel?: string;
  contractNotes?: string;
}): Promise<{ sent: boolean; error?: string }> => {
  if (!isEmailConfigured()) {
    return { sent: false, error: "email_not_configured" };
  }

  const { apiKey, from, siteUrl } = getEmailConfig();
  if (!apiKey) {
    return { sent: false, error: "email_not_configured" };
  }

  const planLabel = input.planLabel?.trim() || GARANTIA_SLA_CONTRACT.planLabelDefault;
  const subject =
    input.report.seal === "rojo"
      ? `GABI · Fuera de SLA — ${input.desarrolloNombre}`
      : input.report.seal === "riesgo"
        ? `GABI · Garantía en riesgo — ${input.desarrolloNombre}`
        : `GABI · Garantía en verde — ${input.desarrolloNombre}`;

  const checkLines = input.report.checks
    .map((c) => {
      const tag =
        c.status === "met" ? "OK" : c.status === "at_risk" ? "RIESGO" : "INCUMPLE";
      return `• [${tag}] ${c.label}: ${c.actualLabel} (meta ${c.targetLabel})`;
    })
    .join("\n");

  const text = [
    `Reporte semanal · ${planLabel}`,
    input.desarrolloNombre,
    "",
    `Sello: ${input.report.sealLabel}`,
    `Score: ${input.report.garantiaScorePct}%`,
    input.report.sealMessage,
    "",
    "Checks SLA:",
    checkLines,
    "",
    `Panel: ${siteUrl}/admin/crm-compliance`,
    "",
    "— gabi",
  ].join("\n");

  const htmlChecks = input.report.checks
    .map((c) => {
      const color =
        c.status === "met" ? "#059669" : c.status === "at_risk" ? "#d97706" : "#b91c1c";
      const tag =
        c.status === "met" ? "Cumple" : c.status === "at_risk" ? "En riesgo" : "Incumple";
      return `<tr>
        <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;">${c.label}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;color:${color};font-weight:700;">${tag}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;">${c.actualLabel}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;">${c.targetLabel}</td>
      </tr>`;
    })
    .join("");

  const sealBg =
    input.report.seal === "verde"
      ? "#ecfdf5"
      : input.report.seal === "riesgo"
        ? "#fffbeb"
        : input.report.seal === "rojo"
          ? "#fef2f2"
          : "#f8fafc";

  const html = `
    <div style="font-family:system-ui,sans-serif;color:#0f172a;max-width:640px;">
      <p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#94a3b8;font-weight:700;">Gabi · Reporte semanal</p>
      <h1 style="font-size:22px;margin:4px 0 8px;">${input.desarrolloNombre}</h1>
      <p style="color:#64748b;margin:0 0 16px;">${planLabel} · v${GARANTIA_SLA_CONTRACT.version}</p>
      <div style="background:${sealBg};border-radius:12px;padding:16px;margin-bottom:16px;">
        <p style="margin:0;font-size:18px;font-weight:800;">${input.report.sealLabel}</p>
        <p style="margin:6px 0 0;color:#334155;">${input.report.sealMessage}</p>
        <p style="margin:8px 0 0;font-weight:700;">Score ${input.report.garantiaScorePct}%</p>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="text-align:left;color:#94a3b8;font-size:11px;text-transform:uppercase;">
            <th style="padding:6px 8px;">Check</th>
            <th style="padding:6px 8px;">Estado</th>
            <th style="padding:6px 8px;">Actual</th>
            <th style="padding:6px 8px;">Meta</th>
          </tr>
        </thead>
        <tbody>${htmlChecks}</tbody>
      </table>
      <p style="margin-top:20px;"><a href="${siteUrl}/admin/crm-compliance" style="color:#13315C;font-weight:700;">Abrir Garantía SLA en Gabi</a></p>
      <p style="color:#94a3b8;font-size:12px;">Adjunto: PDF contractual de la semana.</p>
      <p style="color:#94a3b8;font-size:12px;">— gabi</p>
    </div>
  `;

  const pdfBytes = buildGarantiaSlaPdfBytes({
    desarrolloNombre: input.desarrolloNombre,
    report: input.report,
    planLabel,
    contractNotes: input.contractNotes,
  });
  const filename = garantiaSlaPdfFilename(input.desarrolloNombre, input.report.generatedAt);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject,
        html,
        text,
        attachments: [
          {
            filename,
            content: bytesToBase64(pdfBytes),
          },
        ],
      }),
    });

    const data = (await response.json()) as { message?: string };
    if (!response.ok) {
      throw new Error(data.message ?? `Resend ${response.status}`);
    }
    return { sent: true };
  } catch (error) {
    return {
      sent: false,
      error: error instanceof Error ? error.message : "send_failed",
    };
  }
};
