"use client";

import { Plus } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Reveal } from "@/components/shared/Reveal";
import { ChapterMark } from "./Sections";

const FAQS: { q: string; a: string }[] = [
  {
    q: "What is Conclave?",
    a: "Conclave is a private club for startup and business builders — founders, operators, and student builders who want to build companies together. Membership is invitation-only and the roster is deliberately small. Inside the circle you'll find a live venture board, a directory of owners, and a committee that keeps the signal high.",
  },
  {
    q: "Who can petition for membership?",
    a: "Any current student or recent graduate — from any campus, any field, any year, anywhere. You can be pre-venture or already running a company; what matters is that you build. The committee weighs your petition on its merits, never your pedigree or your CGPA.",
  },
  {
    q: "Is it a job board?",
    a: "No. Conclave is not a job board or an internship board — it's a club of owners. Members share ventures, find co-founders, and help each other build. Recruiting spam is against the house rules and is the fastest way to lose your seat.",
  },
  {
    q: "What does membership cost?",
    a: "Nothing. Membership is free and will stay free — access is limited by curation, not payment. The only currency inside the circle is contribution: sharing your venture, helping other members, and showing up.",
  },
  {
    q: "How selective is the club?",
    a: "Very. The committee reads every petition by hand and declines the majority of them. It's nothing personal — density is the product. A small circle of serious builders is worth more than a large room of spectators.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="relative scroll-mt-24 py-14 md:py-20 lg:py-24 xl:py-32">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-10 md:mb-14">
          <ChapterMark numeral="Chapter VI" title="Questions at the door" />
          <h2 className="mt-4 font-display text-3xl sm:text-4xl md:text-5xl leading-[1.08] tracking-tight font-bold">
            Everything petitioners{" "}
            <span className="text-gradient-gold italic">ask.</span>
          </h2>
          <p className="mt-4 max-w-xl mx-auto text-sm sm:text-base leading-relaxed text-muted-foreground">
            Answered straight — the way the committee answers in the room.
          </p>
        </Reveal>

        <Reveal delay={0.12}>
          {/* editorial ledger — hairline rules instead of boxed cards */}
          <Accordion
            type="single"
            collapsible
            className="border-t border-border/40 [&>*]:border-border/40"
          >
            {FAQS.map((f, i) => (
              <AccordionItem key={f.q} value={`item-${i}`} className="group/faq">
                <AccordionTrigger className="gap-4 py-5 sm:py-6 text-base md:text-lg font-medium text-foreground/90 hover:no-underline hover:text-gold transition-colors [&>svg]:hidden">
                  <span className="flex flex-1 items-start gap-4 text-left">
                    <span
                      aria-hidden="true"
                      className="hidden pt-[3px] font-mono text-xs text-gold/60 sm:block"
                    >
                      0{i + 1}
                    </span>
                    <span className="flex-1">{f.q}</span>
                  </span>
                  {/* gold plus → rotates to a minus when the answer opens */}
                  <span
                    aria-hidden="true"
                    className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-gold/30 bg-gold/5 text-gold transition-transform duration-300 group-hover/faq:border-gold/60 group-data-[state=open]/faq:rotate-45 group-data-[state=open]/faq:bg-gold/10"
                  >
                    <Plus className="h-4 w-4" />
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-sm md:text-base leading-relaxed text-muted-foreground pb-6 sm:pl-8">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}
