import type { Metadata, Viewport } from "next";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "VOYAGE — Où voulez-vous partir ?",
    template: "%s · VOYAGE",
  },
  description:
    "Trouvez la meilleure destination selon votre budget, la météo et vos envies. Conseiller de voyage intelligent : météo, transport, hébergement et budget comparés en un seul score.",
  applicationName: "VOYAGE",
  openGraph: {
    title: "VOYAGE — Conseiller de voyage intelligent",
    description:
      "Où puis-je partir aux dates choisies avec la meilleure météo possible, dans mon budget et au meilleur rapport qualité/prix ?",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body className="min-h-dvh bg-[var(--background)] antialiased">
        <TooltipProvider delayDuration={200}>
          <SiteHeader />
          <main className="min-h-[60dvh]">{children}</main>
          <SiteFooter />
        </TooltipProvider>
      </body>
    </html>
  );
}
