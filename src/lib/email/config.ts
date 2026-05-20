export type EmailConfig = {
  apiKey: string | null;
  from: string;
  siteUrl: string;
};

export const getEmailConfig = (): EmailConfig => ({
  apiKey: process.env.RESEND_API_KEY?.trim() || null,
  from: process.env.EMAIL_FROM?.trim() || "gabi <onboarding@resend.dev>",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://www.gabi.mx",
});

export const isEmailConfigured = () => Boolean(getEmailConfig().apiKey);
