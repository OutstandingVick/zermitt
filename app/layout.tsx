import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zermitt",
  description: "AI remittance agent on NEAR — send money with a sentence.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0f766e" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <a href="/" className="brand">
            zer<span>mitt</span>
          </a>
          <nav>
            <a href="/send">Send</a>
            <a href="/wallet">Wallet</a>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
