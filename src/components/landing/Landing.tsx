"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useSpring, useTransform, type Variants } from "framer-motion";
import { ArrowRight, ChevronDown } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/shared/Footer";
import { AnimatedNumber } from "@/components/shared/Reveal";
import { Nav } from "./Nav";
import Hero3D from "./Hero3D";
import { Faq } from "./Faq";
import BackToTop from "./BackToTop";
import { Divider, FinalCta, HowItWorks, CampusMarquee, PulseTicker, TheBar, TheHouseBrief, TheTable, WhyConclave } from "./Sections";

/* ------------------------------------------------------------------ */
/*  Live stats                                                         */
/* ------------------------------------------------------------------ */

type StatsResponse = {
  applications: number;
  members: number;
  ideas: number;
  invites: number;
  decided: number;
  declined: number;
};

const STAT_CELLS: { key: keyof StatsResponse; label: string }[] = [
  { key: "members", label: "Seats held" },
  { key: "ideas", label: "Ventures live" },
  { key: "applications", label: "Petitions read" },
  { key: "invites", label: "Invitations extended" },
];

const EMPTY_STATS: StatsResponse = {
  applications: 0, members: 0, ideas: 0, invites: 0, decided: 0, declined: 0,
};

function useStats(): StatsResponse {
  const [stats, setStats] = useState<StatsResponse>(EMPTY_STATS);
  useEffect(() => {
    let cancelled = false;
    api<StatsResponse>("/stats")
      .then((s) => {
        if (cancelled) return;
        setStats({
          applications: s.applications ?? 0,
          members: s.members ?? 0,
          ideas: s.ideas ?? 0,
          invites: s.invites ?? 0,
          decided: s.decided ?? 0,
          declined: s.declined ?? 0,
        });
      })
      .catch(() => {
        /* stats are decorative — fail silently */
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return stats;
}

/* ------------------------------------------------------------------ */
/*  Hero entrance animation                                            */
/* ------------------------------------------------------------------ */

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const heroItem: Variants = {
  hidden: { opacity: 0, y: 26, filter: "blur(10px)" },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.8, delay: 0.15 + i * 0.12, ease: EASE },
  }),
};

const heroWord: Variants = {
  hidden: { opacity: 0, y: 32, filter: "blur(12px)" },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.75, delay: 0.35 + i * 0.09, ease: EASE },
  }),
};

const HEADLINE_WORDS = ["The", "room", "is", "small.", "The", "ambition", "isn't."];

/* ------------------------------------------------------------------ */
/*  Chapter rail — scroll-spy outline (xl+ only)                       */
/* ------------------------------------------------------------------ */

const CHAPTERS: { id: string; numeral: string; label: string }[] = [
  { id: "house", numeral: "I", label: "The House" },
  { id: "why", numeral: "II", label: "The Circle" },
  { id: "how", numeral: "III", label: "The Admission" },
  { id: "bar", numeral: "IV", label: "The Standard" },
  { id: "table", numeral: "V", label: "The Table" },
  { id: "faq", numeral: "VI", label: "Questions" },
];

