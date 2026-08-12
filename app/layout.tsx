import type { Metadata } from "next";
import { Topbar, Sidebar, MobileBottomNav } from "./_components/navigation";
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
        <div className="site-shell" id="home">
          <Topbar />
          <Sidebar />
          <main className="main-content">
            <div className="content-wrap">
              {children}
            </div>
          </main>
          <MobileBottomNav />
        </div>
      </body>
    </html>
  );
}
