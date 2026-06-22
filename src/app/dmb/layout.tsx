import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DMB — Consultoría comercial inmobiliaria",
  description:
    "Propuestas comerciales, estudios de mercado y corredor sur. Consultoría para desarrolladores inmobiliarios.",
};

export default function DmbLayout({ children }: { children: React.ReactNode }) {
  return children;
}
