"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  Clock3,
  Flame,
  Loader2,
  MailCheck,
  Search,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  "Already petitioned?" — public membership-petition tracker         */
/* ------------------------------------------------------------------ */

type TrackedApp = {
  id: string;
  ideaTitle: string;
  stage: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  updatedAt: string;
  invited: boolean;
};

const STATUS_META: Record<
  TrackedApp["status"],
  { label: string; hint: string; cls: string; dot: string; icon: typeof Clock3 }
> = {
  PENDING: {
    label: "With the committee",
    hint: "The committee reads every petition by hand — deliberation usually takes about a week.",
    cls: "border-gold/40 bg-gold/10 text-gold",
    dot: "text-gold",
    icon: Clock3,
  },
  APPROVED: {
    label: "Selected",
    hint: "Invitation sent to your Gmail — open it to claim your seat.",
    cls: "border-emeraldx/50 bg-emeraldx/10 text-emeraldx",
    dot: "text-emeraldx",
    icon: CheckCircle2,
  },
  REJECTED: {
    label: "Not selected this season",
    hint: "The committee encourages you to refine the venture and petition again.",
    cls: "border-border/60 bg-card/60 text-muted-foreground",
    dot: "text-muted-foreground",
    icon: XCircle,
  },
};

function daysSince(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

export function StatusChecker({ defaultEmail = "" }: { defaultEmail?: string }) {
  const [email, setEmail] = useState(defaultEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<TrackedApp[] | null>(null);

  async function track() {
    const clean = email.trim();
    if (!/^[^\s@]+@gmail\.com$/i.test(clean)) {
      setError("Enter the Gmail address you petitioned with");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ applications: TrackedApp[] }>("/applications/status", {
        method: "POST",
        body: { email: clean },
      });
      setResults(res.applications ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lookup failed — try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      aria-labelledby="status-checker-title"
      className="glass corner-marks rounded-2xl p-6 sm:p-8"
    >
      <div className="flex items-start gap-3.5">
        <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-gold/30 bg-gold/10">
          <Search className="h-4.5 w-4.5 text-gold" aria-hidden="true" />
        </span>
        <div>
          <h2 id="status-checker-title" className="font-display text-lg font-bold tracking-tight">
            Already petitioned? Track your petition
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter the Gmail you petitioned with — see where your petition stands in the
            committee&apos;s deliberation. No account needed.
          </p>
        </div>
      </div>

      <form
        className="mt-5 flex flex-col sm:flex-row gap-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!loading) track();
        }}
      >
        <label htmlFor="track-email" className="sr-only">
          Gmail address used in your petition
        </label>
        <Input
          id="track-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@gmail.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
          }}
          className="h-11 flex-1"
        />
        <Button
          type="submit"
          disabled={loading}
          className="h-11 min-h-[44px] px-6 font-semibold cta-shine"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Checking…
            </>
          ) : (
            <>
              Check status <Search className="h-4 w-4" aria-hidden="true" />
            </>
          )}
        </Button>
      </form>

      {error ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <AnimatePresence mode="wait">
        {results !== null && !loading ? (
          results.length === 0 ? (
            <motion.p
              key="none"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-5 rounded-xl border border-border/60 bg-card/40 px-4 py-3.5 text-sm text-muted-foreground"
            >
              No petitions found for that Gmail yet. Submit below, then check here anytime to
              follow your deliberation.
            </motion.p>
          ) : (
            <motion.ul
              key="list"
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
              className="mt-5 space-y-3"
              aria-label="Your petitions"
            >
              {results.map((app) => {
                const meta = STATUS_META[app.status] ?? STATUS_META.PENDING;
                const Icon = meta.icon;
                return (
                  <motion.li
                    key={app.id}
                    variants={{
                      hidden: { opacity: 0, y: 12 },
                      show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
                    }}
                    className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "track-dot inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide",
                          meta.cls
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                        {meta.label}
                        {app.status === "PENDING" && (
                          <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-70" />
                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-gold" />
                          </span>
                        )}
                      </span>
                      <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Flame className="h-3 w-3 text-gold/80" aria-hidden="true" />
                        {app.stage}
                      </span>
                    </div>

                    <p className="mt-2.5 font-display text-[15px] font-bold leading-snug">
                      {app.ideaTitle}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{meta.hint}</p>

                    <p className="mt-2.5 text-[11px] text-muted-foreground/70">
                      Submitted{" "}
                      {new Date(app.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                      {app.status === "PENDING" && daysSince(app.createdAt) > 0
                        ? ` · with the committee for ${daysSince(app.createdAt)} day${daysSince(app.createdAt) === 1 ? "" : "s"}`
                        : ""}
                      {app.status === "APPROVED" && app.invited ? (
                        <span className="ml-1.5 inline-flex items-center gap-1 text-emeraldx">
                          <MailCheck className="h-3 w-3" aria-hidden="true" /> invitation sent to your Gmail
                        </span>
                      ) : null}
                    </p>
                  </motion.li>
                );
              })}
            </motion.ul>
          )
        ) : null}
      </AnimatePresence>
    </section>
  );
}
