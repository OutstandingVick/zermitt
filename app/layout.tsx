import type { Metadata } from "next";
import { Fauna_One, Quicksand, Ultra } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const ultra = Ultra({ subsets: ["latin"], weight: "400", variable: "--font-ultra" });
const fauna = Fauna_One({ subsets: ["latin"], weight: "400", variable: "--font-fauna" });
const quicksand = Quicksand({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-quicksand" });

export const metadata: Metadata = { title: "Zermitt — money home, by sentence", description: "Send USDT or NEAR into USDC on NEAR testnet with one sentence and a claim link." };

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en" className={`${ultra.variable} ${fauna.variable} ${quicksand.variable}`}><body>{children}</body></html>;
}
