"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Flame,
  GraduationCap,
  Handshake,
  Lightbulb,
  Loader2,
  MailCheck,
  Timer,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/* theme-hex approximations of the club palette (see globals.css tokens) */
const EMERALD = "#34d399";
const EMERALD_DIM = "#10b981";
const GOLD = "#fbbf24";
const AMBER = "#f59e0b";
const RED = "#f87171";
const GRID = "rgba(255,255,255,0.06)";
const TICK = { fill: "#8fa89b", fontSize: 11 };

type Analytics = {
  totals: {
    applications: number;
    members: number;
    ideas: number;
    interests: number;
    connections: number;
    invitesSent: number;
    invitesUsed: number;
    byStatus: { PENDING: number; APPROVED: number; REJECTED: number };
  };
  timeline: { date: string; label: string; applications: number; approved: number }[];
  topColleges: { college: string; count: number }[];
  stageSplit: { stage: string; count: number }[];
  review: {
    decided: number;
    avgHours: number;
    medianHours: number;
    fastestHours: number;
    slowestHours: number;
  };
};

function fmtHours(h: number): string {
  if (!h || h <= 0) return "—";
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 48) return `${h < 10 ? h.toFixed(1).replace(/\.0$/, "") : Math.round(h)}h`;
  return `${(h / 24).toFixed(1).replace(/\.0$/, "")}d`;
}

const STAGE_COLORS: Record<string, string> = {
  IDEA: EMERALD_DIM,
  PROTOTYPE: GOLD,
  MVP: AMBER,
  LAUNCHED: EMERALD,
};

