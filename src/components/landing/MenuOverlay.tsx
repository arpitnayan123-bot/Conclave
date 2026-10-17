"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Crown,
  Eye,
  Lightbulb,
  ScrollText,
  Sparkles,
  Users,
} from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Premium full-screen menu — morphing burger, structured club index  */
/* ------------------------------------------------------------------ */

type MenuLink = { label: string; id?: string; href?: string; hint: string };

export const MENU_LINKS: MenuLink[] = [
  { label: "The House", id: "house", hint: "The whole club, in one glance" },
  { label: "The Circle", id: "why", hint: "What waits inside" },
  { label: "The Admission", id: "how", hint: "Petition → deliberation → invitation" },
  { label: "The Standard", id: "bar", hint: "What the committee weighs" },
  { label: "The Table", id: "table", hint: "Live ventures & members" },
  { label: "The Charter", href: "#/club", hint: "House rules & the committee" },
  { label: "FAQ", id: "faq", hint: "Asked at the door" },
];

const HOUSE_NOTES: { icon: typeof Sparkles; text: string }[] = [
  { icon: Sparkles, text: "Founded by builders, for builders" },
  { icon: Eye, text: "Every petition read by the committee" },
  { icon: Crown, text: "Not a job board — a club of owners" },
];

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const linkItem: Variants = {
  hidden: { opacity: 0, y: 28, filter: "blur(10px)" },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.55, delay: 0.1 + i * 0.07, ease: EASE },
  }),
};

const fadeItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: 0.35 + i * 0.09, ease: EASE },
  }),
};

type MenuStats = { members: number; ideas: number; applications: number };

