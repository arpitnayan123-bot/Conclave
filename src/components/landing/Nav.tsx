"use client";

import { useEffect, useState } from "react";
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MenuOverlay, MorphBurger } from "./MenuOverlay";

export function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

type NavLink = { label: string; id?: string; href?: string };

const NAV_LINKS: NavLink[] = [
  { label: "The House", id: "house" },
  { label: "The Circle", id: "why" },
  { label: "The Admission", id: "how" },
  { label: "The Standard", id: "bar" },
  { label: "Charter", href: "#/club" },
  { label: "FAQ", id: "faq" },
];

/* Compact link styling shared by anchor + button variants.
   - md (tablet): tight padding + 13px so all six links fit next to the logo
   - lg (laptop): full 14px type and comfortable padding, 72px tall bar
   - .nav-link-diamond adds the gold crest dot that scales in on hover */
const NAV_LINK_CLASS =
  "nav-link nav-link-diamond inline-flex items-center justify-center whitespace-nowrap px-2 lg:px-3 py-2 min-h-[44px] rounded-lg text-[13px] lg:text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors";

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* z jumps above the menu overlay while it's open so logo + burger stay live */}
      <header className={cn("fixed top-0 inset-x-0", menuOpen ? "z-[80]" : "z-50")}>
        <nav
          aria-label="Main navigation"
          className={cn(
            "transition-all duration-500",
            menuOpen
              ? "bg-transparent border-b border-transparent"
              : scrolled
                ? "glass nav-hairline shadow-[0_12px_40px_-18px_oklch(0_0_0/70%)]"
                : "bg-transparent border-b border-transparent"
          )}
        >
          {/* 64px on phone → 72px on md+ for a grander lounge-entry proportion */}
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 md:h-[72px] flex items-center justify-between gap-3">
            <Logo />

            <div
              className={cn(
                "hidden md:flex items-center gap-0.5 lg:gap-1 transition-opacity duration-300",
                menuOpen && "opacity-0 pointer-events-none"
              )}
            >
              {NAV_LINKS.map((link) =>
                link.href ? (
                  <a
                    key={link.href}
                    href={link.href}
                    className={NAV_LINK_CLASS}
                  >
                    {link.label}
                  </a>
                ) : (
                  <button
                    key={link.id}
                    type="button"
                    onClick={() => scrollToSection(link.id!)}
                    className={cn(NAV_LINK_CLASS, "cursor-pointer")}
                  >
                    {link.label}
                  </button>
                )
              )}
            </div>

            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex items-center gap-2 transition-all duration-300",
                  menuOpen && "invisible opacity-0 translate-x-2"
                )}
              >
                {/* Member login lives on xl+ (space is abundant) and in the
                    burger menu everywhere else */}
                <Button
                  asChild
                  variant="ghost"
                  className="hidden xl:inline-flex h-10 text-muted-foreground hover:text-foreground"
                >
                  <a href="#/platform">Member login</a>
                </Button>
                {/* Petition CTA: visible from sm, yields to the six nav
                    links on md (tablet shows links + burger), back on lg+ */}
                <Button
                  asChild
                  className="hidden sm:inline-flex md:hidden lg:inline-flex h-10 text-sm font-semibold cta-shine"
                >
                  <a href="#/submit">Petition for membership</a>
                </Button>
              </div>

              {/* premium burger — all viewports */}
              <MorphBurger open={menuOpen} onToggle={() => setMenuOpen((o) => !o)} />
            </div>
          </div>
        </nav>
      </header>

      <MenuOverlay open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
