"use client";

import { Logo } from "./Logo";

const FOOTER_LINKS: { label: string; href: string; small?: boolean }[] = [
  { label: "Home", href: "#/" },
  { label: "The Club", href: "#/club" },
  { label: "Petition for membership", href: "#/submit" },
  { label: "Member circle", href: "#/platform" },
  { label: "Committee console", href: "#/admin", small: true },
];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border/60 bg-card/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-14 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
        {/* three zones — stacked + centered on phone, 2-col on tablet, 3-col on laptop */}
        <div className="grid gap-10 text-center md:grid-cols-2 md:text-left lg:grid-cols-[1.25fr_1fr_1fr] lg:gap-12">
          {/* zone 1 — brand */}
          <div className="flex flex-col items-center gap-3 md:items-start">
            <Logo />
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xs">
              By invitation only — a private circle where the country&apos;s most
              serious builders become owners.
            </p>
            <p
              aria-hidden="true"
              className="font-mono text-[10px] uppercase tracking-[0.28em] text-gold/60"
            >
              Conclave · Est. 2025
            </p>
          </div>

          {/* zone 2 — navigate */}
          <nav
            aria-label="Footer"
            className="flex flex-col items-center gap-4 md:items-start"
          >
            <p className="micro-label">Navigate</p>
            <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 md:justify-start">
              {FOOTER_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className={
                      link.small
                        ? "py-1 text-xs text-muted-foreground/60 hover:text-gold transition-colors"
                        : "py-1 text-sm text-muted-foreground hover:text-gold transition-colors"
                    }
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* zone 3 — concierge */}
          <div className="flex flex-col items-center gap-3 md:col-span-2 md:items-start lg:col-span-1">
            <p className="micro-label">Concierge</p>
            <a
              href="mailto:concierge@conclave.club"
              className="inline-flex items-center gap-2 text-sm text-foreground/90 hover:text-gold transition-colors underline-offset-4 hover:underline"
            >
              <span aria-hidden="true" className="text-gold">◆</span>
              concierge@conclave.club
            </a>
            <p className="text-xs leading-relaxed text-muted-foreground max-w-xs">
              Petitions, introductions, press — a note reaches a person, not an
              inbox. The committee reads everything.
            </p>
          </div>
        </div>

        <div className="rule-diamond mt-10" aria-hidden="true" />

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Conclave — the private founders&apos; club.</p>
          <p className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" aria-hidden="true" />
            Members&apos; club — invitations only, never sold
          </p>
        </div>
      </div>
    </footer>
  );
}
