import type { Viewport } from "next";
import type { ReactNode } from "react";

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#071013" };

/** Dark phone app: a 430px column centred on the app background. */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="zapp">
      <a className="zapp-skip" href="#zmain">Skip to content</a>
      <div className="zapp-col">{children}</div>
    </div>
  );
}
