"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Bell,
  BellOff,
  BadgeCheck,
  GraduationCap,
  Loader2,
  Mail,
  Plus,
  Save,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  DIGEST_LABELS,
  SKILL_OPTIONS,
  parseNotifPrefs,
  useMemberStore,
  type Me,
  type NotifPrefs,
} from "@/lib/store";
import { Avatar } from "@/components/shared/Avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleChip, splitList } from "./common";
import { cn } from "@/lib/utils";

const ROLE_OPTIONS = ["Founder", "Engineer", "Designer", "Product", "Ops"];
const AVAILABILITY_OPTIONS = [
  "Part-time",
  "Full-time after graduation",
  "Weekends",
  "Remote-friendly",
];
const GRAD_YEARS = ["2024", "2025", "2026", "2027", "2028", "2029", "2030", "2031"];
const DIGEST_ORDER: NotifPrefs["digest"][] = ["instant", "daily", "weekly", "off"];

/** one of the member's own ideas (for the per-idea mute manager) */
type OwnIdea = { id: string; title: string };

export default function ProfileTab() {
  const member = useMemberStore((s) => s.member);
  const setMember = useMemberStore((s) => s.setMember);

  const [name, setName] = useState(member?.name ?? "");
  const [bio, setBio] = useState(member?.bio ?? "");
  const [skills, setSkills] = useState<string[]>(splitList(member?.skills));
  const [roles, setRoles] = useState<string[]>(splitList(member?.roles));
  const [availableFor, setAvailableFor] = useState<string[]>(splitList(member?.availableFor));
  const [gradYear, setGradYear] = useState(member?.gradYear || "2027");
  const [newSkill, setNewSkill] = useState("");
  const [saving, setSaving] = useState(false);

  /* ---------- notification preferences ---------- */
  const [prefs, setPrefs] = useState<NotifPrefs>(() => parseNotifPrefs(member?.notifPrefs));
  const [ownIdeas, setOwnIdeas] = useState<OwnIdea[] | null>(null);
  const [prefsBusy, setPrefsBusy] = useState(false);

  // keep in sync if the member object refreshes
  useEffect(() => {
    if (!member) return;
    setPrefs(parseNotifPrefs(member.notifPrefs));
  }, [member]);

  // the mute manager needs the member's own ideas
  useEffect(() => {
    let active = true;
    api<{ ideas: { id: string; title: string; author: { id: string } }[] }>("/ideas")
      .then((r) => {
        if (!active) return;
        setOwnIdeas(
          r.ideas
            .filter((i) => i.author.id === member?.id)
            .map((i) => ({ id: i.id, title: i.title }))
        );
      })
      .catch(() => {
        /* mute manager is optional — stay silent */
      });
    return () => {
      active = false;
    };
  }, [member?.id]);

  const savePrefs = async (next: NotifPrefs, okMsg: string) => {
    const prev = prefs;
    setPrefs(next); // optimistic
    setPrefsBusy(true);
    try {
      const res = await api<{ member: Me }>("/members/me", {
        method: "PATCH",
        body: { notifPrefs: next },
      });
      setMember(res.member);
      toast.success(okMsg);
    } catch (err) {
      setPrefs(prev); // rollback
      toast.error((err as Error).message);
    } finally {
      setPrefsBusy(false);
    }
  };

  const toggleIdeaMute = (idea: OwnIdea) => {
    const muted = prefs.mutedIdeaIds.includes(idea.id);
    const next: NotifPrefs = {
      ...prefs,
      mutedIdeaIds: muted
        ? prefs.mutedIdeaIds.filter((id) => id !== idea.id)
        : [...prefs.mutedIdeaIds, idea.id],
    };
    savePrefs(next, muted ? `Unmuted “${idea.title}”` : `Muted “${idea.title}” — activity is hidden from your bell`);
  };

  // seed the form ONCE per member identity — not on every `member` object
  // update. (savePrefs() calls setMember() with fresh prefs; re-seeding the
  // whole form on that event used to wipe unsaved profile edits.)
  const seededIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!member) return;
    if (seededIdRef.current === member.id) return;
    seededIdRef.current = member.id;
    setName(member.name);
    setBio(member.bio);
    setSkills(splitList(member.skills));
    setRoles(splitList(member.roles));
    setAvailableFor(splitList(member.availableFor));
    setGradYear(member.gradYear || "2027");
  }, [member]);

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function addSkill() {
    const v = newSkill.trim();
    if (!v) return;
    if (skills.some((s) => s.toLowerCase() === v.toLowerCase())) {
      toast.error("That skill is already on your profile");
      return;
    }
    setSkills((prev) => [...prev, v]);
    setNewSkill("");
  }

  async function save() {
    if (!name.trim()) {
      toast.error("Name can't be empty");
      return;
    }
    setSaving(true);
    try {
      const res = await api<{ member: Me }>("/members/me", {
        method: "PATCH",
        body: {
          name,
          bio,
          skills: skills.join(", "),
          roles: roles.join(", "),
          availableFor: availableFor.join(", "),
          gradYear,
        },
      });
      setMember(res.member);
      toast.success("Profile updated");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const customSkills = skills.filter((s) => !SKILL_OPTIONS.includes(s));

  /* ---------- profile strength ---------- */
  const strength = useMemo(() => {
    const checks = [
      { key: "bio", label: "Write a bio (40+ chars)", done: bio.trim().length >= 40 },
      { key: "skills", label: "Add at least 3 skills", done: skills.length >= 3 },
      { key: "roles", label: "Pick your roles", done: roles.length > 0 },
      { key: "available", label: "Set your availability", done: availableFor.length > 0 },
      { key: "year", label: "Confirm graduation year", done: Boolean(gradYear) },
    ];
    const doneCount = checks.filter((c) => c.done).length;
    return {
      pct: Math.round((doneCount / checks.length) * 100),
      missing: checks.filter((c) => !c.done).map((c) => c.label),
    };
  }, [bio, skills, roles, availableFor, gradYear]);

  return (
    <section aria-label="Profile settings" className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight">Profile</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          This is what fellow members see on the roll. Keep it sharp.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* form */}
        <div className="space-y-6 rounded-xl border border-border/60 bg-card/60 p-5 sm:p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="profile-name">Name</Label>
              <Input
                id="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profile-year">Graduation year</Label>
              <Select value={gradYear} onValueChange={setGradYear}>
                <SelectTrigger id="profile-year" className="w-full">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {GRAD_YEARS.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="profile-bio">Bio</Label>
            <Textarea
              id="profile-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="One or two lines about what you build and what you're after."
              className="min-h-24"
              maxLength={400}
            />
            <p className="text-right text-xs text-muted-foreground">{bio.length}/400</p>
          </div>

          {/* skills */}
          <div className="space-y-2">
            <Label>Skills</Label>
            <div className="flex flex-wrap gap-1.5">
              {SKILL_OPTIONS.map((s) => (
                <ToggleChip
                  key={s}
                  label={s}
                  selected={skills.includes(s)}
                  onToggle={() => toggle(skills, setSkills, s)}
                />
              ))}
            </div>
            {customSkills.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 border-t border-border/40 pt-2">
                {customSkills.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 text-xs text-gold"
                  >
                    {s}
                    <button
                      type="button"
                      aria-label={`Remove ${s}`}
                      onClick={() => setSkills((prev) => prev.filter((x) => x !== s))}
                      className="transition-opacity hover:opacity-70"
                    >
                      <X className="h-3 w-3" aria-hidden />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
            <div className="flex items-center gap-2 pt-1">
              <Input
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSkill();
                  }
                }}
                placeholder="Add a custom skill…"
                className="h-9 flex-1"
                aria-label="Add a custom skill"
              />
              <Button variant="outline" size="sm" onClick={addSkill} className="h-9">
                <Plus aria-hidden /> Add
              </Button>
            </div>
          </div>

          {/* roles */}
          <div className="space-y-2">
            <Label>Roles</Label>
            <div className="flex flex-wrap gap-1.5">
              {ROLE_OPTIONS.map((r) => (
                <ToggleChip
                  key={r}
                  label={r}
                  selected={roles.includes(r)}
                  onToggle={() => toggle(roles, setRoles, r)}
                />
              ))}
            </div>
          </div>

          {/* availability */}
          <div className="space-y-2">
            <Label>Available for</Label>
            <div className="flex flex-wrap gap-1.5">
              {AVAILABILITY_OPTIONS.map((a) => (
                <ToggleChip
                  key={a}
                  label={a}
                  selected={availableFor.includes(a)}
                  onToggle={() => toggle(availableFor, setAvailableFor, a)}
                />
              ))}
            </div>
          </div>

          {/* notification preferences */}
          <div className="space-y-3 rounded-xl border border-border/60 bg-card/40 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" aria-hidden />
                <Label className="text-sm font-semibold">Notifications</Label>
              </div>
              {prefsBusy ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden /> : null}
            </div>

            {/* digest cadence */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {DIGEST_ORDER.map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={prefs.digest === d}
                  onClick={() => prefs.digest !== d && savePrefs({ ...prefs, digest: d }, `Digest set to ${DIGEST_LABELS[d]}`)}
                  className={cn(
                    "min-h-[38px] rounded-lg border px-2 py-1.5 text-xs font-medium transition-all",
                    prefs.digest === d
                      ? "border-primary/50 bg-primary/15 text-primary"
                      : "border-border/60 bg-card/40 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  )}
                >
                  {DIGEST_LABELS[d]}
                </button>
              ))}
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Controls how activity about your ideas reaches you — in-app instantly, batched into a daily/weekly
              summary, or paused entirely.
            </p>

            {/* per-idea mute manager */}
            <div className="space-y-1.5 border-t border-border/40 pt-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Mute a specific venture
              </p>
              {ownIdeas === null ? (
                <div className="space-y-1.5 pt-1">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="h-9 animate-pulse rounded-lg bg-card/50" />
                  ))}
                </div>
              ) : ownIdeas.length === 0 ? (
                <p className="pt-1 text-xs text-muted-foreground">
                  Present a venture first — then you can mute its activity here.
                </p>
              ) : (
                <ul className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
                  {ownIdeas.map((idea) => {
                    const muted = prefs.mutedIdeaIds.includes(idea.id);
                    return (
                      <li key={idea.id}>
                        <button
                          type="button"
                          onClick={() => toggleIdeaMute(idea)}
                          aria-pressed={muted}
                          title={muted ? "Unmute activity" : "Mute activity for this venture"}
                          className={cn(
                            "flex w-full min-h-[38px] items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition-all",
                            muted
                              ? "border-gold/40 bg-gold/[0.07] text-muted-foreground"
                              : "border-border/60 bg-card/40 hover:border-primary/30 hover:bg-primary/5"
                          )}
                        >
                          {muted ? (
                            <BellOff className="h-3.5 w-3.5 shrink-0 text-gold" aria-hidden />
                          ) : (
                            <Bell className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                          )}
                          <span className="min-w-0 flex-1 truncate">{idea.title}</span>
                          <span className={cn("shrink-0 text-[10px] font-semibold uppercase tracking-wider", muted ? "text-gold" : "text-muted-foreground/60")}>
                            {muted ? "Muted" : "On"}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              {prefs.mutedIdeaIds.length > 0 ? (
                <button
                  type="button"
                  onClick={() => savePrefs({ ...prefs, mutedIdeaIds: [] }, "All ideas unmuted")}
                  className="text-[11px] text-muted-foreground underline decoration-dotted underline-offset-2 transition-colors hover:text-foreground"
                >
                  Unmute all ({prefs.mutedIdeaIds.length})
                </button>
              ) : null}
            </div>
          </div>

          <div className="flex justify-end border-t border-border/60 pt-4">
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Saving…
                </>
              ) : (
                <>
                  <Save aria-hidden /> Save profile
                </>
              )}
            </Button>
          </div>
        </div>

        {/* meta card */}
        <aside className="h-fit space-y-5 rounded-xl border border-border/60 bg-card/60 p-5 sm:p-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <Avatar name={member?.name ?? "?"} size="xl" />
            <div>
              <p className="font-display text-lg font-bold">{member?.name}</p>
              <Badge variant="outline" className="mt-1.5 border-gold/40 bg-gold/10 text-gold">
                <BadgeCheck aria-hidden /> Verified member
              </Badge>
            </div>
          </div>

          <div className="space-y-2.5 text-sm">
            <div className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-secondary/40 px-3 py-2.5">
              <Mail className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="truncate text-muted-foreground">{member?.email}</span>
            </div>
            <div className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-secondary/40 px-3 py-2.5">
              <GraduationCap className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="truncate text-muted-foreground">
                {member?.college}
                {member?.gradYear ? ` · ${member.gradYear}` : ""}
              </span>
            </div>
          </div>

          {/* profile strength meter */}
          <div
            className="rounded-lg border border-border/60 bg-secondary/30 px-3 py-3"
            aria-label={`Profile strength ${strength.pct}%`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Profile strength
              </p>
              <p
                className={cn(
                  "font-display text-sm font-bold",
                  strength.pct === 100 ? "text-gold" : "text-primary"
                )}
              >
                {strength.pct}%
              </p>
            </div>
            <div
              role="progressbar"
              aria-valuenow={strength.pct}
              aria-valuemin={0}
              aria-valuemax={100}
              className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-background/70"
            >
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500 ease-out",
                  strength.pct === 100
                    ? "bg-gradient-to-r from-gold to-emerald-400"
                    : "bg-gradient-to-r from-primary/70 to-primary"
                )}
                style={{ width: `${strength.pct}%` }}
              />
            </div>
            {strength.missing.length > 0 ? (
              <ul className="mt-2.5 space-y-1">
                {strength.missing.map((m) => (
                  <li key={m} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="h-1 w-1 rounded-full bg-gold/70" aria-hidden />
                    {m}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs font-medium text-gold">
                All set — you&apos;re easy to find and easy to trust.
              </p>
            )}
          </div>

          <p className="text-xs leading-relaxed text-muted-foreground">
            Email and campus were set with your invitation and can&apos;t be edited. Everything else is
            yours to shape.
          </p>
        </aside>
      </div>
    </section>
  );
}
