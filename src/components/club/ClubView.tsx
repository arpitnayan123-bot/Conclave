"use client";

import type { ReactNode } from "react";
import {
  ArrowLeft,
  BellRing,
  BookOpen,
  CheckCircle2,
  Crown,
  DoorOpen,
  EyeOff,
  Gem,
  Globe,
  Handshake,
  HeartHandshake,
  KeyRound,
  Mail,
  MegaphoneOff,
  PenLine,
  Scale,
  ScrollText,
  Send,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/Logo";
import { Footer } from "@/components/shared/Footer";
import { Reveal } from "@/components/shared/Reveal";

/* ------------------------------------------------------------------ */
/*  The Charter of Conclave — the club's structured-details page       */
/* ------------------------------------------------------------------ */

const CONCIERGE_EMAIL = "concierge@conclave.club";

function CharterSection({
  id,
  numeral,
  label,
  title,
  children,
}: {
  id: string;
  numeral: string;
  label: string;
  title: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-28 py-10 md:py-14">
      <Reveal>
        <p className="micro-label">
          {numeral} · {label}
        </p>
        <h2
          id={`${id}-heading`}
          className="mt-3 font-display text-3xl md:text-4xl font-bold tracking-tight"
        >
          {title}
        </h2>
        <div className="rule-diamond mt-7 mb-9 max-w-md" aria-hidden="true" />
      </Reveal>
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  II. The Admission — four steps                                     */
/* ------------------------------------------------------------------ */

const ADMISSION_STEPS: { numeral: string; title: string; body: string; icon: LucideIcon }[] = [
  {
    numeral: "I",
    title: "Petition",
    body: "Submit your venture through the public petition desk. Tell the committee what you're building, why now, and what you need to make it real.",
    icon: PenLine,
  },
  {
    numeral: "II",
    title: "Deliberation",
    body: "Every petition is read by hand and weighed against the Standard. No keyword bots, no quotas — the committee deliberates, then decides.",
    icon: Scale,
  },
  {
    numeral: "III",
    title: "Invitation",
    body: "Builders who clear the bar receive a personal, single-use invitation link by email. Invitations cannot be bought, sold, or transferred.",
    icon: Mail,
  },
  {
    numeral: "IV",
    title: "Initiation",
    body: "Claim your seat: complete your member profile, step inside the circle, and post your venture to the house.",
    icon: DoorOpen,
  },
];

/* ------------------------------------------------------------------ */
/*  III. The Standard                                                  */
/* ------------------------------------------------------------------ */

const STANDARD_ROWS: { title: string; body: string }[] = [
  {
    title: "Ambition",
    body: "A venture big enough to outgrow a semester — and a builder who intends to find out.",
  },
  {
    title: "Traction or proof of thought",
    body: "Users, revenue, shipped prototypes — or reasoning sharp enough to bet on.",
  },
  {
    title: "Builder energy",
    body: "A bias for shipping this week over debating next month.",
  },
  {
    title: "Skin in the game",
    body: "Time, savings, or reputation already on the line. Owners, not spectators.",
  },
  {
    title: "Generosity",
    body: "Gives help before asking for it — the trait the circle is built on.",
  },
];

/* ------------------------------------------------------------------ */
/*  IV. House Rules — the members' code                                */
/* ------------------------------------------------------------------ */

const HOUSE_RULES: { num: string; title: string; body: string; icon: LucideIcon }[] = [
  {
    num: "01",
    title: "Build in the open",
    body: "Share the venture as it is — early, messy, real. The circle rewards honesty over polish.",
    icon: BookOpen,
  },
  {
    num: "02",
    title: "Generosity first",
    body: "Give counsel, introductions, and feedback before you ask for any.",
    icon: HeartHandshake,
  },
  {
    num: "03",
    title: "No recruiting spam",
    body: "The club is not a talent pool. The circle exists for owners building their own things.",
    icon: MegaphoneOff,
  },
  {
    num: "04",
    title: "Ownership mindset",
    body: "Treat your venture — and the club — like you own them. Because you do.",
    icon: Gem,
  },
  {
    num: "05",
    title: "What's said in the circle stays in the circle",
    body: "Member pitches, metrics, and messages are confidential by default.",
    icon: EyeOff,
  },
  {
    num: "06",
    title: "Help the next member",
    body: "Every member was once the newest one in the room. Hold the door open.",
    icon: Handshake,
  },
];

/* ------------------------------------------------------------------ */
/*  V. The Committee — roles, not names                                */
/* ------------------------------------------------------------------ */

const COMMITTEE_ROLES: { title: string; body: string; icon: LucideIcon }[] = [
  {
    title: "The Chair",
    body: "Convenes the committee, keeps deliberations honest, and holds the deciding voice when opinions split.",
    icon: Crown,
  },
  {
    title: "Keeper of the Rolls",
    body: "Maintains the member register and the petition queue — every application read, logged, and answered.",
    icon: ScrollText,
  },
  {
    title: "The Concierge",
    body: "The members' first point of contact for anything the house touches — introductions, questions, lost keys.",
    icon: BellRing,
  },
  {
    title: "Chapter Ambassadors",
    body: "Senior members who host campus chapters and nominate standout builders for the committee's review.",
    icon: Globe,
  },
];

/* ------------------------------------------------------------------ */
/*  VII. Concierge — short FAQ                                         */
/* ------------------------------------------------------------------ */

const CONCIERGE_FAQS: { q: string; a: string }[] = [
  {
    q: "How long does deliberation take?",
    a: "Most petitions receive a decision within a week. Every one is read by hand — if the committee wants another look, it takes the time it needs.",
  },
  {
    q: "Can I petition again if I'm declined?",
    a: "Yes. A decline is a no for now, not a verdict on you. Builders often return with more traction and a sharper petition — and the committee notices.",
  },
  {
    q: "I received a CNCL- link. What now?",
    a: "Open it, claim your seat, and complete your member profile. The link is single-use and tied to you — if it has expired, write to the concierge and the rolls will be checked.",
  },
];

export default function ClubView() {
  return (
    <div className="min-h-svh overflow-x-clip flex flex-col">
      {/* ---------------------- sticky mini header ---------------------- */}
      <header className="sticky top-0 z-40 glass nav-hairline">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <Logo />
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="ghost"
              className="min-h-[44px] text-muted-foreground hover:text-foreground"
            >
              <a href="#/">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Return
              </a>
            </Button>
            <Button
              asChild
              className="hidden sm:inline-flex min-h-[44px] font-semibold cta-shine"
            >
              <a href="#/submit">Request membership</a>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ------------------------------ hero ------------------------------ */}
        <section
          aria-label="The Charter of Conclave"
          className="relative overflow-hidden noise"
        >
          <div className="absolute inset-0 grid-bg opacity-60 pointer-events-none" aria-hidden="true" />
          <div
            className="absolute -top-24 left-1/2 -translate-x-1/2 w-[34rem] h-72 rounded-full bg-primary/12 blur-[110px] pointer-events-none"
            aria-hidden="true"
          />
          <div className="relative mx-auto max-w-5xl px-4 sm:px-6 pt-16 pb-10 md:pt-24 md:pb-14 text-center">
            <Reveal>
              <div className="mx-auto club-seal h-20 w-20" aria-hidden="true">
                <span className="font-display text-3xl font-bold italic text-gold">C</span>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <h1 className="mt-8 font-display text-4xl md:text-6xl font-bold tracking-tight">
                The Charter of <span className="text-gradient-gold">Conclave</span>
              </h1>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="mt-5 font-mono text-[11px] sm:text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Est. 2025 <span className="text-gold" aria-hidden="true">◆</span>{" "}
                Membership is earned, never bought
              </p>
            </Reveal>
            <Reveal delay={0.24}>
              <div className="rule-diamond max-w-xs mx-auto mt-10" aria-hidden="true" />
            </Reveal>
          </div>
        </section>

        {/* --------------------------- the articles -------------------------- */}
        <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 pb-20 md:pb-28">
          {/* I. The Club */}
          <CharterSection
            id="the-club"
            numeral="I"
            label="The Club"
            title={
              <>
                A private club for <span className="text-gradient">people who build companies.</span>
              </>
            }
          >
            <Reveal delay={0.05}>
              <article className="velvet rounded-2xl p-7 md:p-10 space-y-5 text-[15px] md:text-base leading-relaxed text-muted-foreground">
                <p>
                  <span className="font-display text-lg font-semibold text-foreground">
                    Conclave
                  </span>{" "}
                  is an elite private club for startup and business builders. Not a
                  community, not a course, not another feed — <em className="text-foreground not-italic font-medium">a circle</em>.
                  Inside it: founders with revenue, operators with scars, and student
                  builders with ventures already in motion — all of them chosen by the
                  same committee, all of them building something real.
                </p>
                <p>
                  Membership means the room is always worth being in. Every member can
                  bring a venture to the table, call on the club for co-founders and
                  counsel, and take their seat the moment an invitation arrives. Nothing
                  here is gamified and nothing is for sale — the only currency inside the
                  circle is contribution.
                </p>
                <div className="rule-diamond max-w-[240px]" aria-hidden="true" />
                <p className="font-display text-base italic text-foreground/80">
                  &ldquo;Some build alone. Members build together.&rdquo;
                </p>
              </article>
            </Reveal>
          </CharterSection>

          {/* II. The Admission */}
          <CharterSection
            id="admission"
            numeral="II"
            label="The Admission"
            title={
              <>
                Four steps to <span className="text-gradient-gold">a seat.</span>
              </>
            }
          >
            <div className="grid sm:grid-cols-2 gap-4 md:gap-5">
              {ADMISSION_STEPS.map((step, i) => {
                const Icon = step.icon;
                return (
                  <Reveal key={step.numeral} delay={0.06 * i} className="h-full">
                    <article className="velvet card-hover h-full rounded-2xl p-6 md:p-7">
                      <div className="flex items-start justify-between gap-4">
                        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-primary/25 bg-primary/10">
                          <Icon className="h-5 w-5 text-primary" strokeWidth={2.2} aria-hidden="true" />
                        </div>
                        <span
                          aria-hidden="true"
                          className="font-display text-3xl font-bold italic text-gold/35 select-none"
                        >
                          {step.numeral}
                        </span>
                      </div>
                      <h3 className="mt-5 font-display text-xl font-semibold tracking-tight">
                        {step.title}
                      </h3>
                      <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                        {step.body}
                      </p>
                    </article>
                  </Reveal>
                );
              })}
            </div>
          </CharterSection>

          {/* III. The Standard */}
          <CharterSection
            id="standard"
            numeral="III"
            label="The Standard"
            title={
              <>
                What the committee <span className="text-gradient">looks for.</span>
              </>
            }
          >
            <Reveal delay={0.05}>
              <ul className="velvet rounded-2xl divide-y divide-border/50 overflow-hidden">
                {STANDARD_ROWS.map((row) => (
                  <li
                    key={row.title}
                    className="flex items-start gap-4 px-6 md:px-8 py-5 row-glow"
                  >
                    <CheckCircle2
                      className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                      strokeWidth={2.2}
                      aria-hidden="true"
                    />
                    <div>
                      <h3 className="engraved font-display text-base md:text-lg font-semibold tracking-tight">
                        {row.title}
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {row.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={0.15}>
              <p className="mt-5 flex items-center gap-3 text-sm text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-gold animate-pulse shrink-0" aria-hidden="true" />
                Most petitions are declined. Depth beats polish, every time.
              </p>
            </Reveal>
          </CharterSection>

          {/* IV. House Rules */}
          <CharterSection
            id="house-rules"
            numeral="IV"
            label="House Rules"
            title={
              <>
                The members&apos; <span className="text-gradient-gold">code.</span>
              </>
            }
          >
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
              {HOUSE_RULES.map((rule, i) => {
                const Icon = rule.icon;
                return (
                  <Reveal key={rule.num} delay={0.05 * (i % 3)} className="h-full">
                    <article className="velvet card-hover h-full rounded-2xl p-6">
                      <div className="flex items-center justify-between gap-3">
                        <Icon className="h-5 w-5 text-gold" strokeWidth={2} aria-hidden="true" />
                        <span className="font-mono text-xs text-gold/60" aria-hidden="true">
                          {rule.num}
                        </span>
                      </div>
                      <h3 className="mt-4 font-display text-lg font-semibold tracking-tight leading-snug">
                        {rule.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {rule.body}
                      </p>
                    </article>
                  </Reveal>
                );
              })}
            </div>
          </CharterSection>

          {/* V. The Committee */}
          <CharterSection
            id="committee"
            numeral="V"
            label="The Committee"
            title={
              <>
                Deliberation, <span className="text-gradient">by hand.</span>
              </>
            }
          >
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
              {COMMITTEE_ROLES.map((role, i) => {
                const Icon = role.icon;
                return (
                  <Reveal key={role.title} delay={0.06 * i} className="h-full">
                    <article className="velvet card-hover h-full rounded-2xl p-6">
                      <div className="grid h-11 w-11 place-items-center rounded-xl border border-primary/25 bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" strokeWidth={2.1} aria-hidden="true" />
                      </div>
                      <h3 className="mt-5 font-display text-lg font-semibold tracking-tight">
                        {role.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {role.body}
                      </p>
                    </article>
                  </Reveal>
                );
              })}
            </div>
            <Reveal delay={0.2}>
              <p className="mt-6 text-center text-sm text-muted-foreground">
                Roles rotate. The committee answers to the members — never the other way
                around.
              </p>
            </Reveal>
          </CharterSection>

          {/* VI. Petitions & Invitations */}
          <CharterSection
            id="petitions"
            numeral="VI"
            label="Petitions & Invitations"
            title={
              <>
                How the door <span className="text-gradient-gold">opens.</span>
              </>
            }
          >
            <div className="grid md:grid-cols-2 gap-4 md:gap-5">
              <Reveal delay={0.05} className="h-full">
                <article className="velvet h-full rounded-2xl p-7 md:p-8">
                  <div className="flex items-center gap-3">
                    <Send className="h-5 w-5 text-primary" aria-hidden="true" />
                    <h3 className="font-display text-xl font-semibold tracking-tight">
                      Petitions are public
                    </h3>
                  </div>
                  <p className="mt-3.5 text-sm leading-relaxed text-muted-foreground">
                    Anyone may petition the club. Submit your venture at the petition
                    desk — it costs nothing, and the committee reads every single one.
                    You&apos;ll be able to follow your petition&apos;s status while it
                    waits.
                  </p>
                  <Button
                    asChild
                    className="mt-6 glow-emerald cta-shine h-11 font-semibold group"
                  >
                    <a href="#/submit">
                      Request membership
                      <Send
                        className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                        aria-hidden="true"
                      />
                    </a>
                  </Button>
                </article>
              </Reveal>
              <Reveal delay={0.12} className="h-full">
                <article className="velvet h-full rounded-2xl p-7 md:p-8">
                  <div className="flex items-center gap-3">
                    <KeyRound className="h-5 w-5 text-gold" aria-hidden="true" />
                    <h3 className="font-display text-xl font-semibold tracking-tight">
                      Invitations are single-use
                    </h3>
                  </div>
                  <p className="mt-3.5 text-sm leading-relaxed text-muted-foreground">
                    Builders who clear the bar receive a personal{" "}
                    <span className="font-mono text-xs text-gold">CNCL-</span> link by
                    email. Each link opens exactly one seat, then expires — it can&apos;t
                    be shared, sold, or transferred. If it reaches your Gmail, it was
                    meant for you.
                  </p>
                  <p className="mt-6 flex items-center gap-2.5 text-sm text-muted-foreground">
                    <Sparkles className="h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
                    Every invitation is earned. None are ever sold.
                  </p>
                </article>
              </Reveal>
            </div>
          </CharterSection>

          {/* VII. Concierge */}
          <CharterSection
            id="concierge"
            numeral="VII"
            label="Concierge"
            title={
              <>
                Questions, <span className="text-gradient">handled personally.</span>
              </>
            }
          >
            <Reveal delay={0.05}>
              <article className="velvet rounded-2xl p-7 md:p-8 flex flex-col sm:flex-row sm:items-center gap-6">
                <div className="club-seal h-16 w-16 shrink-0" aria-hidden="true">
                  <BellRing className="h-6 w-6 text-gold" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-display text-xl font-semibold tracking-tight">
                    Write to the house
                  </h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    Questions before petitioning, a lost invitation link, or an
                    introduction you&apos;d like made — the concierge answers members and
                    petitioners alike.
                  </p>
                  <a
                    href={`mailto:${CONCIERGE_EMAIL}`}
                    className="mt-3.5 inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    <Mail className="h-4 w-4" aria-hidden="true" />
                    {CONCIERGE_EMAIL}
                  </a>
                </div>
              </article>
            </Reveal>

            <Reveal delay={0.12}>
              <Accordion
                type="single"
                collapsible
                className="glass mt-5 rounded-2xl px-6 md:px-8 [&>*]:border-border/50"
              >
                {CONCIERGE_FAQS.map((f, i) => (
                  <AccordionItem key={f.q} value={`concierge-${i}`}>
                    <AccordionTrigger className="py-5 text-[15px] md:text-base font-medium hover:no-underline hover:text-primary transition-colors min-h-[44px]">
                      {f.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm md:text-[15px] leading-relaxed text-muted-foreground pb-5">
                      {f.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Reveal>
          </CharterSection>

          {/* -------------------------- final CTA -------------------------- */}
          <Reveal>
            <section
              aria-label="Join the club"
              className="relative mt-14 overflow-hidden rounded-3xl glass p-10 md:p-14 text-center"
            >
              <div className="absolute inset-0 grid-bg opacity-70" aria-hidden="true" />
              <div
                className="absolute -top-20 left-1/2 -translate-x-1/2 w-[30rem] h-64 rounded-full bg-primary/15 blur-[100px] pointer-events-none"
                aria-hidden="true"
              />
              <div className="relative">
                <p className="micro-label text-center">Petitions open</p>
                <h2 className="mt-4 font-display text-3xl md:text-5xl font-bold tracking-tight">
                  The circle is <span className="text-gradient-gold">waiting.</span>
                </h2>
                <p className="mt-5 max-w-xl mx-auto text-muted-foreground">
                  Your petition is one page. The room it opens is not.
                </p>
                <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Button
                    asChild
                    size="lg"
                    className="glow-emerald cta-shine h-12 px-8 text-base font-semibold min-w-[210px]"
                  >
                    <a href="#/submit">Request membership</a>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="h-12 px-8 text-base border-border/70 bg-transparent hover:bg-accent/40"
                  >
                    <a href="#/platform">Member login</a>
                  </Button>
                </div>
              </div>
            </section>
          </Reveal>
        </div>
      </main>

      <Footer />
    </div>
  );
}
