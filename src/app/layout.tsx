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
  title: "gabi - Plataforma comercial inmobiliaria integral",
  description:
    "Plataforma comercial inmobiliaria: recorrido guiado, cotizador, CRM de leads, sembrado, campañas y métricas para comercializadoras en México.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/logos/gabi-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/logos/gabi-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/logos/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#13315C",
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
