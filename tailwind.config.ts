import type { Config } from "tailwindcss";

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
          forest: "#1B4332",
          "forest-light": "#245A42",
          "forest-dark": "#142E23",
          sand: "#C8A276",
          "sand-light": "#D9BC9A",
          cream: "#F2F0E9",
          "cream-dark": "#E8E4DA",
          ink: "#1A2E24",
        },
      },
    },
  },
  plugins: [],
};
export default config;
