import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { DevServiceWorkerCleanup } from "@/components/DevServiceWorkerCleanup";
import { OfflineStatus } from "@/components/OfflineStatus";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "gabi - Guía para Asesores de Bienes Inmuebles",
  description:
    "Guía digital para asesores inmobiliarios: estructura cada recorrido comercial desde la visita hasta el cierre. No es un CRM.",
  manifest: "/manifest.json",
  icons: {
    icon: "/logos/gabi-icon.png",
    apple: "/logos/gabi-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#1B4332",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        {process.env.NODE_ENV === "development" ? <DevServiceWorkerCleanup /> : null}
        <OfflineStatus />
      </body>
    </html>
  );
}
