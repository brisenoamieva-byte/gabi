const DEFAULT_BOOKING_URL =
  "mailto:hola@gabi.mx?subject=Quiero%20Gabi%20para%20mi%20desarrollo";

const CAL_HOSTS = ["cal.com", "app.cal.com", "cal.eu", "app.cal.eu"];

export const getDemoBookingUrl = () =>
  process.env.NEXT_PUBLIC_DEMO_BOOKING_URL?.trim() || DEFAULT_BOOKING_URL;

export const isDemoBookingConfigured = () =>
  Boolean(process.env.NEXT_PUBLIC_DEMO_BOOKING_URL?.trim());

export const isCalendarBookingUrl = (url: string) => {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return (
      CAL_HOSTS.some((calHost) => host === calHost || host.endsWith(`.${calHost}`)) ||
      host.includes("calendly.com")
    );
  } catch {
    return false;
  }
};

export const getDemoBookingEmbedUrl = (
  embedDomain = "gabi.mx",
  timezone?: string,
) => {
  const url = getDemoBookingUrl();

  if (!isCalendarBookingUrl(url)) {
    return null;
  }

  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes("calendly.com")) {
      parsed.searchParams.set("embed_domain", embedDomain);
      parsed.searchParams.set("embed_type", "Inline");
      parsed.searchParams.set("hide_gdpr_banner", "1");
      return parsed.toString();
    }

    parsed.searchParams.set("embed", "true");
    parsed.searchParams.set("theme", "light");
    parsed.searchParams.set("layout", "month_view");
    if (timezone) {
      parsed.searchParams.set("cal.tz", timezone);
    }
    return parsed.toString();
  } catch {
    return null;
  }
};

export const getBrowserTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
};
