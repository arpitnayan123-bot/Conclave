"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Activity, ArrowLeft, BadgeCheck, Check, CheckSquare, Clock, Copy, Download, ExternalLink, Eye, EyeOff,
  FileText, Inbox, Keyboard, Lock, LogOut, Mail, MailCheck, MailOpen, MailPlus, RefreshCcw,
  ScanSearch, ShieldCheck, Square, StickyNote, ThumbsDown, ThumbsUp, X, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Logo } from "@/components/shared/Logo";
import AnalyticsPanel from "./AnalyticsPanel";
import { api, getAdminToken } from "@/lib/api";
import { buildInviteEmail, inviteHtmlTemplate, inviteSubject } from "@/lib/invite-email";
import { initials, avatarGradient } from "@/lib/store";
import { cn } from "@/lib/utils";

/* ---------------------------------- types ---------------------------------- */

type Application = {
  id: string;
  name: string;
  email: string;
  college: string;
  gradYear: string;
  linkedin: string | null;
  ideaTitle: string;
  ideaPitch: string;
  stage: string;
  skills: string;
  lookingFor: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewNote: string | null;
  createdAt: string;
  invite: { id: string; token: string; status: string } | null;
};

type Invite = {
  id: string;
  token: string;
  email: string;
  status: "SENT" | "USED";
  createdAt: string;
  application: { name: string; ideaTitle: string; college: string };
  member: { id: string; name: string; email: string } | null;
};

type MintedInvite = {
  id: string;
  token: string;
  email: string;
  application: { name: string; ideaTitle: string };
};

type BulkResult = { updated: number; invited: number; invites: MintedInvite[] };

/** data package for the branded invite email preview dialog */
type EmailPreview = {
  name: string;
  email: string;
  ideaTitle: string;
  link: string;
  /** render with {{merge_fields}} instead of real values */
  merge?: boolean;
};

const ADMIN_TOKEN_KEY = "conclave-admin-token";

export default function AdminView() {
  // undefined = checking session, null = logged out, string = admin token
  const [token, setToken] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    const t = getAdminToken();
    const probe = t
      ? api<{ valid: boolean }>("/admin/login", { token: t })
      : Promise.resolve({ valid: false });
    probe
      .then((r) => { if (active) setToken(r.valid && t ? t : null); })
      .catch(() => { if (active) setToken(null); });
    return () => { active = false; };
  }, []);

  const logout = () => {
    window.localStorage.removeItem(ADMIN_TOKEN_KEY);
    setToken(null);
  };

  if (token === undefined) {
    return <div className="min-h-svh overflow-x-clip grid place-items-center"><Skeleton className="w-64 h-40 rounded-xl" /></div>;
  }
  if (!token) return <AdminLogin onLogin={setToken} />;
  return <AdminDashboard token={token} onLogout={logout} />;
}

/* ---------------------------------- login ---------------------------------- */

