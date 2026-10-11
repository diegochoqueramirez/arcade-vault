"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useState } from "react";

type Section = "biblioteca" | "salon" | "auth" | null;

function sectionFor(pathname: string): Section {
  if (pathname === "/" || pathname.startsWith("/games")) return "biblioteca";
  if (pathname.startsWith("/hall-of-fame")) return "salon";
  if (pathname.startsWith("/login")) return "auth";
  return null;
}

function NavView({ section }: { section: Section }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const cls = (name: Section) => (section === name ? "active" : "");
  const close = () => setOpen(false);

  return (
    <>
      <nav className="av-nav">
        <Link href="/" className="logo" onClick={close}>
          <div className="logo-mark"></div>
          <div className="logo-text neon-cyan">
            ARCADE <span className="neon-magenta">VAULT</span>
          </div>
        </Link>
        <div className="links">
          <Link href="/" className={cls("biblioteca")}>Biblioteca</Link>
          <Link href="/hall-of-fame" className={cls("salon")}>Salón de la Fama</Link>
        </div>
        <div className="spacer"></div>
        <div className="coin-counter">
          <span className="coin"></span>
          <span>CRÉDITOS · 03</span>
        </div>
        <button className="btn auth-btn" onClick={() => router.push("/login")}>
          Iniciar Sesión
        </button>
        <button className="btn ghost hamburger" onClick={() => setOpen(true)} aria-label="Menú">
          ≡
        </button>
      </nav>

      <div className={"av-mobile-backdrop" + (open ? " open" : "")} onClick={close}></div>
      <aside className={"av-mobile-panel" + (open ? " open" : "")}>
        <div className="pixel neon-cyan" style={{ fontSize: 11, marginBottom: 16 }}>MENÚ</div>
        <Link href="/" className={cls("biblioteca")} onClick={close}>Biblioteca</Link>
        <Link href="/hall-of-fame" className={cls("salon")} onClick={close}>Salón de la Fama</Link>
        <Link href="/login" className={cls("auth")} onClick={close}>Iniciar Sesión</Link>
        <div style={{ flex: 1 }}></div>
        <div className="pixel" style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: "0.16em" }}>
          CRÉDITOS · 03
        </div>
      </aside>
    </>
  );
}

function NavWithPathname() {
  const pathname = usePathname();
  return <NavView section={sectionFor(pathname)} />;
}

// usePathname puede suspender con cacheComponents en rutas con params desconocidos.
export default function Nav() {
  return (
    <Suspense fallback={<NavView section={null} />}>
      <NavWithPathname />
    </Suspense>
  );
}
