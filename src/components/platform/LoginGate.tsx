"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  KeyRound,
  Loader2,
  Lock,
  LogIn,
  Mail,
  TimerReset,
} from "lucide-react";
import { api } from "@/lib/api";
import { useMemberStore, type Me } from "@/lib/store";
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { cn } from "@/lib/utils";

type LoginMode = "code" | "password";

const CODE_TTL_S = 600; // mirrors the API: 10-minute expiry
const COOLDOWN_S = 60; // mirrors the API: 60 s resend cooldown

export default function LoginGate() {
  const setAuth = useMemberStore((s) => s.setAuth);

  const [mode, setMode] = useState<LoginMode>("code");

  /* ---------------- email one-time-code flow ---------------- */
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "code">("email");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [expiresIn, setExpiresIn] = useState(CODE_TTL_S);
  const codeSentRef = useRef(false);

  useEffect(() => {
    if (cooldown <= 0 && expiresIn <= 0) return;
    const t = setInterval(() => {
      setCooldown((c) => (c > 0 ? c - 1 : 0));
      if (codeSentRef.current) setExpiresIn((e) => (e > 0 ? e - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [cooldown, expiresIn]);

  async function sendCode() {
    if (!email.trim()) {
      toast.error("Enter your email first");
      return;
    }
    setSending(true);
    try {
      const res = await api<{ sent: boolean; cooldownSeconds: number; expiresInSeconds: number }>(
        "/auth/email/otp",
        { body: { email: email.trim() } }
      );
      setStage("code");
      setCode("");
      setCooldown(res.cooldownSeconds ?? COOLDOWN_S);
      setExpiresIn(res.expiresInSeconds ?? CODE_TTL_S);
      codeSentRef.current = true;
      toast.success("Code sent — check your inbox.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send the code");
    } finally {
      setSending(false);
    }
  }

  async function verifyCode() {
    if (!/^\d{6}$/.test(code)) {
      toast.error("Enter the full 6-digit code");
      return;
    }
    setVerifying(true);
    try {
      const res = await api<{ token: string; member: Me }>("/auth/email/verify", {
        body: { email: email.trim(), code },
      });
      setAuth(res.token, res.member);
      toast.success(`Welcome back, ${res.member.name.split(" ").filter(Boolean)[0] ?? "founder"}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verification failed");
      setCode("");
    } finally {
      setVerifying(false);
    }
  }

  /* ---------------- legacy password flow (preserved) ---------------- */
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onPasswordSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Enter your email and password");
      return;
    }
    setBusy(true);
    try {
      const res = await api<{ token: string; member: Me }>("/members/login", {
        body: { email: email.trim(), password },
      });
      setAuth(res.token, res.member);
      toast.success(`Welcome back, ${res.member.name.split(" ").filter(Boolean)[0] ?? "founder"}`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-4 py-10">
      <div className="grid-bg pointer-events-none absolute inset-0" aria-hidden />

      <main className="relative z-10 w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Logo />
          <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-semibold text-gold">
            <Lock className="h-3 w-3" aria-hidden /> Members only
          </span>
        </div>

        <div className="glass rounded-2xl p-6 sm:p-8">
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            The circle is <span className="text-gradient">private.</span>
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Membership is extended by invitation only. If you&apos;ve been selected, the
            committee&apos;s link reached your Gmail.
          </p>

          {/* mode switch — email code (default) / password */}
          <div className="mt-5 grid grid-cols-2 gap-1 rounded-xl border border-border/60 bg-card/40 p-1" role="tablist" aria-label="Sign-in method">
            {(
              [
                { key: "code", label: "Email code", icon: Mail },
                { key: "password", label: "Password", icon: KeyRound },
              ] as const
            ).map((m) => (
              <button
                key={m.key}
                type="button"
                role="tab"
                aria-selected={mode === m.key}
                onClick={() => {
                  setMode(m.key);
                  if (m.key === "code") setStage("email");
                }}
                className={cn(
                  "flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors",
                  mode === m.key
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <m.icon className="h-3.5 w-3.5" aria-hidden /> {m.label}
              </button>
            ))}
          </div>

          {/* ---------------- email one-time-code flow ---------------- */}
          {mode === "code" ? (
            <div className="mt-6">
              {stage === "email" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        sendCode();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    className="mt-4 w-full"
                    disabled={sending}
                    onClick={sendCode}
                  >
                    {sending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Sending code…
                      </>
                    ) : (
                      <>
                        Email me a sign-in code <ArrowRight className="h-4 w-4" aria-hidden />
                      </>
                    )}
                  </Button>
                  <p className="pt-1 text-center text-xs text-muted-foreground">
                    A 6-digit code, valid for 10 minutes, works once.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="text-center">
                    <p className="text-sm text-foreground/90">
                      Code sent to <span className="font-medium text-gold">{email}</span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {expiresIn > 0
                        ? `Expires in ${Math.floor(expiresIn / 60)}:${String(expiresIn % 60).padStart(2, "0")}`
                        : "Expired — request a new code."}
                    </p>
                  </div>

                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={code}
                      onChange={(v) => setCode(v)}
                      onComplete={() => verifyCode()}
                      aria-label="6-digit sign-in code"
                      autoFocus
                    >
                      <InputOTPGroup>
                        {[0, 1, 2].map((i) => (
                          <InputOTPSlot key={i} index={i} className="h-12 w-11 border-border/70 text-lg text-foreground" />
                        ))}
                      </InputOTPGroup>
                      <span aria-hidden className="mx-1 h-px w-3 bg-gold/40" />
                      <InputOTPGroup>
                        {[3, 4, 5].map((i) => (
                          <InputOTPSlot key={i} index={i} className="h-12 w-11 border-border/70 text-lg text-foreground" />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  <Button type="button" className="w-full" disabled={verifying} onClick={verifyCode}>
                    {verifying ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Verifying…
                      </>
                    ) : (
                      <>
                        Verify & enter <LogIn className="h-4 w-4" aria-hidden />
                      </>
                    )}
                  </Button>

                  <div className="flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => setStage("email")}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      ← Change email
                    </button>
                    <button
                      type="button"
                      onClick={sendCode}
                      disabled={cooldown > 0 || sending}
                      className="inline-flex items-center gap-1 text-gold transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:text-muted-foreground/60"
                    >
                      <TimerReset className="h-3.5 w-3.5" aria-hidden />
                      {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ---------------- password flow (preserved) ---------------- */
            <form onSubmit={onPasswordSubmit} className="mt-6 space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Signing in…
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" aria-hidden /> Enter the Conclave
                  </>
                )}
              </Button>
            </form>
          )}
        </div>

        <nav
          className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm"
          aria-label="Alternative routes"
        >
          <Link
            href="#/"
            className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Back to landing
          </Link>
          <Link
            href="#/submit"
            className="inline-flex items-center gap-1.5 text-primary transition-colors hover:text-primary/80"
          >
            <FileText className="h-3.5 w-3.5" aria-hidden /> Petition for membership instead
          </Link>
        </nav>
      </main>
    </div>
  );
}
