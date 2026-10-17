"use client";

import Link from "next/link";

/**
 * Conclave crest — a rotated diamond frame with a serif "C" monogram.
 * The diamond slowly turns on hover; double hairline = engraved club seal.
 */
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="#/"
      className="group flex items-center gap-3 select-none"
      aria-label="Conclave home"
    >
      <span className="relative grid h-9 w-9 place-items-center" aria-hidden="true">
        {/* outer diamond */}
        <span className="absolute inset-0 rotate-45 rounded-[7px] border border-gold/55 bg-gradient-to-br from-gold/15 via-transparent to-emeraldx/10 shadow-[0_0_18px_-4px_oklch(0.84_0.13_85/40%)] transition-transform duration-700 ease-out group-hover:rotate-[225deg]" />
        {/* inner diamond */}
        <span className="absolute inset-[3.5px] rotate-45 rounded-[5px] border border-gold/25 transition-transform duration-700 ease-out group-hover:-rotate-[45deg]" />
        {/* monogram */}
        <span className="relative font-display text-[15px] font-bold italic leading-none text-gold">
          C
        </span>
      </span>
      {!compact && (
        <span className="font-display text-[1.3rem] font-semibold tracking-[0.06em] text-foreground">
          Conclave
        </span>
      )}
    </Link>
  );
}
