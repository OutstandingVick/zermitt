import type { Viewport } from "next";
import type { ReactNode } from "react";
import { Footer, Navbar } from "../components";

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#F4F1EA" };

/** Light marketing site: landing page and spikes. */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return <><a className="skip-link" href="#app-content">Skip to content</a><Navbar /><div id="app-content">{children}</div><div className="app-footer"><Footer /></div></>;
}
