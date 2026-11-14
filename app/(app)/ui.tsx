/**
 * Shared UI for the dark Zermitt app (styles: `.zapp` section of globals.css).
 * Icons are inline SVG; decorative ones are aria-hidden.
 */
import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

/* ── Icons ─────────────────────────────────────────────────────────── */
type IconName =
  | "back" | "close" | "send" | "home" | "receipt" | "profile" | "check" | "shield"
  | "arrowDown" | "google" | "help" | "copy" | "external";
const PATHS: Record<IconName, ReactNode> = {
  back: <path d="M15 18l-6-6 6-6" />,
  close: <path d="M18 6L6 18M6 6l12 12" />,
  send: <><path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4z" /></>,
  home: <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  receipt: <><path d="M6 2h12v20l-3-2-3 2-3-2-3 2z" /><path d="M9 7h6M9 11h6" /></>,
  profile: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></>,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  shield: <><path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z" /><path d="M8.5 12l2.5 2.5 4.5-5" /></>,
  arrowDown: <path d="M12 5v14M6 13l6 6 6-6" />,
  google: <path d="M21 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h5.1a4.4 4.4 0 0 1-1.9 2.9v2.4h3.1c1.8-1.7 2.7-4.1 2.7-7zM12 21c2.6 0 4.7-.9 6.3-2.3l-3.1-2.4c-.9.6-2 .9-3.2.9-2.5 0-4.6-1.7-5.3-3.9H3.5v2.5A9 9 0 0 0 12 21zM6.7 13.3a5.4 5.4 0 0 1 0-3.5V7.3H3.5a9 9 0 0 0 0 8.1zM12 6.6c1.4 0 2.6.5 3.6 1.4l2.7-2.7A9 9 0 0 0 3.5 7.3l3.2 2.5C7.4 8.3 9.5 6.6 12 6.6z" />,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.6V14" /><path d="M12 17.5h.01" /></>,
  copy: <><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a1 1 0 0 1 1-1h10" /></>,
  external: <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />,
};
export function Icon({ name, size = 20, stroke = 2 }: { name: IconName; size?: number; stroke?: number }) {
  const filled = name === "google";
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke={filled ? "none" : "currentColor"} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      {PATHS[name]}
    </svg>
  );
}

/* ── Layout ────────────────────────────────────────────────────────── */
/** Page body of the app column. `nav` reserves room for the bottom nav. */
export function AppShell({ children, nav = false, glow = false }: { children: ReactNode; nav?: boolean; glow?: boolean }) {
  return <main id="zmain" className={`zmain${nav ? " has-nav" : ""}${glow ? " glow" : ""}`}>{children}</main>;
}

/** Back/close + centred title, as in the designs. */
export function TopBar({ title, back, close }: { title?: string; back?: string | (() => void); close?: string }) {
  return (
    <div className="z-row-flex">
      {back && <IconButton label="Back" icon="back" {...(typeof back === "string" ? { href: back } : { onClick: back })} />}
      {title && <h1 className="z-title" style={back ? undefined : { marginLeft: 44 }}>{title}</h1>}
      {close && <><span className="z-spacer" /><IconButton label="Close" icon="close" href={close} /></>}
    </div>
  );
}

export type NavTab = "home" | "send" | "receipts" | "profile";
export function BottomNav({ active }: { active: NavTab }) {
  const tabs: Array<{ id: NavTab; label: string; href: string; icon: IconName }> = [
    { id: "home", label: "Home", href: "/wallet", icon: "home" },
    { id: "send", label: "Send", href: "/send", icon: "send" },
    { id: "receipts", label: "Receipts", href: "/wallet#receipts", icon: "receipt" },
    { id: "profile", label: "Profile", href: "/wallet#profile", icon: "profile" },
  ];
  return (
    <nav className="z-nav" aria-label="App">
      {tabs.map((t) => (
        <Link key={t.id} href={t.href} aria-current={t.id === active ? "page" : undefined}>
          <Icon name={t.icon} />
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

/* ── Primitives ────────────────────────────────────────────────────── */
export function Card({ children, className = "", pad = true, ...rest }: { children: ReactNode; className?: string; pad?: boolean; id?: string; "aria-busy"?: boolean }) {
  return <div className={`z-card${pad ? " z-pad" : ""} ${className}`.trim()} {...rest}>{children}</div>;
}

type Variant = "orange" | "lemon" | "ghost" | "light";
type BtnProps = { variant?: Variant; href?: string; external?: boolean; children: ReactNode; className?: string } & ButtonHTMLAttributes<HTMLButtonElement>;
export function Button({ variant = "lemon", href, external, children, className = "", ...rest }: BtnProps) {
  const cn = `z-btn z-btn-${variant} ${className}`.trim();
  if (href) {
    return external
      ? <a className={cn} href={href} target="_blank" rel="noreferrer">{children}</a>
      : <Link className={cn} href={href}>{children}</Link>;
  }
  return <button type="button" className={cn} {...rest}>{children}</button>;
}

export function IconButton({ label, icon, href, onClick, large, tone }: { label: string; icon: IconName; href?: string; onClick?: () => void; large?: boolean; tone?: "orange" }) {
  const cn = `z-ico${large ? " z-ico-lg" : ""}${tone === "orange" ? " z-ico-orange" : ""}`;
  if (href) return <Link className={cn} href={href} aria-label={label}><Icon name={icon} /></Link>;
  return <button type="button" className={cn} aria-label={label} onClick={onClick}><Icon name={icon} /></button>;
}

export function Label({ children, htmlFor, className = "" }: { children: ReactNode; htmlFor?: string; className?: string }) {
  return htmlFor
    ? <label className={`z-lab ${className}`.trim()} htmlFor={htmlFor}>{children}</label>
    : <p className={`z-lab ${className}`.trim()}>{children}</p>;
}

/** One label/value line inside a <dl>. */
export function Row({ label, children }: { label: ReactNode; children: ReactNode }) {
  return <div className="z-rowi"><dt>{label}</dt><dd>{children}</dd></div>;
}

export function Chip({ label, value }: { label: string; value: ReactNode }) {
  return <span className="z-chip">{label} · <b>{value}</b></span>;
}

export function StatusDot({ state }: { state: "done" | "pending" | "idle" }) {
  return <span className={`z-dot z-dot-${state}`} aria-hidden="true" />;
}

export function Skeleton({ h, w = "100%", style }: { h: number; w?: number | string; style?: React.CSSProperties }) {
  return <div className="z-skel" style={{ height: h, width: w, ...style }} />;
}

/* ── Helpers ───────────────────────────────────────────────────────── */
/** "$39.95" with muted cents, as in the designs. */
export function Money({ value, size }: { value: number; size: number }) {
  const [whole, cents] = Math.max(0, value).toFixed(2).split(".");
  return <p className="z-amount" style={{ fontSize: size }}>${Number(whole).toLocaleString("en-US")}<span className="cents">.{cents}</span></p>;
}

export function shortHash(h: string, head = 4, tail = 4): string {
  return h.length > head + tail + 1 ? `${h.slice(0, head)}…${h.slice(-tail)}` : h;
}

export function titleCase(s: string): string {
  return s.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function timeAgo(ms: number): string {
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}