function AdminLogin({ onLogin }: { onLogin: (t: string) => void }) {
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  async function login() {
    setBusy(true);
    try {
      const r = await api<{ token: string }>("/admin/login", { body: { password } });
      window.localStorage.setItem(ADMIN_TOKEN_KEY, r.token);
      onLogin(r.token);
      toast.success("Welcome back, Chair.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-svh overflow-x-clip flex flex-col relative">
      <div className="pointer-events-none absolute inset-0 grid-bg" aria-hidden />
      <header className="sticky top-0 z-40 glass">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Logo />
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
            <a href="#/"><ArrowLeft className="w-4 h-4 mr-1.5" /> Back home</a>
          </Button>
        </div>
      </header>
      <main className="flex-1 grid place-items-center px-4 py-16 relative">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <Card className="glass">
            <CardContent className="p-8 space-y-6 text-center">
              <div className="mx-auto w-16 h-16 rounded-2xl grid place-items-center bg-primary/10 border border-primary/40 glow-emerald">
                <ShieldCheck className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold tracking-tight">The Committee Console</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Committee access only — deliberations in progress.
                </p>
              </div>
              <div className="space-y-2 text-left">
                <Label htmlFor="adminpw">Committee password</Label>
                <div className="relative">
                  <Input
                    id="adminpw" type={show ? "text" : "password"} placeholder="••••••••••"
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && login()} className="pr-10"
                  />
                  <button
                    type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button onClick={login} disabled={busy || !password} className="w-full glow-emerald min-h-[44px]">
                <Lock className="w-4 h-4 mr-1.5" /> {busy ? "Verifying…" : "Unlock console"}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}

/* -------------------------------- dashboard -------------------------------- */

type Tab = "ALL" | "PENDING" | "APPROVED" | "REJECTED" | "INVITES" | "PULSE";

function AdminDashboard({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [apps, setApps] = useState<Application[] | null>(null);
  const [invites, setInvites] = useState<Invite[] | null>(null);
  const [tab, setTab] = useState<Tab>("PULSE");
  const [inviteFor, setInviteFor] = useState<Application | null>(null);
  // bulk selection (pending applications only)
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null);
  // keyboard-driven review mode
  const [hi, setHi] = useState(-1); // highlighted row index into `visible`
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [noteApp, setNoteApp] = useState<Application | null>(null);
  const [noteRejecting, setNoteRejecting] = useState(false);
  const [emailPreview, setEmailPreview] = useState<EmailPreview | null>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const load = useCallback(async () => {
    try {
      const [a, i] = await Promise.all([
        api<{ applications: Application[] }>("/applications", { token }),
        api<{ invites: Invite[] }>("/invites", { token }),
      ]);
      setApps(a.applications);
      setInvites(i.invites);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
      if ((e as Error).message.includes("Unauthorized")) onLogout();
    }
  }, [onLogout, token]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [a, i] = await Promise.all([
          api<{ applications: Application[] }>("/applications", { token }),
          api<{ invites: Invite[] }>("/invites", { token }),
        ]);
        if (!active) return;
        setApps(a.applications);
        setInvites(i.invites);
      } catch (e) {
        if (!active) return;
        const msg = e instanceof Error ? e.message : "Failed to load";
        toast.error(msg);
        if (msg.includes("Unauthorized")) onLogout();
      }
    })();
    return () => { active = false; };
  }, [onLogout, token]);

  const counts = useMemo(() => {
    const base = { ALL: 0, PENDING: 0, APPROVED: 0, REJECTED: 0, INVITES: invites?.length ?? 0 };
    if (!apps) return base;
    for (const a of apps) {
      base.ALL++;
      base[a.status]++;
    }
    return base;
  }, [apps, invites]);

  const visible = useMemo(() => {
    if (!apps) return [];
    return tab === "ALL" || tab === "INVITES" ? apps : apps.filter((a) => a.status === tab);
  }, [apps, tab]);

  const listTab = tab !== "PULSE" && tab !== "INVITES";

  const switchTab = (next: Tab) => {
    setTab(next);
    clearSelection();
    setHi(-1);
    setExpandedId(null);
  };

  // keep the highlighted card in view
  useEffect(() => {
    if (!listTab || hi < 0) return;
    const app = visible[hi];
    if (!app) return;
    itemRefs.current.get(app.id)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [hi, listTab, visible]);

  const updateApp = async (id: string, status: "APPROVED" | "REJECTED" | "PENDING", reviewNote?: string) => {
    try {
      const r = await api<{ application: Application }>(`/applications/${id}`, {
        method: "PATCH", body: { status, reviewNote }, token,
      });
      setApps((prev) => prev?.map((a) => (a.id === id ? r.application : a)) ?? prev);
      toast.success(status === "APPROVED" ? "Petition admitted 🎉" : status === "REJECTED" ? "Petition declined" : "Returned to deliberation");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  const sendInvite = async (app: Application) => {
    try {
      const r = await api<{ invite: Application["invite"] }>("/invites", { body: { applicationId: app.id }, token });
      setInviteFor({ ...app, invite: r.invite ?? null });
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create invite");
    }
  };

  /* ---------- bulk actions ---------- */

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const pendingIds = useMemo(
    () => (apps ?? []).filter((a) => a.status === "PENDING").map((a) => a.id),
    [apps]
  );

  const allPendingSelected = pendingIds.length > 0 && pendingIds.every((id) => selected.has(id));

  const toggleSelectAll = () => {
    setSelected((prev) => (allPendingSelected ? new Set() : new Set(pendingIds)));
  };

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const runBulk = async (action: "APPROVED" | "REJECTED" | "PENDING", createInvites: boolean) => {
    if (selected.size === 0) return;
    setBulkBusy(true);
    try {
      const r = await api<BulkResult>("/applications/bulk", {
        method: "POST",
        body: { ids: [...selected], action, createInvites },
        token,
      });
      setSelected(new Set());
      await load();
      if (action === "APPROVED" && createInvites) {
        setBulkResult(r);
        toast.success(`${r.updated} admitted · ${r.invited} invitation${r.invited === 1 ? "" : "s"} issued`);
      } else if (action === "APPROVED") {
        toast.success(`${r.updated} petition${r.updated === 1 ? "" : "s"} admitted 🎉`);
      } else if (action === "REJECTED") {
        toast.success(`${r.updated} petition${r.updated === 1 ? "" : "s"} declined`);
      } else {
        toast.success(`${r.updated} petition${r.updated === 1 ? "" : "s"} returned to deliberation`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bulk action failed");
    } finally {
      setBulkBusy(false);
    }
  };

  /** one-click path: approve a single application AND mint its invite */
  const approveAndInvite = async (app: Application) => {
    setBulkBusy(true);
    try {
      const r = await api<BulkResult>("/applications/bulk", {
        method: "POST",
        body: { ids: [app.id], action: "APPROVED", createInvites: true },
        token,
      });
      await load();
      if (r.invites.length > 0) {
        setBulkResult(r);
        toast.success(`${app.name} admitted — invitation ready to send`);
      } else {
        // already had an invite — show it through the classic dialog
        toast.success("Petition admitted 🎉");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not approve & invite");
    } finally {
      setBulkBusy(false);
    }
  };

  /** download the full applicant list as CSV */
  const exportCsv = () => {
    if (!apps || apps.length === 0) {
      toast.error("Nothing to export yet");
      return;
    }
    const esc = (v: string | null | undefined) => `"${(v ?? "").replace(/"/g, '""')}"`;
    const header = [
      "Name", "Email", "College", "Grad Year", "Stage", "Skills", "Looking For",
      "Idea Title", "Status", "Review Note", "Invite Status", "Applied At",
    ];
    const rows = apps.map((a) =>
      [
        a.name, a.email, a.college, a.gradYear, a.stage, a.skills, a.lookingFor,
        a.ideaTitle, a.status, a.reviewNote, a.invite?.status ?? "", new Date(a.createdAt).toISOString(),
      ]
        .map(esc)
        .join(",")
    );
    const csv = [header.map(esc).join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `conclave-applicants-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${apps.length} petitioners`);
  };

  /* ---------- keyboard review mode ---------- */

  const keyState = useRef({ visible, listTab, hi, updateApp, sendInvite, approveAndInvite, toggleSelect, setSelected, setHi, setExpandedId, setNoteApp, setNoteRejecting, bulkBusy });
  keyState.current = { visible, listTab, hi, updateApp, sendInvite, approveAndInvite, toggleSelect, setSelected, setHi, setExpandedId, setNoteApp, setNoteRejecting, bulkBusy };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;

      const s = keyState.current;
      const dialogOpen = typeof document !== "undefined" && document.querySelector('[role="dialog"]');

      // ? toggles the cheat-sheet from anywhere (except text fields)
      if (e.key === "?") {
        e.preventDefault();
        setShowHelp((v) => !v);
        return;
      }
      if (!s.listTab || dialogOpen) return;

      const hiApp = s.hi >= 0 && s.hi < s.visible.length ? s.visible[s.hi] : null;
      const needRow = () => {
        toast("Press j / k to highlight a petition first", { icon: "⌨️" });
      };

      switch (e.key) {
        case "j":
        case "ArrowDown": {
          if (s.visible.length === 0) return;
          e.preventDefault();
          s.setHi((h: number) => Math.min(h + 1, s.visible.length - 1));
          break;
        }
        case "k":
        case "ArrowUp": {
          if (s.visible.length === 0) return;
          e.preventDefault();
          s.setHi((h: number) => Math.max(h - 1, 0));
          break;
        }
        case "Enter":
        case "o": {
          if (!hiApp) return;
          e.preventDefault();
          setExpandedId((cur) => (cur === hiApp.id ? null : hiApp.id));
          break;
        }
        case "a": {
          if (!hiApp) { needRow(); return; }
          if (hiApp.status === "APPROVED" || s.bulkBusy) return;
          e.preventDefault();
          s.updateApp(hiApp.id, "APPROVED");
          break;
        }
        case "r": {
          if (!hiApp) { needRow(); return; }
          if (hiApp.status === "REJECTED" || s.bulkBusy) return;
          e.preventDefault();
          s.setNoteApp(hiApp);
          s.setNoteRejecting(true);
          break;
        }
        case "i": {
          if (!hiApp) { needRow(); return; }
          if (s.bulkBusy) return;
          e.preventDefault();
          if (hiApp.status !== "APPROVED") {
            toast.error("Only admitted petitions can be invited — press a first");
          } else if (hiApp.invite) {
            setInviteFor(hiApp);
          } else {
            s.sendInvite(hiApp);
          }
          break;
        }
        case "e": {
          // one-key "get them in": approve + mint invite, or open the existing invite
          if (!hiApp) { needRow(); return; }
          if (s.bulkBusy) return;
          e.preventDefault();
          if (hiApp.status === "REJECTED") {
            toast.error("This petitioner was declined — return them to deliberation first");
          } else if (hiApp.status === "APPROVED" && hiApp.invite) {
            setInviteFor(hiApp);
          } else if (hiApp.status === "APPROVED") {
            s.sendInvite(hiApp);
          } else {
            s.approveAndInvite(hiApp);
          }
          break;
        }
        case "p": {
          // jump the highlight to the next pending application (wraps around)
          if (s.visible.length === 0) return;
          e.preventDefault();
          const pendingIdx: number[] = [];
          s.visible.forEach((a: Application, idx: number) => {
            if (a.status === "PENDING") pendingIdx.push(idx);
          });
          if (pendingIdx.length === 0) {
            toast("No pending petitions in this view", { icon: "⌨️" });
            return;
          }
          const start = s.hi + 1;
          const next =
            pendingIdx.find((idx) => idx >= start) ?? pendingIdx[0];
          s.setHi(next);
          break;
        }
        case "x": {
          if (!hiApp) { needRow(); return; }
          if (hiApp.status !== "PENDING") return;
          e.preventDefault();
          s.toggleSelect(hiApp.id);
          break;
        }
        case "Escape": {
          setExpandedId(null);
          s.setHi(-1);
          break;
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "PULSE", label: "Pulse", icon: <Activity className="w-4 h-4" /> },
    { key: "PENDING", label: "Petitions", icon: <Inbox className="w-4 h-4" /> },
    { key: "APPROVED", label: "Admitted", icon: <ThumbsUp className="w-4 h-4" /> },
    { key: "REJECTED", label: "Declined", icon: <ThumbsDown className="w-4 h-4" /> },
    { key: "ALL", label: "All", icon: <FileText className="w-4 h-4" /> },
    { key: "INVITES", label: "Invitations", icon: <MailCheck className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-svh overflow-x-clip flex flex-col">
      <header className="sticky top-0 z-40 glass">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Logo compact />
            <div className="leading-tight">
              <p className="font-display font-bold text-sm">Committee Console</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">The Conclave Committee</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={exportCsv} aria-label="Export applicants as CSV" title="Export applicants as CSV">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline ml-1.5">Export</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={load} aria-label="Refresh">
              <RefreshCcw className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground hidden sm:inline-flex">
              <a href="#/"><ArrowLeft className="w-4 h-4 mr-1.5" /> Site</a>
            </Button>
            <Button variant="outline" size="sm" onClick={onLogout} className="border-border">
              <LogOut className="w-4 h-4 mr-1.5" /> Exit
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Pending petitions", value: counts.PENDING, tone: "text-gold", icon: Inbox },
            { label: "Admitted", value: counts.APPROVED, tone: "text-primary", icon: ThumbsUp },
            { label: "Declined", value: counts.REJECTED, tone: "text-destructive", icon: ThumbsDown },
            { label: "Invitations sent", value: counts.INVITES, tone: "text-primary", icon: MailCheck },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <Card className="glass card-hover">
                <CardContent className="p-4 flex items-center gap-3">
                  <span className={cn("w-9 h-9 rounded-lg grid place-items-center bg-card/70 border border-border", s.tone)}>
                    <s.icon className="w-4 h-4" />
                  </span>
                  <div>
                    <p className="text-2xl font-display font-bold leading-none">{apps ? s.value : "—"}</p>
                    <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* tabs */}
        <nav aria-label="Review tabs" className="flex gap-1.5 overflow-x-auto pb-4 -mt-2 mb-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => switchTab(t.key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm border whitespace-nowrap transition-all min-h-[40px]",
                tab === t.key
                  ? "bg-primary/15 border-primary/50 text-primary"
                  : "bg-card/40 border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
              )}
            >
              {t.icon} {t.label}
              {t.key !== "PULSE" ? <span className="text-xs opacity-70">({counts[t.key]})</span> : null}
            </button>
          ))}
        </nav>

        {/* keyboard hint bar (list tabs, desktop) */}
        {listTab && visible.length > 0 ? (
          <div className="hidden md:flex flex-wrap items-center gap-x-3 gap-y-1.5 mb-4 -mt-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span className="kbd">j</span><span className="kbd">k</span> navigate
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="kbd">↵</span> expand
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="kbd">a</span> admit
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="kbd">r</span> decline
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="kbd">i</span> invite
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="kbd">e</span> admit + invite
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="kbd">p</span> next petition
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="kbd">x</span> select
            </span>
            <button
              type="button"
              onClick={() => setShowHelp(true)}
              className="inline-flex items-center gap-1 underline decoration-dotted underline-offset-4 transition-colors hover:text-foreground"
            >
              <span className="kbd">?</span> all shortcuts
            </button>
          </div>
        ) : null}

        {/* select-all row (queue only) */}
        {tab === "PENDING" && pendingIds.length > 0 ? (
          <div className="flex items-center gap-3 mb-4 -mt-1">
            <button
              type="button"
              onClick={toggleSelectAll}
              aria-pressed={allPendingSelected}
              className={cn(
                "inline-flex min-h-[32px] items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-all",
                allPendingSelected
                  ? "border-gold/50 bg-gold/10 text-gold"
                  : "border-border/60 text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              {allPendingSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
              {allPendingSelected ? "Unselect all" : `Select all ${pendingIds.length} pending petitions`}
            </button>
            <span className="text-xs text-muted-foreground">
              Tip: select several, then admit &amp; invite the whole batch in one click.
            </span>
          </div>
        ) : null}

        {tab === "PULSE" ? (
          <AnalyticsPanel token={token} />
        ) : tab === "INVITES" ? (
          <InvitesPanel invites={invites} />
        ) : !apps ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}</div>
        ) : visible.length === 0 ? (
          <div className="text-center py-20">
            <ScanSearch className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Nothing here yet — the docket is clear.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {visible.map((a, i) => (
              <div
                key={a.id}
                ref={(el) => {
                  if (el) itemRefs.current.set(a.id, el);
                  else itemRefs.current.delete(a.id);
                }}
              >
                <AppCard
                  app={a}
                  index={i}
                  onStatus={updateApp}
                  onInvite={() => sendInvite(a)}
                  selectable={a.status === "PENDING"}
                  selected={selected.has(a.id)}
                  onToggleSelect={() => toggleSelect(a.id)}
                  onApproveAndInvite={() => approveAndInvite(a)}
                  bulkBusy={bulkBusy}
                  highlighted={hi === i}
                  expanded={expandedId === a.id}
                  onToggleExpanded={() => setExpandedId((cur) => (cur === a.id ? null : a.id))}
                  onReject={(app) => { setNoteApp(app); setNoteRejecting(true); }}
                  onNote={(app) => { setNoteApp(app); setNoteRejecting(false); }}
                />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* sticky bulk action bar */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 32 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[min(94vw,720px)]"
            role="toolbar"
            aria-label="Bulk actions"
          >
            <div className="glass glow-emerald rounded-2xl border border-primary/30 shadow-2xl px-4 py-3 flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary mr-1">
                <CheckSquare className="w-4 h-4" aria-hidden />
                {selected.size} selected
              </span>
              <div className="flex-1" />
              <Button
                size="sm"
                disabled={bulkBusy}
                onClick={() => runBulk("APPROVED", true)}
                className="min-h-[40px]"
                title="Admit all selected and issue their invitation links"
              >
                {bulkBusy ? <RefreshCcw className="w-4 h-4 mr-1.5 animate-spin" /> : <Zap className="w-4 h-4 mr-1.5" />}
                Admit &amp; invite
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={bulkBusy}
                onClick={() => runBulk("APPROVED", false)}
                className="border-primary/40 text-primary hover:bg-primary/10 min-h-[40px]"
              >
                <ThumbsUp className="w-4 h-4 mr-1.5" /> Admit only
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={bulkBusy}
                onClick={() => runBulk("REJECTED", false)}
                className="border-destructive/40 text-destructive hover:bg-destructive/10 min-h-[40px]"
              >
                <ThumbsDown className="w-4 h-4 mr-1.5" /> Decline
              </Button>
              <Button size="sm" variant="ghost" disabled={bulkBusy} onClick={clearSelection} className="text-muted-foreground min-h-[40px]">
                <X className="w-4 h-4" />
                <span className="sr-only">Clear selection</span>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <InviteDialog app={inviteFor} onClose={() => setInviteFor(null)} onPreview={setEmailPreview} />
      <BulkInviteDialog result={bulkResult} onClose={() => setBulkResult(null)} onPreview={setEmailPreview} />

      {/* shared review-note dialog (reject presets + plain notes) — remounts per app to re-seed the draft */}
      <NoteDialog
        key={noteApp?.id ?? "none"}
        app={noteApp}
        rejecting={noteRejecting}
        onClose={() => setNoteApp(null)}
        onConfirm={(status, note) => {
          if (noteApp) updateApp(noteApp.id, status, note);
          setNoteApp(null);
        }}
      />

      {/* keyboard cheat sheet */}
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent aria-describedby={undefined} className="glass max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="w-5 h-5 text-primary" /> Review shortcuts
            </DialogTitle>
          </DialogHeader>
          <ul className="space-y-2.5 text-sm">
            {[
              { keys: ["j", "k"], label: "Move highlight down / up the docket" },
              { keys: ["↵"], label: "Expand or collapse the highlighted petition" },
              { keys: ["a"], label: "Admit the highlighted petition" },
              { keys: ["r"], label: "Decline with a note (opens the note dialog)" },
              { keys: ["i"], label: "Send or view the invitation (admitted only)" },
              { keys: ["e"], label: "One-key admit: admit + invite (or open the invitation)" },
              { keys: ["p"], label: "Jump the highlight to the next pending petition" },
              { keys: ["x"], label: "Toggle bulk selection (pending only)" },
              { keys: ["Esc"], label: "Clear highlight and collapse" },
              { keys: ["?"], label: "Show or hide this cheat sheet" },
            ].map((row) => (
              <li key={row.label} className="flex items-center gap-3">
                <span className="flex gap-1 w-20 shrink-0">
                  {row.keys.map((k) => <span key={k} className="kbd">{k}</span>)}
                </span>
                <span className="text-muted-foreground">{row.label}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Shortcuts work on the list tabs while no dialog is open — they never trigger while typing.
          </p>
        </DialogContent>
      </Dialog>

      {/* branded email preview */}
      <EmailPreviewDialog preview={emailPreview} onClose={() => setEmailPreview(null)} />
    </div>
  );
}

/* ------------------------------ application card ---------------------------- */

/** one-tap reject reasons for consistent, useful review notes */
const REJECT_PRESETS = [
  "No evidence of building — talks about the idea, hasn't started",
  "Not a startup thesis — services/freelance framing, no leverage",
  "Pitch too thin — no users, no prototype, no clear wedge",
  "Opportunity-seeking rather than builder mindset",
  "Doesn't meet the bar right now — encourage resubmission with traction",
];

const APPROVE_PRESETS = [
  "Strong builder evidence — already shipped something real",
  "Clear wedge with early traction (users or working prototype)",
  "Exceptional technical depth on a hard problem",
  "Great co-founder fit for the current network mix",
  "Strong ownership signal — built outside coursework",
];

/** relative time an application has been waiting — SLA signal for the review queue */
function waitingLabel(iso: string): { label: string; stale: boolean } {
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.floor(ms / 3600000);
  if (h < 1) return { label: "just in", stale: false };
  if (h < 24) return { label: `${h}h waiting`, stale: false };
  const d = Math.floor(h / 24);
  return { label: `${d}d waiting`, stale: d >= 5 };
}

function AppCard({
  app, index, onStatus, onInvite, selectable, selected, onToggleSelect, onApproveAndInvite, bulkBusy,
  highlighted, expanded, onToggleExpanded, onReject, onNote,
}: {
  app: Application;
  index: number;
  onStatus: (id: string, s: "APPROVED" | "REJECTED" | "PENDING", note?: string) => void;
  onInvite: () => void;
  selectable: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onApproveAndInvite: () => void;
  bulkBusy: boolean;
  /** keyboard-cursor highlight (gold ring, distinct from the emerald bulk-select ring) */
  highlighted: boolean;
  expanded: boolean;
  onToggleExpanded: () => void;
  onReject: (app: Application) => void;
  onNote: (app: Application) => void;
}) {
  const waiting = app.status === "PENDING" ? waitingLabel(app.createdAt) : null;
  const statusBadge =
    app.status === "APPROVED" ? (
      <Badge className="bg-emeraldx/15 text-emeraldx border-emeraldx/40 gap-1"><ThumbsUp className="w-3 h-3" /> Admitted</Badge>
    ) : app.status === "REJECTED" ? (
      <Badge variant="outline" className="text-destructive border-destructive/40 gap-1"><ThumbsDown className="w-3 h-3" /> Declined</Badge>
    ) : (
      <Badge variant="outline" className="text-gold border-gold/40 gap-1"><Inbox className="w-3 h-3" /> With the committee</Badge>
    );

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.05, 0.4) }}>
      <Card
        className={cn(
          "glass card-hover transition-all duration-300",
          app.status === "PENDING" && "border-gold/20",
          selected && "border-primary/60 bg-primary/[0.06] ring-1 ring-primary/30",
          highlighted && "border-gold/60 ring-2 ring-gold/50 shadow-[0_0_36px_-6px_oklch(0.83_0.13_85/35%)]"
        )}
      >
        <CardContent className="p-0 relative">
          {/* keyboard cursor marker */}
          {highlighted ? (
            <span
              aria-hidden
              className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full bg-gradient-to-b from-gold to-primary"
            />
          ) : null}
          <div className="flex items-stretch">
            {/* selection checkbox (pending only) — outside the expand button */}
            {selectable ? (
              <label
                className="flex cursor-pointer items-center pl-3 sm:pl-4 select-none"
                onClick={(e) => e.stopPropagation()}
                aria-label={`Select ${app.name}'s application`}
              >
                <Checkbox
                  checked={selected}
                  onCheckedChange={() => onToggleSelect()}
                  className="h-5 w-5 rounded-md border-border data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                  aria-label={`Select ${app.name}'s application`}
                />
              </label>
            ) : null}
            <button
              className="w-full text-left p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 cursor-pointer flex-1 min-w-0"
              onClick={onToggleExpanded}
              aria-expanded={expanded}
            >
            <span
              className="w-11 h-11 rounded-full grid place-items-center font-semibold text-white shrink-0 ring-1 ring-white/15"
              style={{ background: avatarGradient(app.name) }}
              aria-hidden
            >
              {initials(app.name)}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold truncate">{app.name}</p>
                <span className="text-xs text-muted-foreground truncate">{app.email}</span>
              </div>
              <p className="text-sm text-primary/90 font-medium truncate mt-0.5">{app.ideaTitle}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {app.college} · {app.gradYear} · {new Date(app.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {waiting ? (
                <Badge
                  variant="outline"
                  title={`Submitted ${new Date(app.createdAt).toLocaleString("en-IN")}`}
                  className={cn(
                    "gap-1 whitespace-nowrap",
                    waiting.stale
                      ? "border-destructive/40 text-destructive animate-pulse"
                      : "border-gold/30 text-gold/90"
                  )}
                >
                  <Clock className="w-3 h-3" aria-hidden />
                  {waiting.label}
                </Badge>
              ) : null}
              {statusBadge}
              {expanded ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
            </div>
          </button>
          </div>

          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              className="overflow-hidden"
            >
              <div className="px-4 sm:px-5 pb-5 pt-1 border-t border-border/50 space-y-4">
                <div className="pt-4 grid sm:grid-cols-2 gap-3 text-sm">
                  <Detail label="Email"><a className="text-primary hover:underline" href={`mailto:${app.email}`}>{app.email}</a></Detail>
                  <Detail label="Stage">{app.stage}</Detail>
                  <Detail label="Campus / Year">{app.college} · {app.gradYear}</Detail>
                  <Detail label="LinkedIn">
                    {app.linkedin && /^https?:\/\//i.test(app.linkedin) ? (
                      <a className="text-primary hover:underline inline-flex items-center gap-1" href={app.linkedin} target="_blank" rel="noreferrer">
                        {app.linkedin.slice(0, 40)} <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : app.linkedin ? (
                      <span className="text-muted-foreground">{app.linkedin.slice(0, 40)}</span>
                    ) : "—"}
                  </Detail>
                  <div className="sm:col-span-2">
                    <Detail label="Skills">
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {app.skills.split(",").map((s) => s.trim()).filter(Boolean).map((s) => (
                          <Badge key={s} variant="secondary" className="text-[11px]">{s}</Badge>
                        ))}
                      </div>
                    </Detail>
                  </div>
                  <div className="sm:col-span-2">
                    <Detail label="Looking for">
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {app.lookingFor.split(",").map((s) => s.trim()).filter(Boolean).map((s) => (
                          <Badge key={s} variant="outline" className="text-[11px] border-gold/40 text-gold">{s}</Badge>
                        ))}
                        {!app.lookingFor && <span className="text-muted-foreground">—</span>}
                      </div>
                    </Detail>
                  </div>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">The pitch</p>
                  <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap bg-card/40 rounded-lg border border-border/50 p-4 max-h-56 overflow-y-auto">
                    {app.ideaPitch}
                  </p>
                </div>

                {app.reviewNote && (
                  <p className="text-xs text-muted-foreground italic">Review note: {app.reviewNote}</p>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  {app.status === "PENDING" && (
                    <Button size="sm" disabled={bulkBusy} onClick={onApproveAndInvite} className="min-h-[40px] border-gold/50 text-gold bg-gold/10 hover:bg-gold/20" variant="outline" title="Admit and issue the invitation link in one step">
                      <Zap className="w-4 h-4 mr-1.5" /> Admit &amp; invite
                    </Button>
                  )}
                  {app.status !== "APPROVED" && (
                    <Button size="sm" onClick={() => onStatus(app.id, "APPROVED")} className="min-h-[40px]">
                      <ThumbsUp className="w-4 h-4 mr-1.5" /> Admit
                    </Button>
                  )}
                  {app.status !== "REJECTED" && (
                    <Button size="sm" variant="outline" className="border-destructive/40 text-destructive min-h-[40px]"
                      onClick={() => onReject(app)}>
                      <ThumbsDown className="w-4 h-4 mr-1.5" /> Decline
                    </Button>
                  )}
                  {app.status !== "PENDING" && (
                    <Button size="sm" variant="ghost" className="text-muted-foreground min-h-[40px]"
                      onClick={() => onStatus(app.id, "PENDING")}>
                      <X className="w-4 h-4 mr-1.5" /> Return to deliberation
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="text-muted-foreground min-h-[40px]" onClick={() => onNote(app)} title="Write an internal review note">
                    <StickyNote className="w-4 h-4 mr-1.5" /> Note
                  </Button>
                  {app.status === "APPROVED" && (
                    app.invite ? (
                      <Button size="sm" variant="secondary" className="min-h-[40px]" onClick={onInvite}>
                        <MailCheck className="w-4 h-4 mr-1.5" /> View invitation
                      </Button>
                    ) : (
                      <Button size="sm" variant="secondary" onClick={onInvite} className="border-gold/50 text-gold bg-gold/10 hover:bg-gold/20 min-h-[40px]">
                        <MailPlus className="w-4 h-4 mr-1.5" /> Send invitation to Gmail
                      </Button>
                    )
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

/** shared review-note dialog — reject with presets, or a plain internal note.
 *  Remounts per application (parent passes key={app.id}) so the draft re-seeds from reviewNote. */
function NoteDialog({
  app, rejecting, onClose, onConfirm,
}: {
  app: Application | null;
  rejecting: boolean;
  onClose: () => void;
  onConfirm: (status: "APPROVED" | "REJECTED" | "PENDING", note: string) => void;
}) {
  const [note, setNote] = useState(app?.reviewNote || "");

  return (
    <Dialog open={!!app} onOpenChange={(o) => !o && onClose()}>
      <DialogContent aria-describedby={undefined} className="glass max-w-md">
        <DialogHeader>
          <DialogTitle>{rejecting ? `Decline ${app?.name}'s petition` : `Review note — ${app?.name}`}</DialogTitle>
        </DialogHeader>
        {rejecting ? (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Quick reasons (taps append to the note):</p>
            <div className="flex flex-wrap gap-1.5">
              {REJECT_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setNote((n) => (n.trim() ? `${n.trim().replace(/\.$/, "")}. ${preset}` : preset))}
                  className="inline-flex min-h-[28px] items-center rounded-full border border-border/60 bg-card/40 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Why they&apos;re admitted (taps append to the note, kept internal):</p>
            <div className="flex flex-wrap gap-1.5">
              {APPROVE_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setNote((n) => (n.trim() ? `${n.trim().replace(/\.$/, "")}. ${preset}` : preset))}
                  className="inline-flex min-h-[28px] items-center rounded-full border border-border/60 bg-card/40 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        )}
        <Textarea
          rows={3} value={note} onChange={(e) => setNote(e.target.value)}
          placeholder={rejecting ? "Why isn't this the right fit? (kept internal)" : "Internal note — e.g. why you approved, what impressed you…"}
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant={rejecting ? "destructive" : "default"}
            onClick={() => {
              if (!app) return;
              // reject flow flips status; note-only flow keeps the current status
              onConfirm(rejecting ? "REJECTED" : app.status, note);
            }}
          >
            Confirm {rejecting ? "decline" : "save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
      <div className="text-sm">{children}</div>
    </div>
  );
}

/* --------------------------------- invites --------------------------------- */

function InvitesPanel({ invites }: { invites: Invite[] | null }) {
  const [preview, setPreview] = useState<EmailPreview | null>(null);
  if (!invites) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>;
  if (invites.length === 0)
    return (
      <div className="text-center py-20">
        <MailCheck className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">No invitations sent yet. Admit a petition first.</p>
      </div>
    );
  return (
    <div className="space-y-3">
      {invites.map((inv) => (
        <Card key={inv.id} className="glass">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <BadgeCheck className={cn("w-5 h-5 shrink-0", inv.status === "USED" ? "text-primary" : "text-gold")} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {inv.application.name} <span className="text-muted-foreground font-normal">· {inv.application.ideaTitle}</span>
              </p>
              <p className="text-xs text-muted-foreground font-mono truncate">{inv.email} → {inv.token}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={inv.status === "USED" ? "border-emeraldx/50 text-emeraldx" : "border-gold/40 text-gold"}>
                {inv.status === "USED" ? "Seated" : "Sent"}
              </Badge>
              <Button
                size="sm" variant="ghost"
                onClick={() => setPreview({
                  name: inv.application.name,
                  email: inv.email,
                  ideaTitle: inv.application.ideaTitle,
                  link: `${window.location.origin}/#/join?token=${inv.token}`,
                })}
                aria-label={`Preview invite email for ${inv.application.name}`}
                title="Preview the branded invite email"
              >
                <MailOpen className="w-4 h-4" />
              </Button>
              <Button
                size="sm" variant="ghost"
                onClick={() => {
                  const link = `${window.location.origin}/#/join?token=${inv.token}`;
                  navigator.clipboard.writeText(link);
                  toast.success("Invitation link copied");
                }}
                aria-label="Copy invite link"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
      <EmailPreviewDialog preview={preview} onClose={() => setPreview(null)} />
    </div>
  );
}

/* ------------------------------- invite dialog ------------------------------ */

function InviteDialog({ app, onClose, onPreview }: { app: Application | null; onClose: () => void; onPreview: (p: EmailPreview) => void }) {
  const token = app?.invite?.token || "";
  const link = token && typeof window !== "undefined" ? `${window.location.origin}/#/join?token=${token}` : "";
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const copied = copiedToken === token;

  const subject = encodeURIComponent("You're invited to Conclave — the private founders' club");
  const body = encodeURIComponent(
    `Hi ${app?.name || ""},\n\nCongratulations! Your petition "${app?.ideaTitle || ""}" has been selected by the committee.\n\nClaim your seat at the private club with your personal invitation link:\n${link}\n\nYour link is tied to this Gmail address (${app?.email || ""}) and can be used once.\n\nSee you inside,\nThe Committee, Conclave`
  );

  return (
    <Dialog open={!!app} onOpenChange={(o) => !o && onClose()}>
      <DialogContent aria-describedby={undefined} className="glass max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MailCheck className="w-5 h-5 text-primary" /> Extend an invitation to {app?.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
            <p className="text-xs uppercase tracking-wider text-primary font-semibold">Email preview</p>
            <div className="text-sm space-y-1.5">
              <p><span className="text-muted-foreground">To:</span> {app?.email}</p>
              <p><span className="text-muted-foreground">Subject:</span> You&apos;re invited to Conclave — the private founders&apos; club</p>
              <hr className="border-border/60" />
              <p className="text-muted-foreground">
                Congratulations! Your petition <span className="text-foreground">&ldquo;{app?.ideaTitle}&rdquo;</span> has been selected by the committee. Claim your seat with your personal link:
              </p>
              <p className="font-mono text-xs bg-card/60 border border-border rounded-lg p-3 break-all select-all">{link}</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full min-h-[40px] border-primary/40 text-primary hover:bg-primary/10"
            onClick={() => app && onPreview({ name: app.name, email: app.email, ideaTitle: app.ideaTitle, link })}
          >
            <MailOpen className="w-4 h-4 mr-1.5" /> Open branded email preview
          </Button>
          <div className="grid sm:grid-cols-3 gap-2">
            <Button
              className="sm:col-span-2 glow-emerald min-h-[44px]"
              onClick={() => {
                navigator.clipboard.writeText(link);
                setCopiedToken(token);
                toast.success("Invitation link copied — paste it into their Gmail thread");
              }}
            >
              {copied ? <Check className="w-4 h-4 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
              {copied ? "Copied!" : "Copy invitation link"}
            </Button>
            <Button variant="outline" asChild className="min-h-[44px]">
              <a href={`mailto:${app?.email}?subject=${subject}&body=${body}`} target="_blank" rel="noreferrer">
                <Mail className="w-4 h-4 mr-1.5" /> Open Gmail
              </a>
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Each link is single-use and locked to the petitioner&apos;s Gmail. Status auto-updates to “Seated” once they claim their seat.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------- bulk invite result ----------------------------- */

function BulkInviteDialog({ result, onClose, onPreview }: { result: BulkResult | null; onClose: () => void; onPreview: (p: EmailPreview) => void }) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const invites = result?.invites ?? [];

  const linkFor = (t: string) => (typeof window !== "undefined" ? `${window.location.origin}/#/join?token=${t}` : "");

  const copyAll = () => {
    const text = invites
      .map((i) => `${i.application.name} (${i.email}): ${linkFor(i.token)}`)
      .join("\n");
    navigator.clipboard.writeText(text);
    toast.success(`${invites.length} invite links copied — one per line`);
  };

  return (
    <Dialog open={!!result} onOpenChange={(o) => !o && onClose()}>
      <DialogContent aria-describedby={undefined} className="glass max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MailCheck className="w-5 h-5 text-primary" />
            {invites.length > 0 ? `${invites.length} invitation${invites.length === 1 ? "" : "s"} ready` : "Batch complete"}
          </DialogTitle>
        </DialogHeader>
        {invites.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Admitted without new invitations (they already had one). Find the links under the Invitations tab.
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {result?.updated} petition{result?.updated === 1 ? "" : "s"} admitted. Copy each personal link into the
              petitioner&apos;s Gmail thread.
            </p>
            <ul className="space-y-2 max-h-72 overflow-y-auto pr-1 nice-scroll">
              {invites.map((i, idx) => (
                <li key={i.id} className="rounded-xl border border-border/60 bg-card/40 p-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">
                      {i.application.name}
                      <span className="ml-1.5 font-normal text-muted-foreground text-xs">· {i.application.ideaTitle}</span>
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0 h-8 px-2"
                      onClick={() => {
                        navigator.clipboard.writeText(linkFor(i.token));
                        setCopiedIdx(idx);
                        toast.success(`Link for ${i.application.name} copied`);
                      }}
                      aria-label={`Copy invite link for ${i.application.name}`}
                    >
                      {copiedIdx === idx ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                  <p className="font-mono text-[11px] text-muted-foreground break-all select-all">{linkFor(i.token)}</p>
                </li>
              ))}
            </ul>
            <Button onClick={copyAll} className="w-full glow-emerald min-h-[44px]">
              <Copy className="w-4 h-4 mr-1.5" /> Copy all {invites.length} link{invites.length === 1 ? "" : "s"}
            </Button>
            <Button
              variant="outline"
              className="w-full min-h-[40px] border-primary/40 text-primary hover:bg-primary/10"
              onClick={() => {
                const first = invites[0];
                onPreview({
                  name: first.application.name,
                  email: first.email,
                  ideaTitle: first.application.ideaTitle,
                  link: linkFor(first.token),
                  merge: true,
                });
              }}
            >
              <MailOpen className="w-4 h-4 mr-1.5" /> Preview email template &amp; copy HTML
            </Button>
            <p className="text-[11px] text-muted-foreground">
              Tip: paste the whole batch into your mail-merge tool — each line is “Name (email): link”. The branded
              template swaps <span className="font-mono">{'{{first_name}}'}</span>, <span className="font-mono">{'{{idea_title}}'}</span>,{" "}
              <span className="font-mono">{'{{email}}'}</span> and <span className="font-mono">{'{{invite_link}}'}</span>.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------- branded email preview --------------------------- */

function EmailPreviewDialog({ preview, onClose }: { preview: EmailPreview | null; onClose: () => void }) {
  const mail = preview && !preview.merge
    ? buildInviteEmail(preview)
    : null;
  const html = preview?.merge ? inviteHtmlTemplate() : mail?.html ?? "";
  const subject = mail ? mail.subject : inviteSubject({ name: "x", ideaTitle: "x", email: "x", link: "x" });
  const text = mail?.text ?? "";

  const mailto = preview && !preview.merge
    ? `mailto:${preview.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`
    : "#";

  return (
    <Dialog open={!!preview} onOpenChange={(o) => !o && onClose()}>
      <DialogContent aria-describedby={undefined} className="glass max-w-xl max-h-[88vh] overflow-y-auto nice-scroll">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MailOpen className="w-5 h-5 text-primary" />
            Branded invitation email{preview?.merge ? " — merge template" : ""}
          </DialogTitle>
        </DialogHeader>
        {preview ? (
          <div className="space-y-3">
            {/* inbox chrome */}
            <div className="overflow-hidden rounded-xl border border-border/70">
              <div className="space-y-1 border-b border-border/60 bg-card/80 px-4 py-3 text-xs">
                <p className="flex gap-2">
                  <span className="w-12 shrink-0 text-muted-foreground">From</span>
                  <span>The Conclave Committee &lt;invites@conclave.club&gt;</span>
                </p>
                <p className="flex gap-2">
                  <span className="w-12 shrink-0 text-muted-foreground">To</span>
                  <span className="truncate">{preview.merge ? "{{email}}" : preview.email}</span>
                </p>
                <p className="flex gap-2">
                  <span className="w-12 shrink-0 text-muted-foreground">Subject</span>
                  <span className="font-medium">{subject}</span>
                </p>
              </div>
              {/* the email itself renders on its own dark obsidian background */}
              <div className="bg-[#0b1512]">
                <div dangerouslySetInnerHTML={{ __html: html }} />
              </div>
            </div>

            {preview.merge ? (
              <p className="text-[11px] text-muted-foreground">
                Preview uses the first recipient as sample data. Copy the HTML below and your mail-merge tool swaps{" "}
                <span className="font-mono text-foreground/80">{"{{first_name}}"}</span>,{" "}
                <span className="font-mono text-foreground/80">{"{{idea_title}}"}</span>,{" "}
                <span className="font-mono text-foreground/80">{"{{email}}"}</span> and{" "}
                <span className="font-mono text-foreground/80">{"{{invite_link}}"}</span> per row.
              </p>
            ) : null}

            <div className="grid sm:grid-cols-3 gap-2">
              <Button
                className="glow-emerald min-h-[42px]"
                onClick={() => {
                  navigator.clipboard.writeText(html);
                  toast.success("Email HTML copied — paste into your mail-merge tool");
                }}
              >
                <Copy className="w-4 h-4 mr-1.5" /> Copy HTML
              </Button>
              <Button
                variant="outline"
                className="min-h-[42px]"
                disabled={preview.merge}
                onClick={() => {
                  navigator.clipboard.writeText(text);
                  toast.success("Plain-text version copied");
                }}
              >
                <FileText className="w-4 h-4 mr-1.5" /> Copy text
              </Button>
              <Button variant="outline" asChild className="min-h-[42px]" disabled={preview.merge}>
                <a href={mailto} target="_blank" rel="noreferrer">
                  <Mail className="w-4 h-4 mr-1.5" /> Open Gmail
                </a>
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              The HTML is table-based with inline styles only — safe for Gmail, Apple Mail and Outlook.
            </p>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
