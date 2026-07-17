import { formatPrice } from "@/lib/data";
import type { VisitaFollowUpInput } from "@/lib/visitas/follow-up";

export type PostVisitaEmailContent = {
  subject: string;
  text: string;
  html: string;
};

export const buildPostVisitaEmailContent = (
  input: VisitaFollowUpInput,
  siteUrl: string,
): PostVisitaEmailContent => {
  const firstName = input.clienteNombre?.trim().split(/\s+/)[0] ?? "";
  const greeting = firstName ? `Hola ${firstName},` : "Hola,";

  const detailLines = [
    input.clusterNombre ? `Interés: ${input.clusterNombre}` : null,
    input.prototipoNombre ? `Producto: ${input.prototipoNombre}` : null,
    input.precioFinal ? `Precio referencia: ${formatPrice(input.precioFinal)}` : null,
  ].filter(Boolean) as string[];

  const textLines = [
    greeting,
    "",
    `Gracias por tu visita a ${input.desarrolloNombre}.`,
    ...detailLines.map((line) => line),
    "",
    "Quedo atento para resolver dudas y dar seguimiento a tu proceso.",
    "",
    `— ${input.asesorNombre}`,
    "",
    "Enviado con gabi",
    siteUrl,
  ];

  const subject = `Gracias por tu visita · ${input.desarrolloNombre}`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F2F0E9;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#201044;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F2F0E9;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(32,16,68,0.08);">
        <tr><td style="background:#13315C;padding:28px 32px;">
          <p style="margin:0;font-size:22px;font-weight:600;letter-spacing:-0.04em;line-height:1;">
            <span style="color:#2DD4BF;">g</span><span style="color:#ffffff;">abi</span>
          </p>
          <h1 style="margin:10px 0 0;font-size:22px;font-weight:800;color:#ffffff;line-height:1.3;">Gracias por tu visita</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">${greeting}</p>
          <p style="margin:0 0 20px;font-size:16px;line-height:1.6;">Gracias por conocer <strong>${input.desarrolloNombre}</strong>. Fue un gusto acompañarte en el recorrido.</p>
          ${
            detailLines.length
              ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px;background:#F2F0E9;border-radius:12px;">
            ${detailLines
              .map(
                (line) =>
                  `<tr><td style="padding:12px 16px;font-size:14px;font-weight:600;border-bottom:1px solid rgba(32,16,68,0.06);">${line}</td></tr>`,
              )
              .join("")}
          </table>`
              : ""
          }
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#475569;">Quedo atento para resolver dudas y dar seguimiento a tu proceso.</p>
          <p style="margin:0;font-size:15px;font-weight:700;color:#13315C;">— ${input.asesorNombre}</p>
        </td></tr>
        <tr><td style="padding:20px 32px;background:#F8FAFC;border-top:1px solid #E2E8F0;">
          <p style="margin:0;font-size:12px;color:#94A3B8;text-align:center;">Enviado con <a href="${siteUrl}" style="font-weight:600;text-decoration:none;letter-spacing:-0.03em;"><span style="color:#2DD4BF;">g</span><span style="color:#13315C;">abi</span></a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return {
    subject,
    text: textLines.join("\n"),
    html,
  };
};