function ChapterRail() {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        // the rail stays out of the hero's way and slides in after it
        if (window.scrollY < window.innerHeight * 0.55) {
          setActive(null);
          return;
        }
        let current = CHAPTERS[0]!.id;
        for (const c of CHAPTERS) {
          const el = document.getElementById(c.id);
          if (el && el.getBoundingClientRect().top <= window.innerHeight * 0.4) {
            current = c.id;
          }
        }
        if (
          window.innerHeight + window.scrollY >=
          document.documentElement.scrollHeight - 120
        ) {
          current = CHAPTERS[CHAPTERS.length - 1]!.id;
        }
        setActive(current);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <nav
      aria-label="Chapters"
      className={cn(
        "fixed right-5 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-center gap-2 transition-opacity duration-700 xl:flex",
        active ? "opacity-100" : "pointer-events-none opacity-0"
      )}
    >
      {CHAPTERS.map((c) => {
        const isActive = active === c.id;
        return (
          <button
            key={c.id}
            type="button"
            aria-label={`Chapter ${c.numeral} — ${c.label}`}
            aria-current={isActive ? "true" : undefined}
            onClick={() =>
              document
                .getElementById(c.id)
                ?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
            className="group relative grid place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
          >
            {/* label — reveals on hover/focus, always on for the active chapter */}
            <span
              aria-hidden="true"
              className={cn(
                "glass pointer-events-none absolute right-full mr-3 whitespace-nowrap rounded-full border border-border/60 bg-background/90 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition-all duration-200",
                isActive
                  ? "text-gold opacity-100"
                  : "translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100"
              )}
            >
              {c.numeral} · {c.label}
            </span>
            <span
              className={cn(
                "grid h-7 w-7 place-items-center rounded-full border font-display text-[10px] transition-all duration-300",
                isActive
                  ? "scale-110 border-gold/70 bg-gold/15 text-gold shadow-[0_0_16px_-4px_oklch(0.84_0.13_85/60%)]"
                  : "border-border/60 text-muted-foreground/70 hover:border-gold/40 hover:text-gold"
              )}
            >
              {c.numeral}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/*  Landing page                                                       */
/* ------------------------------------------------------------------ */

export default function Landing() {
  const stats = useStats();
  // honest framing for a young house — zeros mean "just opened", not broken
  const foundingSeason =
    stats.members === 0 &&
    stats.applications === 0 &&
    stats.invites === 0 &&
    stats.ideas === 0;
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 });

  // hero parallax — content lifts + fades away as you scroll into the page
  const heroRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroOpacity = useTransform(heroProgress, [0, 0.72], [1, 0]);
  const heroY = useTransform(heroProgress, [0, 1], [0, 130]);
  const heroScale = useTransform(heroProgress, [0, 1], [1, 0.955]);
  const hero3dY = useTransform(heroProgress, [0, 1], [0, 70]);
  const hero3dOpacity = useTransform(heroProgress, [0, 0.85], [1, 0.25]);

  return (
    <div className="min-h-svh overflow-x-clip flex flex-col">
      {/* scroll progress — champagne line */}
      <motion.div
        aria-hidden="true"
        style={{ scaleX: progress }}
        className="fixed inset-x-0 top-0 z-[60] h-[3px] origin-left bg-gradient-to-r from-gold via-primary to-gold/50"
      />

      <Nav />

      <main className="flex-1">
        {/* ------------------------------ HERO ------------------------------ */}
        <section
          ref={heroRef}
          className="relative min-h-[100svh] overflow-hidden noise flex items-center"
          aria-label="Conclave — the private founders' club"
        >
          {/* base atmosphere (always rendered, canvas floats above it) */}
          <div
            className="absolute inset-0"
            aria-hidden="true"
            style={{
              background:
                "radial-gradient(ellipse 60% 50% at 50% 32%, oklch(0.84 0.13 85 / 11%), transparent 70%), radial-gradient(ellipse 45% 40% at 85% 70%, oklch(0.79 0.16 163 / 5%), transparent 70%)",
            }}
          />
          <div className="absolute inset-0 grid-bg opacity-70" aria-hidden="true" />

          {/* 3D living network (or CSS fallback) — slower parallax layer */}
          <motion.div style={{ y: hero3dY, opacity: hero3dOpacity }} className="absolute inset-0">
            <Hero3D />
          </motion.div>

          {/* editorial fade — grounds the scene into the page below */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-28 sm:h-36 bg-gradient-to-b from-transparent via-background/60 to-background"
          />

          {/* overlay — fades + rises on scroll */}
          <motion.div
            style={{ opacity: heroOpacity, y: heroY, scale: heroScale }}
            className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 md:pt-32 pb-24 md:pb-28 pointer-events-none"
          >
            <div className="text-center">
              {/* badge — glass pill with engraved micro-type */}
              <motion.div variants={heroItem} custom={0} initial="hidden" animate="show">
                <span className="inline-flex items-center gap-2 glass pill-glow rounded-full px-3.5 sm:px-5 py-2 text-[9px] sm:text-[11px] uppercase tracking-[0.18em] sm:tracking-[0.22em] text-muted-foreground">
                  <span className="text-gradient-gold animate-shine text-[10px] leading-none" aria-hidden="true">
                    ◆
                  </span>
                  <span className="font-medium text-foreground/90">By invitation only</span>
                  <span aria-hidden="true" className="h-3 w-px bg-gold/25" />
                  <span>The Private Founders&apos; Club</span>
                </span>
                {/* hairline detail line under the badge */}
                <span className="mt-3.5 flex items-center justify-center gap-3" aria-hidden="true">
                  <span className="h-px w-10 sm:w-16 bg-gradient-to-r from-transparent to-gold/35" />
                  <span className="whitespace-nowrap text-[8px] sm:text-[9px] uppercase tracking-[0.3em] text-muted-foreground/70">
                    The Committee sits weekly
                    <span className="hidden sm:inline"> — every petition read by hand</span>
                  </span>
                  <span className="h-px w-10 sm:w-16 bg-gradient-to-l from-transparent to-gold/35" />
                </span>
              </motion.div>

              {/* headline — per-word y + blur stagger, editorial scale per device */}
              <h1
                aria-label="The room is small. The ambition isn't."
                className="mt-6 sm:mt-7 font-display font-bold tracking-[-0.02em] text-[2.75rem] sm:text-6xl md:text-7xl lg:text-[5.5rem] leading-[1.04]"
              >
                <span
                  aria-hidden="true"
                  className="flex flex-wrap justify-center gap-x-[0.24em] gap-y-1 sm:gap-y-1.5"
                >
                  {HEADLINE_WORDS.map((word, i) => (
                    <motion.span
                      key={`${word}-${i}`}
                      variants={heroWord}
                      custom={i}
                      initial="hidden"
                      animate="show"
                      className={cn(
                        "inline-block",
                        i === HEADLINE_WORDS.length - 1
                          ? "text-gradient-gold italic"
                          : "text-gradient"
                      )}
                    >
                      {word}
                    </motion.span>
                  ))}
                </span>
              </h1>

              {/* sub-headline */}
              <motion.p
                variants={heroItem}
                custom={1}
                initial="hidden"
                animate="show"
                className="mt-6 sm:mt-7 max-w-xl lg:max-w-2xl mx-auto text-base sm:text-lg md:text-xl leading-relaxed sm:leading-[1.75] text-muted-foreground"
              >
                Behind closed doors, the country&apos;s most serious builders share
                ventures, trade hard-won lessons, and meet the co-founders they&apos;ll
                build with for years.{" "}
                <span className="text-foreground font-medium">No spectators. Only owners.</span>
              </motion.p>

              {/* CTAs — stacked full-width on phone, inline row from sm up */}
              <motion.div
                variants={heroItem}
                custom={2}
                initial="hidden"
                animate="show"
                className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 pointer-events-auto"
              >
                <Button
                  asChild
                  size="lg"
                  className="glow-emerald cta-shine h-12 lg:h-[52px] w-full sm:w-auto sm:min-w-[220px] lg:px-9 rounded-xl text-base font-semibold group"
                >
                  <a href="#/submit">
                    Petition for membership
                    <ArrowRight className="w-4.5 h-4.5 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  className="glass h-12 lg:h-[52px] w-full sm:w-auto sm:min-w-[200px] lg:px-8 rounded-xl text-base font-medium text-foreground hover:bg-accent/40 group/explore"
                  onClick={() =>
                    document
                      .getElementById("house")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" })
                  }
                >
                  Step inside
                  <ChevronDown
                    className="w-4 h-4 text-gold transition-transform duration-300 group-hover/explore:translate-y-0.5"
                    aria-hidden="true"
                  />
                </Button>
              </motion.div>

              {/* quiet secondary row — account + charter, one hairline apart */}
              <motion.p
                variants={heroItem}
                custom={2}
                initial="hidden"
                animate="show"
                className="mt-5 flex items-center justify-center gap-4 text-sm text-muted-foreground pointer-events-auto sm:mt-6"
              >
                <a
                  href="#/platform"
                  className="inline-flex items-center hover:text-foreground underline-offset-4 transition-colors hover:underline"
                >
                  Member login
                </a>
                <span aria-hidden="true" className="text-[9px] text-gold/50">◆</span>
                <a
                  href="#/club"
                  className="group inline-flex items-center gap-1.5 hover:text-primary underline-offset-4 transition-colors hover:underline"
                >
                  Read the Charter
                  <span
                    aria-hidden="true"
                    className="text-gold transition-transform duration-300 group-hover:translate-x-0.5"
                  >
                    →
                  </span>
                </a>
              </motion.p>

              {/* stats strip — the house plaque */}
              <motion.div
                variants={heroItem}
                custom={3}
                initial="hidden"
                animate="show"
                className="mt-12 sm:mt-14 glass velvet corner-marks rounded-2xl px-5 py-6 sm:px-10 sm:py-7 w-full max-w-3xl mx-auto"
              >
                <dl className="grid grid-cols-2 md:grid-cols-4 gap-y-7 md:gap-y-0 md:divide-x md:divide-gold/10">
                  {STAT_CELLS.map((cell) => (
                    <div key={cell.key} className="text-center px-2 md:px-3">
                      <dd className="font-display text-3xl md:text-4xl lg:text-[2.75rem] font-bold tracking-tight text-foreground">
                        <AnimatedNumber value={stats[cell.key]} />
                      </dd>
                      <dt className="mt-2 text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-muted-foreground/90">
                        {cell.label}
                      </dt>
                    </div>
                  ))}
                </dl>
                <p className="micro-label mt-5 border-t border-gold/10 pt-4 text-center">
                  {foundingSeason
                    ? "Founding season — the register just opened"
                    : "The register — live"}
                </p>
              </motion.div>
            </div>
          </motion.div>

          {/* scroll cue */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.6, duration: 1 }}
            className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 pointer-events-none"
            aria-hidden="true"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              className="flex flex-col items-center gap-1.5 text-muted-foreground"
            >
              <span className="h-5 w-px bg-gradient-to-b from-transparent via-gold/40 to-transparent" />
              <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.32em]">Scroll</span>
              <ChevronDown className="w-4 h-4 text-gold/80" />
            </motion.div>
          </motion.div>
        </section>

        {/* ---------------------------- SECTIONS ---------------------------- */}
        {/*
          The page reads as one document in six chapters:
          Prologue (hero) → I The House → II The Circle → III The Admission
          → IV The Standard → V The Table → VI Questions → the close.
        */}
        <PulseTicker />
        <TheHouseBrief />
        <CampusMarquee />
        <Divider />
        <WhyConclave />
        <Divider />
        <HowItWorks />
        <Divider />
        <TheBar decided={stats.decided} declined={stats.declined} />
        <Divider />
        <TheTable />
        <Divider />
        <Faq />
        <Divider />
        <FinalCta />
      </main>

      <ChapterRail />

      <BackToTop />

      <Footer />
    </div>
  );
}
