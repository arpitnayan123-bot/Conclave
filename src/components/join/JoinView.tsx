"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft, BadgeCheck, GraduationCap, KeyRound, Lightbulb, Loader2,
  LockKeyhole, Mail, PartyPopper, ShieldX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Logo } from "@/components/shared/Logo";
import { useMemberStore } from "@/lib/store";
import { api } from "@/lib/api";

type InviteInfo = {
  email: string;
  name: string;
  college: string;
  ideaTitle: string;
};

type ValidationResult = { token: string; info?: InviteInfo; error?: string };

export default function JoinView({ token }: { token: string }) {
  const [result, setResult] = useState<ValidationResult | null>(null);
  const setAuth = useMemberStore((s) => s.setAuth);

  // Validation result is keyed by token, so a new token always gets a clean slate.
  const current = result && result.token === token ? result : null;
  const info = current?.info ?? null;
  const error = !token
    ? "No invitation token found in the link."
    : current?.error ?? null;
  const loading = !!token && !current;

  useEffect(() => {
    if (!token) return;
    let active = true;
    api<{ invite: InviteInfo }>(`/invites/validate?token=${encodeURIComponent(token)}`)
      .then((r) => { if (active) setResult({ token, info: r.invite }); })
      .catch((e) => { if (active) setResult({ token, error: e instanceof Error ? e.message : "Invalid invitation" }); });
    return () => { active = false; };
  }, [token]);

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

      <main className="flex-1 grid place-items-center px-4 py-14 relative">
        {loading ? (
          <div className="flex flex-col items-center gap-4 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm">Validating your invitation…</p>
          </div>
        ) : error ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
            <Card className="glass border-destructive/30">
              <CardContent className="p-8 text-center space-y-5">
                <div className="mx-auto w-16 h-16 rounded-2xl grid place-items-center bg-destructive/10 border border-destructive/30">
                  <ShieldX className="w-8 h-8 text-destructive" />
                </div>
                <div>
                  <h1 className="font-display text-2xl font-bold tracking-tight">Invitation problem</h1>
                  <p className="text-sm text-muted-foreground mt-2">{error}</p>
                  <p className="text-sm text-muted-foreground mt-3">
                    Invitations are single-use and personal. If you believe this is a mistake,
                    reply to your invitation email and the committee will sort it out.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row justify-center gap-3">
                  <Button asChild variant="outline" className="min-h-[44px]">
                    <a href="#/submit">Petition for membership</a>
                  </Button>
                  <Button asChild variant="ghost" className="text-muted-foreground min-h-[44px]">
                    <a href="#/">Back home</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : info ? (
          <JoinForm token={token} info={info} onDone={(t, member) => { setAuth(t, member); window.location.hash = "#/platform"; }} />
        ) : null}
      </main>
    </div>
  );
}

function JoinForm({
  token, info, onDone,
}: {
  token: string;
  info: InviteInfo;
  onDone: (token: string, member: { id: string; name: string; email: string; college: string; gradYear: string; bio: string; skills: string; roles: string; availableFor: string }) => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [bio, setBio] = useState("");
  const [busy, setBusy] = useState(false);

  async function join() {
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords don't match");
      return;
    }
    setBusy(true);
    try {
      const r = await api<{ token: string; member: { id: string; name: string; email: string; college: string; gradYear: string; bio: string; skills: string; roles: string; availableFor: string } }>(
        "/members/signup",
        { body: { token, password, bio } }
      );
      toast.success(`Welcome to Conclave, ${r.member.name.split(" ")[0]} — your seat awaits.`);
      onDone(r.token, r.member);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Signup failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-lg"
    >
      <Card className="glass glow-emerald border-primary/30">
        <CardContent className="p-8 space-y-6">
          <div className="text-center space-y-3">
            <div className="mx-auto w-16 h-16 rounded-2xl grid place-items-center bg-primary/10 border border-primary/40 animate-pulse-ring">
              <PartyPopper className="w-8 h-8 text-primary" />
            </div>
            <div>
              <Badge className="bg-emeraldx/15 text-emeraldx border-emeraldx/40 mb-3 gap-1">
                <BadgeCheck className="w-3.5 h-3.5" /> You&apos;ve been selected
              </Badge>
              <h1 className="font-display text-3xl font-bold tracking-tight">
                Claim your seat, {info.name.split(" ")[0]}.
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                Your petition earned you a place at the table. Create your member account —
                this link only works once, for this Gmail.
              </p>
            </div>
          </div>

          <div className="grid gap-2 rounded-xl border border-border/60 bg-card/40 p-4 text-sm">
            <p className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gold shrink-0" />
              <span className="text-muted-foreground">Member-elect:</span> {info.name} · <span className="font-mono text-xs">{info.email}</span>
            </p>
            <p className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-gold shrink-0" />
              <span className="text-muted-foreground">Campus:</span> {info.college}
            </p>
            <p className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-gold shrink-0" />
              <span className="text-muted-foreground">Selected venture:</span> <span className="truncate">{info.ideaTitle}</span>
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pw" className="flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-gold" /> Create password *
                </Label>
                <Input id="pw" type="password" placeholder="8+ characters" value={password}
                  onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pw2" className="flex items-center gap-1.5">
                  <LockKeyhole className="w-3.5 h-3.5 text-gold" /> Confirm password *
                </Label>
                <Input id="pw2" type="password" placeholder="Repeat password" value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && join()} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">One-line member bio <span className="text-muted-foreground">(optional)</span></Label>
              <Textarea id="bio" rows={2} maxLength={600}
                placeholder="E.g. 3rd-year CSE, built 2 side projects, obsessed with agri-tech…"
                value={bio} onChange={(e) => setBio(e.target.value)} />
            </div>
          </div>

          <Button onClick={join} disabled={busy} className="w-full glow-emerald min-h-[48px] font-semibold">
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {busy ? "Unlocking the door…" : "Take your seat →"}
          </Button>
          <p className="text-[11px] text-muted-foreground text-center">
            By joining you agree to keep the club founder-focused, respectful, and invitation-only.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
