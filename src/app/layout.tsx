import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { DevServiceWorkerCleanup } from "@/components/DevServiceWorkerCleanup";
import { OfflineStatus } from "@/components/OfflineStatus";
import { ObservabilityInit } from "@/components/ObservabilityInit";
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
  title: "gabi — Sistema comercial inmobiliario",
  description:
    "gabi concentra recorrido, cotización, CRM, sembrado, expedientes y estudios de mercado en un solo sistema para comercializadoras inmobiliarias.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/logos/gabi-icon.svg", type: "image/svg+xml" },
      { url: "/logos/gabi-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/logos/gabi-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/logos/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#13315C",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
        <ObservabilityInit />
        {process.env.NODE_ENV === "development" ? <DevServiceWorkerCleanup /> : null}
        <OfflineStatus />
      </body>
    </html>
  );
}
