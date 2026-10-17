"use client";

import type { ReactNode } from "react";
import { motion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

/* ---------- string list helpers (DB stores comma-separated values) ---------- */

export function splitList(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function firstName(name: string): string {
  return name.split(" ").filter(Boolean)[0] ?? name;
}

export function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return formatDate(iso);
}

/* ---------- framer-motion stagger ---------- */

export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

/* ---------- stage badge (emerald outline / gold / amber solid / emerald solid) ---------- */

const STAGE_STYLES: Record<string, string> = {
  IDEA: "border-emerald-400/40 text-emerald-400 bg-emerald-400/5",
  PROTOTYPE: "border-gold/40 text-gold bg-gold/10",
  MVP: "border-transparent bg-amber-400 text-amber-950",
  LAUNCHED: "border-transparent bg-emerald-500 text-emerald-950",
};

const LIVE_STAGES = new Set(["MVP", "LAUNCHED"]);

export function StageBadge({ stage, className }: { stage: string; className?: string }) {
  const live = LIVE_STAGES.has(stage);
  return (
    <Badge
      variant="outline"
      className={cn("font-semibold tracking-wide", STAGE_STYLES[stage], className)}
    >
      <span className="relative mr-1 inline-flex h-1.5 w-1.5" aria-hidden>
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            live
              ? "bg-current opacity-90 animate-pulse"
              : "bg-current opacity-60"
          )}
        />
      </span>
      {stage}
    </Badge>
  );
}

/* ---------- small chip ---------- */

export function Chip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border/60 bg-secondary/50 px-2.5 py-0.5 text-xs text-muted-foreground whitespace-nowrap",
        className
      )}
    >
      {children}
    </span>
  );
}

/* ---------- toggleable chip (profile form) ---------- */

export function ToggleChip({
  label,
  selected,
  onToggle,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={cn(
        "inline-flex min-h-[32px] items-center rounded-full border px-3 py-1 text-xs font-medium transition-all duration-200",
        selected
          ? "border-primary/50 bg-primary/15 text-primary"
          : "border-border/60 bg-transparent text-muted-foreground hover:border-border hover:text-foreground"
      )}
    >
      {label}
    </button>
  );
}

/* ---------- empty state ---------- */

export function EmptyState({
  icon,
  title,
  copy,
  action,
}: {
  icon: ReactNode;
  title: string;
  copy?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-card/30 px-6 py-16 text-center">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
        {icon}
      </div>
      <p className="font-display text-lg font-semibold">{title}</p>
      {copy ? <p className="mt-1 max-w-sm text-sm text-muted-foreground">{copy}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/* ---------- section header ---------- */

export function SectionHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {right ? <div className="flex items-center gap-2">{right}</div> : null}
    </div>
  );
}
