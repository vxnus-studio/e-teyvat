import type { Metadata } from "next";
import { SiteShell } from "./_components/site-shell";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: "E-Teyvat — Genshin Impact Knowledge Base",
  description:
    "A structured Genshin Impact archive for characters, builds, weapons, artifacts, materials, domains, quests, and regions.",
  openGraph: {
    title: "E-Teyvat",
    description: "The structured Genshin Impact knowledge base.",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "E-Teyvat knowledge base preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "E-Teyvat",
    description: "The structured Genshin Impact knowledge base.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
