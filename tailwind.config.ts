import type { Config } from "tailwindcss";
import { bbrBrand, gabiBrand } from "./src/lib/brand/colors";
import { dmbBrand } from "./src/lib/brand/dmb-colors";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        gabi: {
          navy: gabiBrand.navy,
          "navy-light": gabiBrand.navyLight,
          "navy-dark": gabiBrand.navyDark,
          teal: gabiBrand.teal,
          cyan: gabiBrand.cyan,
          emerald: gabiBrand.emerald,
          amber: gabiBrand.amber,
          surface: gabiBrand.surface,
          muted: gabiBrand.muted,
          line: gabiBrand.line,
          ink: gabiBrand.ink,
          // Aliases legacy → nueva paleta
          forest: gabiBrand.navy,
          "forest-light": gabiBrand.navyLight,
          "forest-dark": gabiBrand.navyDark,
          sand: gabiBrand.teal,
          "sand-light": "#5EEAD4",
          cream: gabiBrand.surface,
          "cream-dark": gabiBrand.line,
        },
        bbr: {
          purple: bbrBrand.purple,
          "purple-light": bbrBrand.purpleLight,
          green: bbrBrand.green,
          "green-dark": bbrBrand.greenDark,
          cream: bbrBrand.cream,
        },
        dmb: {
          ink: dmbBrand.ink,
          charcoal: dmbBrand.charcoal,
          accent: dmbBrand.accent,
          "accent-light": dmbBrand["accent-light"],
          surface: dmbBrand.surface,
          muted: dmbBrand.muted,
          line: dmbBrand.line,
        },
      },
    },
  },
  plugins: [],
};
export default config;
