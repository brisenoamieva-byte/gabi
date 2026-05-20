import type { Config } from "tailwindcss";
import { bbrBrand, gabiBrand } from "./src/lib/brand/colors";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
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
      },
    },
  },
  plugins: [],
};
export default config;
