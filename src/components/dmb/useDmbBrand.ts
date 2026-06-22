"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { isDmbHostname } from "@/lib/dmb/host";
import { DMB_BRAND_COOKIE } from "@/lib/dmb/routes";

function readBrandCookie(): boolean {
  if (typeof document === "undefined") {
    return false;
  }
  return document.cookie.split(";").some((c) => c.trim() === `${DMB_BRAND_COOKIE}=dmb`);
}

/** true en dmb.mx, /dmb/* o cookie de marca DMB (dev local). */
export function useDmbBrand(): boolean {
  const pathname = usePathname();
  const [isDmb, setIsDmb] = useState(false);

  useEffect(() => {
    const host = window.location.hostname;
    setIsDmb(
      isDmbHostname(host) || pathname.startsWith("/dmb") || readBrandCookie(),
    );
  }, [pathname]);

  return isDmb;
}

export function setDmbBrandCookie(): void {
  document.cookie = `${DMB_BRAND_COOKIE}=dmb;path=/;max-age=${60 * 60 * 24 * 30};SameSite=Lax`;
}
