import { getEmailConfig } from "@/lib/email/config";

export async function sendViaResend(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  const { apiKey, from } = getEmailConfig();
  if (!apiKey) {
    throw new Error("RESEND_API_KEY no configurada.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: params.subject,
      html: params.html,
      text: params.text,
    }),
  });

  const data = (await response.json()) as { message?: string };
  if (!response.ok) {
    throw new Error(data.message ?? `Resend respondió ${response.status}`);
  }
}
