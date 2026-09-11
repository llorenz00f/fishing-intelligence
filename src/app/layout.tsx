import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import "@/components/appearance/appearance.css";
import { ThemeProvider } from "@/components/appearance/ThemeProvider";
import { themeBootstrapScript, themeStyleSheet } from "@/domain/appearance/registry";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Fishing Intelligence",
    template: "%s | Fishing Intelligence",
  },
  description:
    "Previsioni, score spiegabile, sessioni e pattern personali per la pesca nel Mediterraneo.",
  applicationName: "Fishing Intelligence",
  openGraph: {
    title: "Fishing Intelligence",
    description:
      "Analizza mare, meteo, tecnica, specie e storico personale per decidere meglio quando pescare.",
    type: "website",
  },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", interactiveWidget: "resizes-content", themeColor: "#06151D" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="it"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head><style>{themeStyleSheet}</style><script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} /></head>
      <body className="min-h-full"><ThemeProvider>{children}</ThemeProvider></body>
    </html>
  );
}
