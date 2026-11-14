import type { Metadata, Viewport } from "next";
import { Fauna_One, Quicksand, Ultra } from "next/font/google";
import type { ReactNode } from "react";
import { Footer, Navbar } from "./components";
import "./globals.css";

const ultra = Ultra({ subsets: ["latin"], weight: "400", variable: "--font-ultra" });
const fauna = Fauna_One({ subsets: ["latin"], weight: "400", variable: "--font-fauna" });
const quicksand = Quicksand({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-quicksand" });

export const metadata: Metadata = { title: "Zermitt — money home, by sentence", description: "Send USDT or NEAR into USDC on NEAR testnet with one sentence and a claim link.", icons: { icon: "/zermitt-mark.png", apple: "/zermitt-mark.png" } };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#F4F1EA" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en" className={`${ultra.variable} ${fauna.variable} ${quicksand.variable}`}><body><a className="skip-link" href="#app-content">Skip to content</a><Navbar /><div id="app-content">{children}</div><div className="app-footer"><Footer /></div></body></html>;
}
