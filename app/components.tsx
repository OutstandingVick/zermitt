import Image from "next/image";
import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

export function Navbar() {
  return <header className="site-nav"><Link className="wordmark" href="/" aria-label="Zermitt home"><Image src="/zermitt-mark.png" width={30} height={30} alt="" /><span>Zermitt</span></Link><nav aria-label="Primary"><a href="/#how">How it works</a><a href="/#family">For family</a><a href="/#proof">Proof</a><a href="/#near">NEAR</a></nav><div className="nav-actions"><a href="https://github.com/OutstandingVick/zermitt">GitHub</a><Button href="/send">Try the demo</Button></div></header>;
}

type ButtonProps = { children: ReactNode; href?: string; variant?: "primary" | "secondary"; className?: string } & ButtonHTMLAttributes<HTMLButtonElement> & AnchorHTMLAttributes<HTMLAnchorElement>;
export function Button({ children, href, variant = "primary", className = "", ...props }: ButtonProps) {
  const cn = `btn btn-${variant} ${className}`.trim();
  if (href) return <Link href={href} className={cn}>{children}</Link>;
  return <button className={cn} {...props}>{children}</button>;
}

export function Label({ children }: { children: ReactNode }) { return <p className="section-label">{children}</p>; }
export function Section({ children, className = "", id }: { children: ReactNode; className?: string; id?: string }) { return <section id={id} className={`site-section ${className}`}>{children}</section>; }

export function TornEdge() { return <svg className="torn-edge" viewBox="0 0 1440 42" preserveAspectRatio="none" aria-hidden="true"><path d="M0 10L22 14 39 7 61 16 83 11 107 20 132 12 157 18 184 9 211 16 235 10 261 20 286 13 313 18 342 8 371 15 399 12 428 21 455 10 485 16 513 8 544 18 574 12 606 22 635 14 667 19 700 10 733 17 766 12 801 23 835 16 868 21 902 11 937 18 973 13 1008 24 1043 15 1079 20 1117 10 1153 18 1190 12 1227 22 1264 14 1300 19 1337 9 1373 16 1410 8 1440 14V42H0Z" fill="currentColor"/></svg>; }

export function Footer({ full = false }: { full?: boolean }) {
  if (!full) return <footer className="slim-footer"><TornEdge /><div><span>Zermitt</span><small>Testnet money only · cash-out and card are roadmap items.</small></div></footer>;
  return <footer className="full-footer"><TornEdge /><div className="footer-grid"><div><p>Built at #NEARHackathon<br/>by OutstandingVick</p><a className="footer-box" href="https://x.com/zermitt_cash">X · @zermitt_cash</a></div><figure className="polaroid"><Image src="/landing/family-together.jpg" fill alt="A mother and son reunited" sizes="260px"/><figcaption>Mother and son, reunited.</figcaption></figure><div className="gas"><strong>$0.00</strong><span>gas for the family</span><div><a href="https://github.com/OutstandingVick/zermitt">GitHub</a><Link href="/r/2b9f5291-5ed5-40a8-9823-acb6e7611cbf">Verify a receipt</Link></div></div></div><div className="giant-wordmark"><span>Z</span>ERMITT</div><div className="footer-meta">Money home, by sentence. · <a href="/docs/IMAGE_CREDITS.md">Image credits</a> · © 2026 Zermitt</div></footer>;
}
