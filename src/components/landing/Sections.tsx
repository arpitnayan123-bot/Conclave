"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
} from "framer-motion";
import {
  ArrowRight,
  Compass,
  Crown,
  Handshake,
  Heart,
  Lightbulb,
  MailPlus,
  MapPin,
  MessageSquare,
  ScanSearch,
  Send,
  ShieldCheck,
  Sparkles,
  UserPlus,
  UserCheck,
  Users,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";
import { CAMPUSES } from "@/lib/store";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/shared/Reveal";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Shared bits                                                        */
/* ------------------------------------------------------------------ */

/**
 * Eyebrow micro-label used by every section header:
 * tiny gold caps with ornamental diamond rules on sm+.
 * (One italic gold word in the headline below carries the accent.)
 */
export function SectionLabel({
  children,
  align = "center",
}: {
  children: ReactNode;
  align?: "center" | "left";
}) {
  return (
    <p
      className={cn(
        "flex items-center gap-2.5 text-[10px] sm:text-[11px] uppercase tracking-[0.28em] text-gold/80 font-medium",
        align === "center" ? "justify-center" : "justify-start"
      )}
    >
      {align === "center" ? (
        <span aria-hidden="true" className="rule-diamond hidden w-8 sm:w-12 sm:block" />
      ) : (
        <span aria-hidden="true" className="text-[8px] text-gold">◆</span>
      )}
      {children}
      <span
        aria-hidden="true"
        className={cn("rule-diamond", align === "center" ? "hidden w-8 sm:w-12 sm:block" : "w-10 sm:w-16")}
      />
    </p>
  );
}

/**
 * Chapter kicker — the landing page reads as one document in six chapters,
 * so every chapter opens with the same engraved numeral + title. One rhythm,
 * every section: visitor always knows where they are in the story.
 */
export function ChapterMark({ numeral, title }: { numeral: string; title: string }) {
  return (
    <p className="flex items-center justify-center gap-3 text-[10px] sm:text-[11px] uppercase tracking-[0.28em] text-gold/80 font-medium">
      <span aria-hidden="true" className="rule-diamond hidden w-12 sm:w-16 sm:block" />
      <span
        aria-hidden="true"
        className="font-display text-xs sm:text-sm normal-case tracking-[0.08em] text-gold"
      >
        {numeral}
      </span>
      <span aria-hidden="true" className="text-gold/60">·</span>
      <span>{title}</span>
      <span aria-hidden="true" className="rule-diamond hidden w-12 sm:w-16 sm:block" />
    </p>
  );
}

/** small centered sub-label — separates groups inside a chapter (The Table) */
function TableSubLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "mb-6 flex items-center justify-center gap-3 text-[10px] sm:text-[11px] uppercase tracking-[0.26em] text-muted-foreground",
        className
      )}
    >
      <span aria-hidden="true" className="h-px w-10 bg-gold/25" />
      {children}
      <span aria-hidden="true" className="h-px w-10 bg-gold/25" />
    </p>
  );
}

/** Card that tilts subtly toward the cursor (desktop) + mouse spotlight wash. */
export function TiltCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const rotateX = useSpring(rx, { stiffness: 220, damping: 20 });
  const rotateY = useSpring(ry, { stiffness: 220, damping: 20 });

  return (
    <motion.div
      ref={ref}
      onMouseMove={(e) => {
        const el = ref.current;
        if (!el || window.innerWidth < 768) return;
        const r = el.getBoundingClientRect();
        // spotlight position for .spotlight::after
        el.style.setProperty("--spot-x", `${e.clientX - r.left}px`);
        el.style.setProperty("--spot-y", `${e.clientY - r.top}px`);
        ry.set(((e.clientX - r.left) / r.width - 0.5) * 6);
        rx.set(-((e.clientY - r.top) / r.height - 0.5) * 6);
      }}
      onMouseLeave={() => {
        rx.set(0);
        ry.set(0);
      }}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      className={cn("card-hover spotlight will-change-transform", className)}
    >
      {children}
    </motion.div>
  );
}

/**
 * Blueprint "+" corner marks drawn on a child overlay — TiltCard already
 * uses ::after for the spotlight wash, so corner-marks can't share the
 * element with it.
 */
function CornerMarks({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("corner-marks pointer-events-none absolute inset-0 rounded-2xl", className)}
    />
  );
}

function SectionShell({
  id,
  children,
  className,
}: {
  id?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn("relative scroll-mt-24", className)}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
    </section>
  );
}