function useMenuStats(enabled: boolean): MenuStats | null {
  const [stats, setStats] = useState<MenuStats | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    api<MenuStats>("/stats")
      .then((s) => {
        if (!cancelled) setStats(s);
      })
      .catch(() => {
        /* decorative — fail silent */
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);
  return stats;
}

export function MorphBurger({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls="conclave-menu"
      aria-label={open ? "Close menu" : "Open menu"}
      className={cn(
        "relative grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-full",
        "glass transition-all duration-300 hover:border-primary/50 hover:shadow-[0_0_24px_-6px_oklch(0.84_0.13_85/45%)] active:scale-95",
        open && "border-primary/50 bg-accent/60"
      )}
    >
      <span aria-hidden="true" className="relative block h-3.5 w-5">
        {/* top line → diagonal */}
        <motion.span
          animate={open ? { rotate: 45, y: 6.25 } : { rotate: 0, y: 0 }}
          transition={{ duration: 0.35, ease: EASE }}
          className="absolute left-0 top-0 h-[1.5px] w-full origin-center rounded-full bg-foreground"
        />
        {/* middle line → fades out */}
        <motion.span
          animate={open ? { opacity: 0, scaleX: 0.3 } : { opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.25 }}
          className="absolute left-0 top-1/2 h-[1.5px] w-full -translate-y-1/2 rounded-full bg-foreground"
        />
        {/* bottom line → diagonal */}
        <motion.span
          animate={open ? { rotate: -45, y: -6.25 } : { rotate: 0, y: 0 }}
          transition={{ duration: 0.35, ease: EASE }}
          className="absolute bottom-0 left-0 h-[1.5px] w-full origin-center rounded-full bg-foreground"
        />
      </span>
    </button>
  );
}

export function MenuOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const stats = useMenuStats(open);

  // scroll lock + escape-to-close while the overlay is up
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const go = (id: string) => {
    onClose();
    // wait for the overlay exit + scroll unlock before gliding
    window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  };

  return (
    <AnimatePresence>
        {open && (
          <motion.div
            id="conclave-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.32, ease: "easeOut" }}
            className="fixed inset-0 z-[70] overflow-hidden bg-background/85 backdrop-blur-2xl"
          >
            {/* atmosphere */}
            <div className="absolute inset-0 grid-bg opacity-60" aria-hidden="true" />
            <div
              className="absolute inset-0"
              aria-hidden="true"
              style={{
                background:
                  "radial-gradient(ellipse 55% 45% at 78% 88%, oklch(0.84 0.13 85 / 9%), transparent 70%), radial-gradient(ellipse 40% 35% at 12% 10%, oklch(0.79 0.16 163 / 5%), transparent 70%)",
              }}
            />
            {/* giant watermark */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-[4vw] right-0 select-none whitespace-nowrap font-display text-[17vw] font-bold leading-none tracking-tighter text-foreground/[0.03]"
            >
              CONCLAVE
            </span>

            <div className="relative flex h-full min-h-0 flex-col">
              {/* scrollable content column — pt clears the fixed nav bar */}
              <div className="nice-scroll mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col overflow-y-auto px-4 pb-8 pt-20 sm:px-6 sm:pb-10 sm:pt-24">
                <div className="grid flex-1 gap-10 pt-8 sm:pt-12 md:grid-cols-[1.2fr_1fr] md:gap-12 lg:grid-cols-[1.25fr_1fr] lg:gap-20 lg:pt-14">
                  {/* ------------------------- navigate ------------------------- */}
                  <nav aria-label="Menu">
                    <motion.p
                      variants={fadeItem}
                      custom={0}
                      initial="hidden"
                      animate="show"
                      className="micro-label mb-5"
                    >
                      Navigate
                    </motion.p>
                    <ul className="space-y-1 sm:space-y-2">
                      {MENU_LINKS.map((link, i) => (
                        <motion.li key={link.href ?? link.id} variants={linkItem} custom={i} initial="hidden" animate="show" exit="hidden">
                          {link.href ? (
                            <a
                              href={link.href}
                              onClick={onClose}
                              className="menu-link group flex w-full items-baseline gap-4 rounded-xl px-2 py-2.5 text-left min-h-[52px] sm:min-h-[56px] sm:gap-6 sm:py-3"
                            >
                              <span className="w-7 shrink-0 font-mono text-xs text-gold/70">
                                0{i + 1}
                              </span>
                              <span className="menu-link-label font-display text-[1.65rem] font-bold leading-tight tracking-tight text-foreground/85 transition-colors group-focus-visible:text-primary sm:text-4xl lg:text-[2.75rem] xl:text-5xl whitespace-nowrap">
                                {link.label}
                              </span>
                              <ArrowUpRight
                                aria-hidden="true"
                                className="ml-auto h-5 w-5 shrink-0 -translate-x-2 translate-y-1 text-primary opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100 sm:h-6 sm:w-6"
                              />
                              <span className="hidden w-44 shrink-0 text-right text-xs text-muted-foreground/70 xl:block">
                                {link.hint}
                              </span>
                            </a>
                          ) : (
                            <button
                              type="button"
                              onClick={() => go(link.id!)}
                              className="menu-link group flex w-full cursor-pointer items-baseline gap-4 rounded-xl px-2 py-2.5 text-left min-h-[52px] sm:min-h-[56px] sm:gap-6 sm:py-3"
                            >
                              <span className="w-7 shrink-0 font-mono text-xs text-gold/70">
                                0{i + 1}
                              </span>
                              <span className="menu-link-label font-display text-[1.65rem] font-bold leading-tight tracking-tight text-foreground/85 transition-colors group-focus-visible:text-primary sm:text-4xl lg:text-[2.75rem] xl:text-5xl whitespace-nowrap">
                                {link.label}
                              </span>
                              <ArrowUpRight
                                aria-hidden="true"
                                className="ml-auto h-5 w-5 shrink-0 -translate-x-2 translate-y-1 text-primary opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100 sm:h-6 sm:w-6"
                              />
                              <span className="hidden w-44 shrink-0 text-right text-xs text-muted-foreground/70 xl:block">
                                {link.hint}
                              </span>
                            </button>
                          )}
                        </motion.li>
                      ))}
                    </ul>
                  </nav>

                  {/* ------------------------- side rail ------------------------- */}
                  <aside className="flex flex-col justify-between gap-8 border-t border-border/40 pt-8 md:border-l md:border-t-0 md:pl-10 md:pt-2 lg:pl-14 lg:pt-12">
                    {/* membership */}
                    <motion.div variants={fadeItem} custom={1} initial="hidden" animate="show" className="space-y-4">
                      <p className="micro-label">Membership</p>
                      <Button asChild size="lg" className="glow-emerald cta-shine h-12 w-full text-base font-semibold group sm:w-auto">
                        <a href="#/submit" onClick={onClose}>
                          Petition for membership
                          <ArrowRight className="h-4.5 w-4.5 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
                        </a>
                      </Button>
                      <Button asChild size="lg" variant="ghost" className="glass h-12 w-full text-base font-medium text-foreground hover:bg-accent/40 sm:w-auto">
                        <a href="#/platform" onClick={onClose}>
                          Member login
                        </a>
                      </Button>
                    </motion.div>

                    {/* inside the circle — live house stats */}
                    <motion.div variants={fadeItem} custom={2} initial="hidden" animate="show">
                      <p className="micro-label mb-3">Inside the circle</p>
                      <dl className="grid grid-cols-3 gap-3">
                        {[
                          { icon: Users, label: "Members", value: stats?.members },
                          { icon: Lightbulb, label: "Ventures", value: stats?.ideas },
                          { icon: ScrollText, label: "Petitions", value: stats?.applications },
                        ].map((cell) => {
                          const Icon = cell.icon;
                          return (
                            <div key={cell.label} className="glass rounded-xl px-3 py-3.5 text-center">
                              <Icon className="mx-auto mb-1.5 h-4 w-4 text-primary" aria-hidden="true" />
                              <dd className="font-display text-xl font-bold tracking-tight">
                                {cell.value ?? "—"}
                              </dd>
                              <dt className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                                {cell.label}
                              </dt>
                            </div>
                          );
                        })}
                      </dl>
                    </motion.div>

                    {/* the house — structured notes */}
                    <motion.div variants={fadeItem} custom={3} initial="hidden" animate="show">
                      <p className="micro-label mb-3">The House</p>
                      <ul className="space-y-2.5">
                        {HOUSE_NOTES.map((note) => {
                          const Icon = note.icon;
                          return (
                            <li
                              key={note.text}
                              className="flex items-center gap-2.5 text-sm text-muted-foreground"
                            >
                              <Icon className="h-3.5 w-3.5 shrink-0 text-gold" aria-hidden="true" />
                              {note.text}
                            </li>
                          );
                        })}
                      </ul>
                    </motion.div>
                  </aside>
                </div>

                {/* bottom meta strip */}
                <motion.div
                  variants={fadeItem}
                  custom={4}
                  initial="hidden"
                  animate="show"
                  className="mt-8 flex flex-col items-start gap-3 border-t border-border/40 pt-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between"
                >
                  <p className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2" aria-hidden="true">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                    </span>
                    Committee is in session — petitions reviewed weekly
                  </p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60">
                    CONCLAVE · EST. 2025
                  </p>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
  );
}
