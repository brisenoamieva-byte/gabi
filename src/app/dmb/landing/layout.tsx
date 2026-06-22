import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DMB — Consultoría comercial inmobiliaria",
  description:
    "Estrategia comercial, estudios de mercado, pricing y comercialización para desarrolladores inmobiliarios en Querétaro y el Bajío.",
  openGraph: {
    title: "DMB Consultoría Inmobiliaria",
    description: "Transformamos proyectos inmobiliarios en historias de éxito comercial.",
    siteName: "DMB",
  },
};

export default function DmbLandingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
