import { DM_Sans, Shippori_Mincho, Spectral } from "next/font/google";
import type { ReactNode } from "react";

const nuboBody = DM_Sans({
  subsets: ["latin"],
  variable: "--font-nubo-body",
  display: "swap",
});

const nuboHeading = Shippori_Mincho({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-nubo-heading",
  display: "swap",
});

const nuboSubheading = Spectral({
  subsets: ["latin"],
  style: ["italic"],
  weight: ["400"],
  variable: "--font-nubo-subheading",
  display: "swap",
});

export default function EstudiosLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${nuboBody.variable} ${nuboHeading.variable} ${nuboSubheading.variable} nubo-brand-root min-h-full`}
    >
      {children}
    </div>
  );
}
