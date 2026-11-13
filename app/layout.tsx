import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Serif, Inter, JetBrains_Mono } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const sans = Inter({ subsets: ["latin"], variable: "--font-inter" });
const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage" });
const emotional = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: "italic",
  variable: "--font-instrument",
});
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
  title: "Zermitt — money home, by sentence",
  description: "Send USDT or NEAR into USDC on NEAR testnet with one sentence and a claim link.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#EEF2EA" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} ${emotional.variable} ${mono.variable}`}>
      <body>
        <a className="skip-link" href="#main-content">Skip to content</a>
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