/** animated gradient hairline — a light beam sweeps across it */
export function Divider() {
  return (
    <div aria-hidden="true" className="relative mx-auto max-w-6xl px-4 sm:px-6">
      <div className="divider-glow" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  0. Chapter I — The House (the whole club in one glance)            */
/* ------------------------------------------------------------------ */

const BRIEF_CARDS: {
  kicker: string;
  body: string;
  refLabel: string;
  target: string;
  icon: LucideIcon;
}[] = [
  {
    kicker: "What it is",
    body: "A private circle of people who build companies. Ventures are shared, lessons are traded, and co-founders are found for years — not for a season.",
    refLabel: "Step inside the circle",
    target: "why",
    icon: Users,
  },
  {
    kicker: "Who belongs",
    body: "Founders, operators, and student builders who ship. Every petition is read by hand, and far more are declined than accepted — deliberately.",
    refLabel: "Read the Standard",
    target: "bar",
    icon: ShieldCheck,
  },
  {
    kicker: "How you enter",
    body: "One page — the petition. The committee deliberates each week; clear the bar and a signed invitation arrives at your inbox.",
    refLabel: "See the three rites",
    target: "how",
    icon: Send,
  },
];

export function TheHouseBrief() {
  return (
    <SectionShell id="house" className="py-14 md:py-20 lg:py-24">
      <Reveal className="mb-10 text-center max-w-2xl mx-auto md:mb-14">
        <ChapterMark numeral="Chapter I" title="The House" />
        <h2 className="mt-4 font-display text-3xl sm:text-4xl md:text-5xl leading-[1.08] tracking-tight font-bold">
          The whole house, in{" "}
          <span className="text-gradient-gold italic">one glance.</span>
        </h2>
        <p className="mt-4 text-sm sm:text-base leading-relaxed text-muted-foreground">
          What this place is, who belongs, and how a seat is earned. Everything
          after this chapter is the long answer.
        </p>
      </Reveal>

      <div className="grid gap-4 sm:gap-5 md:grid-cols-3">
        {BRIEF_CARDS.map((c, i) => {
          const Icon = c.icon;
          return (
            <Reveal key={c.kicker} delay={i * 0.1} className="h-full">
              <TiltCard className="group relative h-full flex-col rounded-2xl border border-border/60 bg-card/40 p-6 md:p-7 flex">
                <CornerMarks />
                <div className="relative mb-5 flex items-center gap-3.5">
                  <span className="pill-glow grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold/10 border border-gold/25">
                    <Icon className="h-4.5 w-4.5 text-gold" strokeWidth={2.2} aria-hidden="true" />
                  </span>
                  <p className="engraved text-[10px] font-semibold uppercase tracking-[0.26em] text-gold/80">
                    {c.kicker}
                  </p>
                </div>
                <p className="relative flex-1 text-sm leading-relaxed text-muted-foreground">
                  {c.body}
                </p>
                <a
                  href={`#${c.target}`}
                  onClick={(e) => {
                    e.preventDefault();
                    document
                      .getElementById(c.target)
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="relative mt-6 inline-flex items-center gap-2 border-t border-border/40 pt-4 text-[13px] font-medium text-gold/90 transition-colors hover:text-gold"
                >
                  <span aria-hidden="true" className="text-[9px]">◆</span>
                  {c.refLabel}
                  <ArrowRight
                    className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </a>
              </TiltCard>
            </Reveal>
          );
        })}
      </div>
    </SectionShell>
  );
}

/* ------------------------------------------------------------------ */
/*  1. Campus marquee — chapters                                       */
/* ------------------------------------------------------------------ */

export function CampusMarquee() {
  const row = [...CAMPUSES, ...CAMPUSES];
  return (
    <SectionShell className="py-12 sm:py-14 md:py-16 lg:py-20">
      <Reveal className="text-center mb-8">
        <SectionLabel>Petitioning from campuses nationwide</SectionLabel>
      </Reveal>
      <Reveal delay={0.1}>
        <div className="relative overflow-hidden" aria-label="Campuses with Conclave chapters">
          {/* edge masks */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 sm:w-28 z-10 bg-gradient-to-r from-background to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 sm:w-28 z-10 bg-gradient-to-l from-background to-transparent" />
          <div className="flex w-max animate-marquee gap-3 py-1">
            {row.map((name, i) => (
              <span
                key={`${name}-${i}`}
                className="pill-glow glass inline-flex items-center gap-2.5 rounded-full px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm text-muted-foreground whitespace-nowrap"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-gold/70 shrink-0" />
                {name}
              </span>
            ))}
          </div>
        </div>
      </Reveal>
    </SectionShell>
  );
}

/* ------------------------------------------------------------------ */
/*  1a. House pulse — live activity ticker (public, anonymized)        */
/* ------------------------------------------------------------------ */

type PulseItem = {
  id: string;
  kind: "idea" | "interest" | "comment" | "connection" | "join";
  text: string;
  ago: string;
};

const PULSE_ICONS: Record<PulseItem["kind"], { icon: LucideIcon; cls: string }> = {
  idea: { icon: Lightbulb, cls: "text-gold" },
  interest: { icon: Heart, cls: "text-gold" },
  comment: { icon: MessageSquare, cls: "text-emerald-300/80" },
  connection: { icon: Handshake, cls: "text-gold" },
  join: { icon: CheckCircle2, cls: "text-emerald-300" },
};

export function PulseTicker() {
  const [items, setItems] = useState<PulseItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<{ pulse: PulseItem[] }>("/pulse")
      .then((r) => {
        if (!cancelled) setItems(r.pulse ?? []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // fail silent — strip simply doesn't render without data
  if (items === null || items.length === 0) return null;

  const row = [...items, ...items];

  return (
    <div
      className="relative flex items-stretch border-y border-border/40 bg-card/20"
      role="status"
      aria-label="Live activity in the club"
    >
      {/* pinned live badge */}
      <div className="relative z-20 flex shrink-0 items-center gap-2 border-r border-border/40 bg-background/85 px-3 sm:px-4 backdrop-blur">
        <span className="relative flex h-2 w-2" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-gold" />
        </span>
        <span className="micro-label">Live</span>
      </div>

      {/* scrolling strip */}
      <div className="relative flex-1 overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-background to-transparent" />
        <div className="flex w-max animate-marquee items-center gap-2.5 py-2.5 pl-4 [animation-duration:55s] hover:[animation-play-state:paused]">
          {row.map((it, i) => {
            const meta = PULSE_ICONS[it.kind];
            const Icon = meta.icon;
            return (
              <span
                key={`${it.id}-${i}`}
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-border/50 bg-card/40 px-3.5 py-1.5 text-xs text-muted-foreground"
              >
                <Icon className={cn("h-3.5 w-3.5 shrink-0", meta.cls)} aria-hidden="true" />
                {it.text}
                <span className="text-[10px] font-medium text-gold/70">{it.ago}</span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  1b. Chapter V — The Table: live ventures + members, one register   */
/* ------------------------------------------------------------------ */

type TeaserIdea = {
  id: string;
  title: string;
  stage: string;
  needs: string;
  createdAt: string;
  authorFirstName: string;
  authorCollege: string;
  interestCount: number;
  commentCount: number;
};

const STAGE_TEASER_STYLES: Record<string, string> = {
  IDEA: "border-emerald-400/40 text-emerald-300 bg-emerald-400/5",
  PROTOTYPE: "border-gold/40 text-gold bg-gold/10",
  MVP: "border-transparent bg-amber-400 text-amber-950",
  LAUNCHED: "border-transparent bg-emerald-500 text-emerald-950",
};

export function TheTable() {
  const [ideas, setIdeas] = useState<TeaserIdea[] | null>(null);
  const [members, setMembers] = useState<SpotlightMember[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<{ ideas: TeaserIdea[] }>("/ideas/preview")
      .then((r) => {
        if (!cancelled) setIdeas(r.ideas ?? []);
      })
      .catch(() => {
        if (!cancelled) setIdeas([]);
      });
    api<{ members: SpotlightMember[] }>("/members/spotlight")
      .then((res) => {
        if (!cancelled) setMembers(res.members ?? []);
      })
      .catch(() => {
        if (!cancelled) setMembers([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loading = ideas === null || members === null;
  const empty =
    !loading &&
    (ideas as TeaserIdea[]).length === 0 &&
    (members as SpotlightMember[]).length === 0;

  return (
    <SectionShell id="table" className="relative py-14 md:py-20 lg:py-24 xl:py-32">
      {/* warm atmosphere */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 55% 45% at 12% 20%, oklch(0.84 0.13 85 / 7%), transparent 65%), radial-gradient(ellipse 45% 40% at 88% 85%, oklch(0.79 0.16 163 / 5%), transparent 65%)",
        }}
      />
      <div className="relative">
        <Reveal className="mb-12 text-center max-w-2xl mx-auto md:mb-16">
          <ChapterMark numeral="Chapter V" title="The Table" />
          <h2 className="mt-4 font-display text-3xl sm:text-4xl md:text-5xl leading-[1.08] tracking-tight font-bold">
            Live from <span className="text-gradient-gold italic">the house.</span>
          </h2>
          <p className="mt-4 text-sm sm:text-base leading-relaxed text-muted-foreground">
            Real ventures and real members, drawn straight from the register —
            nothing here is staged. When the house is young, the table is quiet;
            that is what honest looks like.
          </p>
        </Reveal>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SpotlightSkeleton key={i} />
            ))}
          </div>
        ) : empty ? (
          <Reveal delay={0.08}>
            <div className="velvet corner-marks relative mx-auto max-w-xl rounded-2xl p-8 text-center sm:p-10">
              <p className="micro-label">The table is being set</p>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
                The doors have opened and the register is blank — the first
                petitions are being read now. Ventures and members appear here the
                moment the house grows.
              </p>
              <div className="rule-diamond mx-auto mt-6 w-24" aria-hidden="true" />
              <Button
                asChild
                size="lg"
                className="glow-emerald cta-shine mt-7 h-12 w-full text-base font-semibold sm:w-auto sm:min-w-[220px]"
              >
                <a href="#/submit">Petition for membership</a>
              </Button>
            </div>
          </Reveal>
        ) : (
          <>
            {ideas && ideas.length > 0 ? (
              <>
                <TableSubLabel>Ventures on the table — {ideas.length} live</TableSubLabel>
                <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
        {ideas.map((idea, i) => (
          <Reveal key={idea.id} delay={0.1 + i * 0.08} className="h-full">
            <TiltCard className="group row-glow h-full rounded-2xl border border-border/60 bg-card/50 p-5 sm:p-6 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold tracking-wide",
                    STAGE_TEASER_STYLES[idea.stage] ?? STAGE_TEASER_STYLES.IDEA
                  )}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />
                  {idea.stage}
                </span>
                <span className="text-[11px] text-muted-foreground/70">
                  {new Date(idea.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </div>

              <h3 className="font-display text-lg sm:text-xl font-bold leading-snug tracking-tight transition-colors group-hover:text-gold">
                {idea.title}
              </h3>

              {idea.needs ? (
                <p className="flex items-start gap-1.5 text-xs sm:text-[13px] text-muted-foreground">
                  <UserPlus className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" aria-hidden="true" />
                  <span className="line-clamp-1">{idea.needs}</span>
                </p>
              ) : null}

              <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/50 pt-3">
                <span className="text-xs text-muted-foreground truncate">
                  <span className="font-medium text-foreground/80">{idea.authorFirstName}</span>{" "}
                  · {idea.authorCollege}
                </span>
                <span className="flex items-center gap-2.5 text-[11px] text-muted-foreground shrink-0">
                  {idea.interestCount > 0 ? (
                    <span className="inline-flex items-center gap-1">
                      <Heart className="h-3 w-3 text-gold" aria-hidden="true" />
                      {idea.interestCount}
                    </span>
                  ) : null}
                  {idea.commentCount > 0 ? (
                    <span className="inline-flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" aria-hidden="true" />
                      {idea.commentCount}
                    </span>
                  ) : null}
                </span>
              </div>
            </TiltCard>
          </Reveal>
        ))}
                </div>
              </>
            ) : null}

            {members && members.length > 0 ? (
              <>
                <TableSubLabel className="mt-12 md:mt-16">
                  Seats held — {members.length} in the house
                </TableSubLabel>
                <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-4">
                  {members.map((m, i) => (
                    <Reveal key={m.id} delay={i * 0.09} className="h-full">
                      <TiltCard className="velvet card-beam group h-full rounded-2xl p-6 flex flex-col">
                        <CornerMarks />
                        {/* member plate */}
                        <div className="relative flex items-center justify-between">
                          <span className="engraved text-[9px] uppercase tracking-[0.28em] text-muted-foreground">
                            Founding member
                          </span>
                          <span
                            aria-hidden="true"
                            className="font-mono text-[10px] text-gold/70 border border-gold/25 rounded-md px-1.5 py-0.5"
                          >
                            M·{String(i + 1).padStart(2, "0")}
                          </span>
                        </div>

                        <div className="relative mt-5 flex items-center gap-4">
                          <MemberInitial name={m.name} />
                          <div className="min-w-0">
                            <h3 className="font-display text-lg sm:text-xl font-bold leading-tight tracking-tight truncate">
                              {m.name}
                            </h3>
                            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3 shrink-0 text-gold" aria-hidden="true" />
                              <span className="truncate">
                                {m.college}
                                {m.gradYear ? ` · ${m.gradYear}` : ""}
                              </span>
                            </p>
                          </div>
                        </div>

                        {m.bio ? (
                          <p className="relative mt-3.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                            {m.bio}
                          </p>
                        ) : null}

                        <div className="relative mt-3 flex flex-wrap gap-1.5">
                          {splitListLocal(m.roles)
                            .slice(0, 2)
                            .map((r) => (
                              <span
                                key={r}
                                className="rounded-full border border-gold/25 bg-gold/10 px-2.5 py-0.5 text-[11px] font-medium text-gold"
                              >
                                {r}
                              </span>
                            ))}
                          {splitListLocal(m.skills)
                            .slice(0, 2)
                            .map((s) => (
                              <span
                                key={s}
                                className="rounded-full border border-border/60 px-2.5 py-0.5 text-[11px] text-muted-foreground"
                              >
                                {s}
                              </span>
                            ))}
                        </div>

                        <p className="relative mt-auto flex items-center gap-1.5 border-t border-border/40 pt-4 text-xs text-muted-foreground">
                          <Lightbulb className="h-3.5 w-3.5 text-gold" aria-hidden="true" />
                          {m.ideaCount} venture{m.ideaCount === 1 ? "" : "s"} on the table
                        </p>
                      </TiltCard>
                    </Reveal>
                  ))}
                </div>
                <Reveal delay={0.2} className="mt-10 text-center">
                  <p className="text-sm text-muted-foreground sm:text-base">
                    The full roll stays private — members surface here only once
                    admitted.{" "}
                    <a
                      href="#/club"
                      className="inline-flex items-center gap-1 text-gold hover:text-foreground transition-colors underline-offset-4 hover:underline"
                    >
                      How membership works
                      <span aria-hidden="true">→</span>
                    </a>
                  </p>
                </Reveal>
              </>
            ) : null}
          </>
        )}
      </div>
    </SectionShell>
  );
}

/* ------------------------------------------------------------------ */
/*  2. The Admission (how it works)                                    */
/* ------------------------------------------------------------------ */

const STEPS: { num: string; roman: string; title: string; body: string; icon: LucideIcon }[] = [
  {
    num: "01",
    roman: "I",
    title: "Petition",
    body: "Put your venture before the committee in your own words — what you're building, why now, and who you need beside you. Every story in the house begins with this page.",
    icon: Send,
  },
  {
    num: "02",
    roman: "II",
    title: "Deliberation",
    body: "The committee reads every petition by hand and holds it against the Standard. No keyword filters, no mass intake — human judgment, the way it has always been done.",
    icon: ScanSearch,
  },
  {
    num: "03",
    roman: "III",
    title: "Invitation",
    body: "Clear the bar and a single-use invitation, signed by the committee, arrives at your inbox. Your seat is already laid at the table.",
    icon: MailPlus,
  },
];

function StepCard({ step, delay }: { step: (typeof STEPS)[number]; delay: number }) {
  const Icon = step.icon;
  return (
    <Reveal delay={delay} className="relative h-full">
      {/* phone-only rail diamond — the stacked cards hang off a gold rail line */}
      <span
        aria-hidden="true"
        className="absolute -left-6 top-9 text-[10px] text-gold/80 md:hidden"
      >
        ◆
      </span>
      <TiltCard className="velvet relative h-full rounded-2xl p-6 sm:p-7 md:p-8 overflow-hidden group">
        <CornerMarks />
        <span
          aria-hidden="true"
          className="absolute -top-2 right-4 font-display text-6xl md:text-7xl font-bold text-gold/20 select-none group-hover:text-gold/35 transition-colors duration-500"
        >
          {step.roman}
        </span>
        <div className="relative w-11 h-11 rounded-full pill-glow bg-gold/10 border border-gold/25 grid place-items-center mb-6 group-hover:scale-110 transition-transform duration-300">
          <Icon className="w-5 h-5 text-gold" strokeWidth={2.2} />
        </div>
        <p className="engraved relative text-[10px] font-semibold uppercase tracking-[0.28em] text-gold/80 mb-2">
          Step {step.num}
        </p>
        <h3 className="relative font-display text-xl sm:text-2xl font-semibold tracking-tight mb-3">
          {step.title}
        </h3>
        <p className="relative text-sm leading-relaxed text-muted-foreground">{step.body}</p>
      </TiltCard>
    </Reveal>
  );
}

/** gold hairline + diamond connector between the step cards (md+) */
function StepConnector({ delay }: { delay: number }) {
  return (
    <Reveal delay={delay} className="hidden md:flex items-center self-center w-10 lg:w-12 shrink-0">
      <span aria-hidden="true" className="flex flex-1 items-center">
        <span className="h-px flex-1 bg-gradient-to-r from-gold/40 to-gold/15" />
        <span className="text-[8px] text-gold/70 px-1">◆</span>
        <span className="h-px flex-1 bg-gradient-to-l from-gold/40 to-gold/15" />
      </span>
    </Reveal>
  );
}

export function HowItWorks() {
  return (
    <SectionShell id="how" className="py-14 md:py-20 lg:py-24 xl:py-32">
      <Reveal className="mb-10 text-center max-w-2xl mx-auto md:mb-14">
        <ChapterMark numeral="Chapter III" title="The Admission" />
        <h2 className="mt-4 font-display text-3xl sm:text-4xl md:text-5xl leading-[1.08] tracking-tight font-bold">
          Three rites. <span className="text-gradient-gold italic">One circle.</span>
        </h2>
        <p className="mt-4 text-sm sm:text-base leading-relaxed text-muted-foreground">
          Conclave is deliberately small. Every petition is weighed by hand, every
          invitation is signed, every seat is remembered.
        </p>
      </Reveal>

      {/* phone: gold rail behind the stacked cards · md+: diamond connectors */}
      <div className="relative">
        <span
          aria-hidden="true"
          className="md:hidden absolute left-[3px] top-8 bottom-8 w-px bg-gradient-to-b from-transparent via-gold/30 to-transparent"
        />
        <div className="grid gap-6 pl-6 md:pl-0 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:gap-5 lg:gap-6 items-stretch">
          <StepCard step={STEPS[0]!} delay={0} />
          <StepConnector delay={0.08} />
          <StepCard step={STEPS[1]!} delay={0.12} />
          <StepConnector delay={0.2} />
          <StepCard step={STEPS[2]!} delay={0.24} />
        </div>
      </div>
    </SectionShell>
  );
}

/* ------------------------------------------------------------------ */
/*  3. Why Conclave — bento grid                                       */
/* ------------------------------------------------------------------ */

const FEATURES: {
  title: string;
  body: string;
  icon: LucideIcon;
  span?: "flagship" | "closing";
  note?: string;
}[] = [
  {
    title: "The circle",
    body: "A close room of people who build companies — founders, operators, and student builders who answer each other by name, and stay until it ships.",
    icon: Users,
    span: "flagship",
    note: "Density is the product — the average quality per seat, not the size of the room.",
  },
  {
    title: "Curation",
    body: "The committee admits one petition at a time — and declines far more than it accepts. Every name in the house earned its way in.",
    icon: ShieldCheck,
  },
  {
    title: "Signal over noise",
    body: "No cold outreach, no recruiter spam, no feed you have to escape. Every conversation starts from a shared venture and a mutual yes.",
    icon: Sparkles,
  },
  {
    title: "Builders only",
    body: "Founders, operators, and student builders — people who own what they make. You build, you ship, you have skin in the game.",
    icon: UserCheck,
  },
  {
    title: "Momentum",
    body: "A live venture board, members who reply within hours, a committee in session every week. The house moves at the speed of the people in it.",
    icon: Compass,
  },
  {
    title: "Ownership",
    body: "Members are owners — of their ventures, their equity, and the club itself. Not users, not candidates. Proprietors of the circle.",
    icon: Crown,
    span: "closing",
  },
];

export function WhyConclave() {
  return (
    <SectionShell id="why" className="py-14 md:py-20 lg:py-24 xl:py-32 relative">
      <div className="absolute inset-0 grid-bg opacity-50 pointer-events-none" aria-hidden="true" />
      <div className="relative">
        <Reveal className="mb-12 md:mb-16 text-center max-w-2xl mx-auto">
          <ChapterMark numeral="Chapter II" title="The Circle" />
          <h2 className="mt-4 font-display text-3xl sm:text-4xl md:text-5xl leading-[1.08] tracking-tight font-bold">
            Not a network.{" "}
            <span className="text-gradient-gold italic">A circle.</span>
          </h2>
          <p className="mt-4 text-sm sm:text-base leading-relaxed text-muted-foreground">
            The idea is simple. The door is not. That is the entire point.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            const flagship = f.span === "flagship";
            return (
              <Reveal
                key={f.title}
                delay={(i % 3) * 0.1}
                className={cn(
                  "h-full",
                  f.span === "flagship" && "md:col-span-2 lg:row-span-2",
                  f.span === "closing" && "md:col-span-2"
                )}
              >
                <TiltCard
                  className={cn(
                    "group relative h-full rounded-2xl border border-border/60 bg-card/40 flex flex-col",
                    flagship ? "p-7 sm:p-8 md:p-9" : "p-6 md:p-7"
                  )}
                >
                  <CornerMarks />
                  <div
                    className={cn(
                      "relative pill-glow grid place-items-center self-start rounded-full bg-gold/10 border border-gold/25 mb-5 group-hover:scale-110 transition-transform duration-300",
                      flagship ? "h-12 w-12" : "h-10 w-10"
                    )}
                  >
                    <Icon
                      className={cn("text-gold", flagship ? "w-5.5 h-5.5" : "w-5 h-5")}
                      strokeWidth={2.2}
                    />
                  </div>
                  <h3
                    className={cn(
                      "relative font-display font-semibold tracking-tight mb-2",
                      flagship ? "text-2xl sm:text-3xl" : "text-lg sm:text-xl"
                    )}
                  >
                    {f.title}
                  </h3>
                  <p
                    className={cn(
                      "relative leading-relaxed text-muted-foreground",
                      flagship ? "text-sm sm:text-base max-w-md" : "text-sm"
                    )}
                  >
                    {f.body}
                  </p>

                  {flagship && f.note ? (
                    <div className="relative mt-auto pt-6">
                      <div className="rule-diamond w-24 mb-4" aria-hidden="true" />
                      <p className="engraved text-xs uppercase tracking-[0.22em] text-gold/70">
                        {f.note}
                      </p>
                    </div>
                  ) : null}
                </TiltCard>
              </Reveal>
            );
          })}
        </div>
      </div>
    </SectionShell>
  );
}

/* ------------------------------------------------------------------ */
/*  3.5 The Circle — founding members, live from the roll              */
/* ------------------------------------------------------------------ */

type SpotlightMember = {
  id: string;
  name: string;
  college: string;
  gradYear: string;
  bio: string;
  roles: string;
  skills: string;
  availableFor: string;
  ideaCount: number;
};

/** large serif-initial avatar disc with a champagne ring that warms on hover */
function MemberInitial({ name }: { name: string }) {
  return (
    <span
      aria-hidden="true"
      className="relative grid h-14 w-14 shrink-0 place-items-center rounded-full border border-gold/25 bg-gold/10 font-display text-xl font-bold text-gold transition-all duration-300 group-hover:border-gold/60 group-hover:ring-1 group-hover:ring-gold/40 group-hover:shadow-[0_0_22px_-4px_oklch(0.84_0.13_85/50%)]"
    >
      {name.trim().charAt(0).toUpperCase() || "C"}
    </span>
  );
}

function splitListLocal(raw: string | null | undefined): string[] {
  return (raw || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function SpotlightSkeleton() {
  return (
    <div className="velvet h-full rounded-2xl p-6 animate-pulse" aria-hidden="true">
      <div className="flex items-center justify-between">
        <div className="h-2.5 w-20 rounded bg-foreground/10" />
        <div className="h-4 w-8 rounded-md bg-foreground/10" />
      </div>
      <div className="mt-5 flex items-center gap-3.5">
        <div className="h-14 w-14 rounded-full bg-foreground/10" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-24 rounded bg-foreground/10" />
          <div className="h-2.5 w-32 rounded bg-foreground/10" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-2.5 w-full rounded bg-foreground/10" />
        <div className="h-2.5 w-4/5 rounded bg-foreground/10" />
      </div>
      <div className="mt-4 flex gap-1.5">
        <div className="h-5 w-16 rounded-full bg-foreground/10" />
        <div className="h-5 w-20 rounded-full bg-foreground/10" />
      </div>
      <div className="mt-5 h-2.5 w-28 rounded bg-foreground/10" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  4. The Standard (selection)                                        */
/* ------------------------------------------------------------------ */

const STANDARD_ITEMS = [
  "Ambition — building something bigger than a semester project",
  "Traction or proof of thought — users, revenue, prototypes, or sharp reasoning",
  "Builder energy — you'd rather ship this week than debate next month",
  "Skin in the game — time, savings, or reputation already on the line",
  "Generosity — you give help before you ask for it",
];

export function TheBar({ decided, declined }: { decided: number; declined: number }) {
  // real deliberation record from /api/stats — the card renders only once the
  // committee has actually ruled on petitions; never an invented rate
  const hasRecord = decided > 0;
  const share = hasRecord ? Math.round((declined / decided) * 100) : 0;
  return (
    <SectionShell id="bar" className="py-14 md:py-20 lg:py-24 xl:py-32">
      <Reveal className="mb-10 text-center max-w-2xl mx-auto md:mb-14">
        <ChapterMark numeral="Chapter IV" title="The Standard" />
        <h2 className="mt-4 font-display text-3xl sm:text-4xl md:text-5xl leading-[1.08] tracking-tight font-bold">
          Every petition read by hand.{" "}
          <span className="text-gradient-gold italic">Every seat earned.</span>
        </h2>
        <p className="mt-4 text-sm sm:text-base leading-relaxed text-muted-foreground">
          A club is the average of its members — ours stays high the hard way, by
          declining far more than it accepts. No quotas, no volume targets. Your
          petition meets the same Standard, every single time.
        </p>
      </Reveal>

      <div className="grid gap-5 lg:grid-cols-2 lg:gap-8 items-stretch">
        {/* left — the honest record, whatever it says */}
        <Reveal className="h-full">
          <div className="velvet corner-marks relative flex h-full flex-col justify-center rounded-2xl p-7 sm:p-8 overflow-hidden">
            <p className="micro-label">The committee&apos;s record</p>
            {hasRecord ? (
              <>
                <div className="relative mt-6 flex items-baseline gap-3">
                  <p className="font-display text-6xl font-bold text-gradient-gold">{share}%</p>
                  <p className="text-sm font-semibold text-gold">of petitions declined</p>
                </div>
                <p className="relative mt-4 text-sm leading-relaxed text-muted-foreground">
                  {declined} of {decided} decided by the committee, so far. Most
                  knock. Few enter.
                </p>
              </>
            ) : (
              <>
                <p className="relative mt-6 font-display text-2xl font-bold text-foreground/90 sm:text-3xl">
                  The record is being written.
                </p>
                <p className="relative mt-4 text-sm leading-relaxed text-muted-foreground">
                  Every petition decided adds a line to it. No rate is quoted until
                  there are real numbers to quote — the Standard, applied to
                  ourselves.
                </p>
              </>
            )}
            <div className="rule-diamond relative mt-8 w-28" aria-hidden="true" />
            <p className="engraved relative mt-5 text-[11px] uppercase tracking-[0.24em] text-gold/70">
              Most knock. Few enter.
            </p>
          </div>
        </Reveal>

        {/* right — what the committee weighs */}
        <Reveal delay={0.12} className="h-full">
          <div className="velvet relative h-full rounded-2xl p-6 sm:p-7 md:p-9 overflow-hidden">
            <p className="engraved relative text-[10px] sm:text-[11px] uppercase tracking-[0.28em] text-gold/80 font-medium mb-2">
              What the committee looks for
            </p>
            <div className="rule-diamond w-24 mb-6" aria-hidden="true" />
            <ul className="relative">
              {STANDARD_ITEMS.map((item) => {
                const [lead, ...rest] = item.split(" — ");
                return (
                  <li
                    key={item}
                    className="group flex items-start gap-4 border-b border-border/40 py-4 first:pt-0 last:border-b-0 last:pb-0"
                  >
                    <span
                      aria-hidden="true"
                      className="track-dot mt-[7px] h-2 w-2 shrink-0 rounded-full bg-gold/80 text-gold group-hover:bg-gold transition-colors"
                    />
                    <span className="engraved text-[15px] leading-relaxed">
                      <span className="font-semibold text-foreground/95">{lead}</span>
                      {rest.length > 0 ? <span> — {rest.join(" — ")}</span> : null}
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="relative mt-7 pt-5 border-t border-border/50 flex items-center gap-3 text-sm text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-gold animate-pulse shrink-0" aria-hidden="true" />
              Depth beats polish. A raw petition that shows real thought outranks a
              shiny deck that doesn&apos;t.
            </div>
          </div>
        </Reveal>
      </div>
    </SectionShell>
  );
}

/* ------------------------------------------------------------------ */
/*  5. Final CTA — the closer                                          */
/* ------------------------------------------------------------------ */

export function FinalCta() {
  return (
    <SectionShell className="py-14 md:py-20 lg:py-24 xl:py-32">
      <Reveal>
        <div className="velvet corner-marks relative overflow-hidden rounded-3xl p-8 sm:p-10 md:p-14 lg:p-16">
          <div className="absolute inset-0 grid-bg opacity-60" aria-hidden="true" />
          <div
            className="absolute -top-24 left-1/2 -translate-x-1/2 w-[36rem] max-w-full h-72 rounded-full bg-gold/12 blur-[110px] pointer-events-none"
            aria-hidden="true"
          />
          <div className="relative flex flex-col items-center gap-9 text-center lg:flex-row lg:items-center lg:justify-between lg:gap-14 lg:text-left">
            {/* rotating club seal — smaller on phone/tablet, full crest on laptop */}
            <div
              aria-hidden="true"
              className="club-seal h-24 w-24 sm:h-28 sm:w-28 lg:h-44 lg:w-44 shrink-0"
            >
              <div className="grid h-full w-full place-items-center rounded-full">
                <div className="text-center">
                  <p className="font-display text-3xl sm:text-4xl lg:text-6xl font-bold leading-none text-gradient-gold">
                    C
                  </p>
                  <p className="mt-1.5 lg:mt-2 font-mono text-[8px] lg:text-[9px] uppercase tracking-[0.3em] text-gold/70">
                    Est. 2025
                  </p>
                </div>
              </div>
            </div>

            <div className="max-w-2xl">
              <div className="flex justify-center lg:justify-start">
                <SectionLabel align="left">Petitions open</SectionLabel>
              </div>
              <h2 className="mt-4 font-display text-3xl sm:text-4xl md:text-5xl leading-[1.08] tracking-tight font-bold">
                The table is laid.{" "}
                <span className="text-gradient-gold italic">Your seat is set.</span>
              </h2>
              <p className="mt-5 max-w-xl mx-auto lg:mx-0 text-sm sm:text-base leading-relaxed text-muted-foreground">
                Somewhere behind these doors is a venture that needs exactly what you
                know. Write the petition — the committee is reading.
              </p>
              <div className="rule-diamond mt-7 w-32 mx-auto lg:mx-0" aria-hidden="true" />
              <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-4 lg:justify-start">
                <Button
                  asChild
                  size="lg"
                  className="glow-emerald cta-shine h-12 w-full sm:w-auto px-8 text-base font-semibold sm:min-w-[210px]"
                >
                  <a href="#/submit">Petition for membership</a>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 w-full sm:w-auto px-8 text-base border-border/70 bg-transparent hover:bg-accent/40 sm:min-w-[200px]"
                >
                  <a href="#/platform">Member login</a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </SectionShell>
  );
}
