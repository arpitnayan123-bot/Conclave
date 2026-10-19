"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowRight, CheckCircle2, Clock3, Mail, PartyPopper, Send,
  Sparkles, GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Logo } from "@/components/shared/Logo";
import { Footer } from "@/components/shared/Footer";
import { Reveal } from "@/components/shared/Reveal";
import { StatusChecker } from "./StatusChecker";
import { CAMPUSES, SKILL_OPTIONS, LOOKING_FOR_OPTIONS, IDEA_STAGES } from "@/lib/store";
import { api } from "@/lib/api";

const GRAD_YEARS = ["2025", "2026", "2027", "2028", "2029", "2030", "2031"];

const STAGE_COPY: Record<string, string> = {
  IDEA: "Just an idea",
  PROTOTYPE: "Prototype / building",
  MVP: "MVP live",
  LAUNCHED: "Launched & growing",
};

export default function SubmitView() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    college: "",
    gradYear: "",
    linkedin: "",
    ideaTitle: "",
    ideaPitch: "",
    stage: "IDEA",
  });
  const [skills, setSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState("");
  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const pitchLen = form.ideaPitch.trim().length;

  // Field-level audit — the concierge names exactly what is still missing.
  const missingFields = useMemo(() => {
    const missing: string[] = [];
    if (form.name.trim().length < 2) missing.push("your full name");
    if (!/^[^\s@]+@gmail\.com$/i.test(form.email.trim())) missing.push("a Gmail address");
    if (!form.college) missing.push("your campus");
    if (!form.gradYear) missing.push("your graduation year");
    if (form.ideaTitle.trim().length < 4) missing.push("a venture title");
    if (pitchLen < 80) missing.push(`a fuller pitch (${pitchLen}/80 characters)`);
    if (skills.length === 0) missing.push("at least one skill");
    return missing;
  }, [form, pitchLen, skills]);

  const valid = missingFields.length === 0;

  const toggle = (list: string[], setList: (v: string[]) => void, item: string) =>
    setList(list.includes(item) ? list.filter((s) => s !== item) : [...list, item]);

  const addCustomSkill = () => {
    const s = customSkill.trim();
    if (s && !skills.includes(s)) setSkills((prev) => [...prev, s]);
    setCustomSkill("");
  };

  async function submit() {
    if (!valid) {
      const listed = missingFields.slice(0, 3).join(", ");
      const rest = missingFields.length - 3;
      toast.error(
        `The committee still needs ${listed}${rest > 0 ? ` +${rest} more` : ""}.`
      );
      return;
    }
    setSubmitting(true);
    try {
      await api("/applications", {
        body: {
          ...form,
          skills: skills.join(", "),
          lookingFor: lookingFor.join(", "),
        },
      });
      setDone(true);
      window.scrollTo({ top: 0 });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setSubmitting(false);
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

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14 relative">
        {done ? (
          <>
            <SuccessCard name={form.name} />
            <Reveal delay={0.2} className="mt-4">
              <StatusChecker defaultEmail={form.email} />
            </Reveal>
          </>
        ) : (
          <>
            <Reveal className="text-center mb-10">
              <Badge variant="outline" className="mb-4 border-primary/40 text-primary gap-1.5 px-3 py-1">
                <Sparkles className="w-3.5 h-3.5" /> Membership petition — Committee review
              </Badge>
              <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-gradient">
                Petition for membership.
              </h1>
              <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
                Tell the committee what you want to build and who you need beside you. Every
                petition is read by hand — selected builders receive a personal invitation at
                their Gmail.
              </p>
            </Reveal>

            <Reveal delay={0.1}>
              <Card className="glass border-border/70">
                <CardContent className="p-6 sm:p-8 space-y-8">
                  {/* About you */}
                  <section aria-labelledby="about-you">
                    <h2 id="about-you" className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-4">
                      I. About you
                    </h2>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full name *</Label>
                        <Input id="name" placeholder="Ananya Sharma" value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email" className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-gold" /> Gmail address *
                        </Label>
                        <Input id="email" type="email" placeholder="you@gmail.com" value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })} />
                        <p className="text-[11px] text-muted-foreground">Invitations are sent to Gmail only.</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5">
                          <GraduationCap className="w-3.5 h-3.5 text-gold" /> Campus / University *
                        </Label>
                        <Select value={form.college} onValueChange={(v) => setForm({ ...form, college: v })}>
                          <SelectTrigger aria-label="Select your campus">
                            <SelectValue placeholder="Select campus" />
                          </SelectTrigger>
                          <SelectContent className="max-h-64">
                            {CAMPUSES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Graduation year *</Label>
                        <Select value={form.gradYear} onValueChange={(v) => setForm({ ...form, gradYear: v })}>
                          <SelectTrigger aria-label="Select graduation year">
                            <SelectValue placeholder="Select year" />
                          </SelectTrigger>
                          <SelectContent>
                            {GRAD_YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="linkedin">LinkedIn or portfolio URL <span className="text-muted-foreground">(optional)</span></Label>
                        <Input id="linkedin" type="url" inputMode="url" maxLength={200}
                          placeholder="https://linkedin.com/in/you" value={form.linkedin}
                          onChange={(e) => setForm({ ...form, linkedin: e.target.value })} />
                      </div>
                    </div>
                  </section>

                  {/* The idea */}
                  <section aria-labelledby="the-idea">
                    <h2 id="the-idea" className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-4">
                      II. The venture
                    </h2>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">Venture title *</Label>
                        <Input id="title" placeholder="Udaan — drone logistics for rural healthcare" value={form.ideaTitle} maxLength={120}
                          onChange={(e) => setForm({ ...form, ideaTitle: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="pitch">The pitch *</Label>
                          <span className={`text-xs ${pitchLen >= 80 ? "text-primary" : "text-muted-foreground"}`}>
                            {pitchLen} / 80 min
                          </span>
                        </div>
                        <Textarea id="pitch" rows={6} maxLength={4000}
                          placeholder="What problem are you solving, for whom, and why now? What have you built so far? What does winning look like in 12 months?"
                          value={form.ideaPitch}
                          onChange={(e) => setForm({ ...form, ideaPitch: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Current stage</Label>
                        <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v })}>
                          <SelectTrigger aria-label="Select stage">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {IDEA_STAGES.map((s) => (
                              <SelectItem key={s} value={s}>{STAGE_COPY[s]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </section>

                  {/* Skills */}
                  <section aria-labelledby="skills-sec">
                    <h2 id="skills-sec" className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-4">
                      III. Your craft
                    </h2>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Skills * <span className="text-muted-foreground font-normal">(pick or add your own)</span></Label>
                        <div className="flex flex-wrap gap-2">
                          {[...SKILL_OPTIONS, ...skills.filter((s) => !SKILL_OPTIONS.includes(s))].map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => toggle(skills, setSkills, s)}
                              aria-pressed={skills.includes(s)}
                              className={`px-3 py-1.5 rounded-full text-xs border transition-all min-h-[32px] ${
                                skills.includes(s)
                                  ? "bg-primary/15 border-primary/60 text-primary"
                                  : "bg-card/40 border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                              }`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2 max-w-sm">
                          <Input
                            placeholder="Add a skill (e.g. VLSI design)"
                            value={customSkill}
                            onChange={(e) => setCustomSkill(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomSkill(); } }}
                          />
                          <Button type="button" variant="secondary" onClick={addCustomSkill}>Add</Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Who are you looking for?</Label>
                        <div className="grid sm:grid-cols-2 gap-2">
                          {LOOKING_FOR_OPTIONS.map((opt) => (
                            <label key={opt}
                              className={`flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-all min-h-[48px] ${
                                lookingFor.includes(opt)
                                  ? "border-primary/60 bg-primary/10"
                                  : "border-border bg-card/30 hover:border-primary/30"
                              }`}>
                              <Checkbox checked={lookingFor.includes(opt)}
                                onCheckedChange={() => toggle(lookingFor, setLookingFor, opt)}
                                aria-label={opt} />
                              <span className="text-sm">{opt}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </section>

                  <div className="pt-2 flex flex-col sm:flex-row items-center gap-4">
                    <Button
                      onClick={submit}
                      disabled={submitting}
                      size="lg"
                      className="w-full sm:w-auto glow-emerald font-semibold min-h-[48px] px-8"
                    >
                      {submitting ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                          Submitting…
                        </span>
                      ) : (
                        <>Submit petition <ArrowRight className="w-4 h-4" /></>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center sm:text-left">
                      Read by the committee within ~1 week. Selected builders receive a Gmail invitation.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Reveal>

            <Reveal delay={0.2} className="mt-8">
              <StatusChecker defaultEmail={form.email} />
            </Reveal>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

function SuccessCard({ name }: { name: string }) {
  const steps = [
    { icon: Clock3, text: "The committee deliberates on every petition — usually within the week." },
    { icon: Sparkles, text: "If your venture and drive meet the bar, you're selected." },
    { icon: Mail, text: "A personal invitation link arrives at your Gmail." },
    { icon: PartyPopper, text: "Claim your seat — present ventures and meet your co-founders inside the club." },
  ];
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="max-w-xl mx-auto text-center py-10"
    >
      <div className="mx-auto mb-6 w-20 h-20 rounded-full grid place-items-center bg-primary/10 border border-primary/40 animate-pulse-ring">
        <CheckCircle2 className="w-10 h-10 text-primary" />
      </div>
      <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
        Your petition is with the committee{name ? `, ${name.split(" ")[0]}` : ""}.
      </h1>
      <p className="mt-3 text-muted-foreground">
        Your petition now stands in the queue for deliberation. Here&apos;s what happens next:
      </p>
      <Card className="glass mt-8 text-left">
        <CardContent className="p-6 space-y-4">
          {steps.map((s, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="mt-0.5 w-8 h-8 rounded-lg grid place-items-center bg-primary/10 border border-primary/30 shrink-0">
                <s.icon className="w-4 h-4 text-primary" />
              </span>
              <p className="text-sm text-foreground/90 pt-1.5">{s.text}</p>
            </div>
          ))}
        </CardContent>
      </Card>
      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
        <Button asChild className="glow-emerald min-h-[44px]">
          <a href="#/">Back to home</a>
        </Button>
        <Button variant="ghost" asChild>
          <a href="#/platform">Member login</a>
        </Button>
      </div>
    </motion.div>
  );
}
