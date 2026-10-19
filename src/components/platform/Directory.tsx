"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Check,
  Clock,
  Handshake,
  Lightbulb,
  MapPin,
  Search,
  SearchX,
  UserPlus,
  Users,
  X,
  Zap,
} from "lucide-react";
import { api } from "@/lib/api";
import { Avatar } from "@/components/shared/Avatar";
import ConnectDialog, { type ConnectTarget } from "@/components/platform/ConnectDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DirectoryMember } from "./types";
import MemberProfileDialog from "./MemberProfileDialog";
import {
  Chip,
  EmptyState,
  SectionHeader,
  splitList,
  staggerContainer,
  staggerItem,
} from "./common";
import { cn } from "@/lib/utils";

export default function Directory() {
  const [members, setMembers] = useState<DirectoryMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [skillFilter, setSkillFilter] = useState<string | null>(null);
  const [chapterFilter, setChapterFilter] = useState<string | null>(null);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [connectTarget, setConnectTarget] = useState<ConnectTarget>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api<{ members: DirectoryMember[] }>("/members");
      setMembers(res.members);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const q = search.trim().toLowerCase();

  // most common skills across the network — quick filter chips
  const topSkills = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of members) {
      for (const s of splitList(m.skills)) counts.set(s, (counts.get(s) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 12)
      .map(([s]) => s);
  }, [members]);

  // chapters (campuses) present on the roll — for the chapter filter
  const chapters = useMemo(
    () =>
      [...new Set(members.map((m) => m.college).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [members]
  );

  const filtered = useMemo(() => {
    let list = members;
    if (availableOnly) {
      list = list.filter((m) => splitList(m.availableFor).length > 0);
    }
    if (skillFilter) {
      list = list.filter((m) => splitList(m.skills).includes(skillFilter));
    }
    if (chapterFilter) {
      list = list.filter((m) => m.college === chapterFilter);
    }
    if (!q) return list;
    return list.filter((m) =>
      [m.name, m.skills, m.college, m.bio, m.roles].some((field) =>
        (field || "").toLowerCase().includes(q)
      )
    );
  }, [members, q, skillFilter, chapterFilter, availableOnly]);

  const availableCount = useMemo(
    () => members.filter((m) => splitList(m.availableFor).length > 0).length,
    [members]
  );

  // note travels with the request via the shared confirmation dialog
  function applyConnectResult(
    m: { id: string },
    result: { matched?: boolean; connectionId?: string }
  ) {
    const status = result.matched ? "ACCEPTED" : "PENDING_OUT";
    setMembers((prev) =>
      prev.map((x) =>
        x.id === m.id
          ? { ...x, connectionStatus: status, connectionId: result.connectionId ?? x.connectionId }
          : x
      )
    );
  }

  async function accept(m: DirectoryMember) {
    if (!m.connectionId) return;
    setBusyId(m.id);
    try {
      await api(`/connections/${m.connectionId}`, {
        method: "PATCH",
        body: { status: "ACCEPTED" },
      });
      setMembers((prev) =>
        prev.map((x) => (x.id === m.id ? { ...x, connectionStatus: "ACCEPTED" } : x))
      );
      toast.success(`Introduced — welcome ${m.name} to your circle`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section aria-label="Membership roll" className="space-y-6">
      <SectionHeader
        title="Members"
        subtitle={`The membership roll — ${members.length} verified builder${members.length === 1 ? "" : "s"} across campuses`}
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative w-full max-w-md">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search the roll — name, craft or campus…"
            className="pl-9"
            aria-label="Search members"
          />
        </div>
        {/* availability quick-toggle */}
        <button
          type="button"
          onClick={() => setAvailableOnly((v) => !v)}
          aria-pressed={availableOnly}
          title="Only show members who listed what they're available for"
          className={cn(
            "inline-flex min-h-[36px] w-fit items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-200",
            availableOnly
              ? "border-primary/50 bg-primary/15 text-primary shadow-[0_0_18px_-6px_oklch(0.84_0.13_85/50%)]"
              : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
          )}
        >
          <Zap className={cn("h-3.5 w-3.5", availableOnly && "fill-current")} aria-hidden />
          Available now
          <span className="text-[10px] opacity-70">{availableCount}</span>
        </button>

        {/* chapter (campus) filter */}
        {chapters.length > 1 ? (
          <div className="flex items-center gap-2 lg:ml-auto">
            <MapPin className="h-3.5 w-3.5 text-gold" aria-hidden />
            <Select
              value={chapterFilter ?? "all"}
              onValueChange={(v) => setChapterFilter(v === "all" ? null : v)}
            >
              <SelectTrigger
                className="h-9 w-[190px] rounded-full border-border/60 bg-card/60 text-xs"
                aria-label="Filter members by chapter"
              >
                <SelectValue placeholder="All chapters" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="all">All chapters ({members.length})</SelectItem>
                {chapters.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      {/* skill quick-filters */}
      {topSkills.length > 0 ? (
        <div
          className="flex flex-wrap items-center gap-1.5"
          role="group"
          aria-label="Filter by skill"
        >
          <span className="mr-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground/70">
            Skills
          </span>
          {topSkills.map((s) => {
            const active = skillFilter === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSkillFilter(active ? null : s)}
                aria-pressed={active}
                className={cn(
                  "inline-flex min-h-[30px] items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-all duration-200",
                  active
                    ? "border-gold/50 bg-gold/15 text-gold"
                    : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
                )}
              >
                {s}
              </button>
            );
          })}
          {skillFilter ? (
            <button
              type="button"
              onClick={() => setSkillFilter(null)}
              className="inline-flex min-h-[30px] items-center gap-1 rounded-full border border-destructive/40 px-3 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              <X className="h-3 w-3" aria-hidden /> Clear
            </button>
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={members.length === 0 ? <Users className="h-6 w-6" aria-hidden /> : <SearchX className="h-6 w-6" aria-hidden />}
          title={members.length === 0 ? "The roll is empty" : "No members match"}
          copy={
            members.length === 0
              ? "The house is just warming up."
              : `Nothing found${skillFilter || availableOnly || chapterFilter ? " with these filters" : ` for “${search}”`}. Try another craft, name or campus.`
          }
          action={
            skillFilter || search || availableOnly || chapterFilter ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSkillFilter(null);
                  setSearch("");
                  setAvailableOnly(false);
                  setChapterFilter(null);
                }}
              >
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <motion.div
          key={`${skillFilter ?? "all"}-${chapterFilter ?? "all"}-${availableOnly ? "avail" : "all"}`}
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
        >
          {filtered.map((m) => (
            <motion.div key={m.id} variants={staggerItem} className="h-full">
              <MemberCard
                member={m}
                busy={busyId === m.id}
                onConnect={() => setConnectTarget({ id: m.id, name: m.name, college: m.college })}
                onAccept={() => accept(m)}
                onViewProfile={() => setProfileId(m.id)}
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* member profile viewer */}
      <MemberProfileDialog
        memberId={profileId}
        onClose={() => setProfileId(null)}
        onConnected={(id, status) =>
          setMembers((prev) => prev.map((x) => (x.id === id ? { ...x, connectionStatus: status } : x)))
        }
      />

      {/* introduction request (with optional note) */}
      <ConnectDialog
        member={connectTarget}
        onClose={() => setConnectTarget(null)}
        onDone={(result) => {
          if (connectTarget) applyConnectResult(connectTarget, result);
        }}
      />
    </section>
  );
}

/* ---------- member card ---------- */

function MemberCard({
  member,
  busy,
  onConnect,
  onAccept,
  onViewProfile,
}: {
  member: DirectoryMember;
  busy: boolean;
  onConnect: () => void;
  onAccept: () => void;
  onViewProfile: () => void;
}) {
  const roles = splitList(member.roles).slice(0, 3);
  const skills = splitList(member.skills).slice(0, 5);
  const availableFor = splitList(member.availableFor);

  return (
    <article className="card-hover card-beam flex h-full flex-col rounded-xl border border-border/60 bg-card/60 p-5">
      <button
        type="button"
        onClick={onViewProfile}
        aria-label={`View ${member.name}'s profile`}
        className="flex w-full items-start gap-3 rounded-lg text-left transition-opacity hover:opacity-80"
      >
        <Avatar name={member.name} size="lg" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-base font-bold">{member.name}</h3>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {member.college}
            {member.gradYear ? ` · ${member.gradYear}` : ""}
          </p>
          {roles.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {roles.map((r) => (
                <Chip key={r} className="border-primary/25 bg-primary/10 text-primary">
                  {r}
                </Chip>
              ))}
            </div>
          ) : null}
        </div>
      </button>

      {member.bio ? (
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{member.bio}</p>
      ) : null}

      {skills.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {skills.map((s) => (
            <Chip key={s}>{s}</Chip>
          ))}
        </div>
      ) : null}

      {availableFor.length > 0 ? (
        <p className="mt-2.5 text-xs text-muted-foreground">
          <span className="text-gold">Open to:</span> {availableFor.join(" · ")}
        </p>
      ) : null}

      <div className="mt-auto space-y-3 pt-4">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lightbulb className="h-3.5 w-3.5 text-gold" aria-hidden />
          <span>
            {member.ideaCount} venture{member.ideaCount === 1 ? "" : "s"}
            {member.ideaTitles.length > 0
              ? ` — ${member.ideaTitles.map((t) => t.title).slice(0, 2).join(", ")}${member.ideaTitles.length > 2 ? "…" : ""}`
              : ""}
          </span>
        </div>

        {member.connectionStatus === "ACCEPTED" ? (
          <Button variant="outline" className="w-full" disabled>
            <Check className="text-emeraldx" aria-hidden /> Introduced
          </Button>
        ) : member.connectionStatus === "PENDING_IN" ? (
          <Button className="w-full" onClick={onAccept} disabled={busy}>
            <Handshake aria-hidden /> Accept introduction
          </Button>
        ) : member.connectionStatus === "PENDING_OUT" ? (
          <Button variant="secondary" className="w-full" disabled>
            <Clock aria-hidden /> Requested
          </Button>
        ) : (
          <Button className="w-full" onClick={onConnect} disabled={busy}>
            <UserPlus aria-hidden /> Request introduction
          </Button>
        )}
      </div>
    </article>
  );
}

/* ---------- loading skeleton ---------- */

function SkeletonCard() {
  return (
    <div className={cn("rounded-xl border border-border/60 bg-card/40 p-5")}>
      <div className="flex items-start gap-3">
        <Skeleton className="h-14 w-14 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mt-2 h-3 w-36" />
          <Skeleton className="mt-2 h-3 w-20" />
        </div>
      </div>
      <Skeleton className="mt-4 h-3 w-full" />
      <Skeleton className="mt-2 h-3 w-4/5" />
      <div className="mt-3 flex gap-1.5">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <Skeleton className="mt-5 h-9 w-full" />
    </div>
  );
}