export default function AnalyticsPanel({ token }: { token: string }) {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api<Analytics>("/admin/analytics", { token })
      .then((res) => active && setData(res))
      .catch((err) => active && setError((err as Error).message));
    return () => {
      active = false;
    };
  }, [token]);

  const statusPie = useMemo(() => {
    if (!data) return [];
    return [
      { name: "Pending", value: data.totals.byStatus.PENDING, color: GOLD },
      { name: "Admitted", value: data.totals.byStatus.APPROVED, color: EMERALD },
      { name: "Declined", value: data.totals.byStatus.REJECTED, color: RED },
    ];
  }, [data]);

  if (error) {
    return (
      <Card className="glass">
        <CardContent className="p-8 text-center text-sm text-muted-foreground">{error}</CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Skeleton className="h-64 rounded-xl lg:col-span-2" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-56 rounded-xl lg:col-span-2" />
        <Skeleton className="h-56 rounded-xl" />
        <span className="sr-only">Loading analytics…</span>
      </div>
    );
  }

  const t = data.totals;
  const rv = data.review;

  return (
    <div className="space-y-4">
      {/* review speed (SLA) strip */}
      <Card className="glass">
        <CardContent className="p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Timer className="h-4 w-4 text-gold" aria-hidden />
            <h3 className="font-display text-sm font-bold">Review speed</h3>
            <span className="text-xs text-muted-foreground">
              time to decision on {rv.decided} reviewed petition{rv.decided === 1 ? "" : "s"}
            </span>
            <span
              className={cn(
                "ml-auto inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                rv.avgHours > 0 && rv.avgHours <= 168
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-gold/40 bg-gold/10 text-gold"
              )}
            >
              {rv.avgHours > 0 && rv.avgHours <= 168 ? "On SLA (≤ 1 week)" : "Over a week"}
            </span>
          </div>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Average", value: fmtHours(rv.avgHours) },
              { label: "Median", value: fmtHours(rv.medianHours) },
              { label: "Fastest", value: fmtHours(rv.fastestHours) },
              { label: "Slowest", value: fmtHours(rv.slowestHours) },
            ].map((cell, i) => (
              <div
                key={cell.label}
                className={cn(
                  "rounded-xl border border-border/50 bg-card/40 px-4 py-3",
                  i === 0 && "border-primary/30 bg-primary/[0.06]"
                )}
              >
                <dt className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  {cell.label}
                </dt>
                <dd
                  className={cn(
                    "mt-1 font-display text-xl font-bold leading-none",
                    i === 0 ? "text-gradient" : "text-foreground"
                  )}
                >
                  {cell.value}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      {/* membership pulse strip */}
      <div>
        <div className="mb-2 flex items-center gap-2 px-1">
          <Users className="h-4 w-4 text-primary" aria-hidden />
          <h3 className="font-display text-sm font-bold">Membership pulse</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Members", value: t.members, icon: Users, tone: "text-primary" },
            { label: "Ventures presented", value: t.ideas, icon: Lightbulb, tone: "text-gold" },
            { label: "Seconds", value: t.interests, icon: Flame, tone: "text-primary" },
            { label: "Introductions", value: t.connections, icon: Handshake, tone: "text-gold" },
            { label: "Invitations sent", value: t.invitesSent, icon: MailCheck, tone: "text-primary" },
            { label: "Seats claimed", value: t.invitesUsed, icon: GraduationCap, tone: "text-gold" },
          ].map((s) => (
            <Card key={s.label} className="glass card-hover">
              <CardContent className="p-3.5">
                <p className={cn("flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground")}>
                  <s.icon className={cn("h-3.5 w-3.5", s.tone)} aria-hidden /> {s.label}
                </p>
                <p className="mt-1.5 font-display text-2xl font-bold leading-none">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* applications timeline */}
        <Card className="glass lg:col-span-2">
          <CardContent className="p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" aria-hidden />
              <h3 className="font-display text-sm font-bold">Petition flow — last 14 days</h3>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.timeline} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradApps" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={EMERALD} stopOpacity={0.45} />
                      <stop offset="100%" stopColor={EMERALD} stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gradApproved" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={GOLD} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={GOLD} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="label" tick={TICK} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={TICK} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: "oklch(0.17 0.018 170)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 12,
                      fontSize: 12,
                      color: "#e8f5ee",
                    }}
                  />
                  <Area type="monotone" dataKey="applications" name="Petitions" stroke={EMERALD} strokeWidth={2} fill="url(#gradApps)" />
                  <Area type="monotone" dataKey="approved" name="Admitted" stroke={GOLD} strokeWidth={2} fill="url(#gradApproved)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* status split donut */}
        <Card className="glass">
          <CardContent className="p-4 sm:p-5">
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" aria-hidden />
              <h3 className="font-display text-sm font-bold">Deliberation split</h3>
            </div>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPie}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="58%"
                    outerRadius="85%"
                    paddingAngle={3}
                    stroke="transparent"
                  >
                    {statusPie.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "oklch(0.17 0.018 170)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 12,
                      fontSize: 12,
                      color: "#e8f5ee",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
              {statusPie.map((s) => (
                <span key={s.name} className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: s.color }} aria-hidden />
                  {s.name} · <span className="font-semibold text-foreground">{s.value}</span>
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* top colleges */}
        <Card className="glass lg:col-span-2">
          <CardContent className="p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-gold" aria-hidden />
              <h3 className="font-display text-sm font-bold">Top chapters</h3>
            </div>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.topColleges} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="college" tick={TICK} axisLine={false} tickLine={false} interval={0} />
                  <YAxis tick={TICK} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: "rgba(52,211,153,0.06)" }}
                    contentStyle={{
                      background: "oklch(0.17 0.018 170)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 12,
                      fontSize: 12,
                      color: "#e8f5ee",
                    }}
                  />
                  <Bar dataKey="count" name="Petitions" radius={[6, 6, 0, 0]} fill={EMERALD_DIM} maxBarSize={44} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* stage split */}
        <Card className="glass">
          <CardContent className="p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2">
              <Loader2 className="hidden" aria-hidden />
              <Lightbulb className="h-4 w-4 text-primary" aria-hidden />
              <h3 className="font-display text-sm font-bold">Venture stages</h3>
            </div>
            <ul className="space-y-2.5">
              {data.stageSplit.map((s) => {
                const max = Math.max(...data.stageSplit.map((x) => x.count), 1);
                return (
                  <li key={s.stage}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">{s.stage}</span>
                      <span className="text-muted-foreground">{s.count}</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary/60">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${(s.count / max) * 100}%`,
                          background: STAGE_COLORS[s.stage] ?? EMERALD_DIM,
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
