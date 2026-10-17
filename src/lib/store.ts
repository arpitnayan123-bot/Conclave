"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Me = {
  id: string;
  name: string;
  email: string;
  college: string;
  gradYear: string;
  bio: string;
  skills: string;
  roles: string;
  availableFor: string;
  notifPrefs?: string;
};

export type NotifPrefs = {
  digest: "instant" | "daily" | "weekly" | "off";
  mutedIdeaIds: string[];
};

/** parse the member's notification prefs JSON blob with safe fallbacks */
export function parseNotifPrefs(raw: string | undefined | null): NotifPrefs {
  try {
    const p = raw ? (JSON.parse(raw) as Partial<NotifPrefs>) : {};
    const digest = ("instant|daily|weekly|off".split("|") as NotifPrefs["digest"][]).includes(p.digest as NotifPrefs["digest"])
      ? (p.digest as NotifPrefs["digest"])
      : "instant";
    const mutedIdeaIds = Array.isArray(p.mutedIdeaIds) ? p.mutedIdeaIds.filter((v) => typeof v === "string") : [];
    return { digest, mutedIdeaIds };
  } catch {
    return { digest: "instant", mutedIdeaIds: [] };
  }
}

type MemberState = {
  token: string | null;
  member: Me | null;
  setAuth: (token: string, member: Me) => void;
  setMember: (member: Me) => void;
  clear: () => void;
};

export const useMemberStore = create<MemberState>()(
  persist(
    (set) => ({
      token: null,
      member: null,
      setAuth: (token, member) => set({ token, member }),
      setMember: (member) => set({ member }),
      clear: () => set({ token: null, member: null }),
    }),
    { name: "conclave-member-auth" }
  )
);

/** Campuses across the network — open to every university, not just one system. */
export const CAMPUSES = [
  "NIT Trichy", "NIT Surathkal", "NIT Warangal", "NIT Calicut", "NIT Rourkela",
  "BITS Pilani", "BITS Goa", "BITS Hyderabad",
  "DTU Delhi", "NSUT Delhi", "IGDTUW Delhi",
  "VIT Vellore", "Manipal Institute of Technology", "SRM Institute", "Thapar University",
  "PEC Chandigarh", "Jadavpur University", "COEP Pune", "Anna University",
  "Delhi University", "Mumbai University", "PES University", "RV College of Engineering",
  "KJ Somaiya", "Amrita University", "SASTRA University", "UPES Dehradun",
  "Ahmedabad University", "NMIMS Mumbai", "Other Campus",
];

export const SKILL_OPTIONS = [
  "Web Development", "Mobile Development", "AI / ML", "Blockchain", "Hardware / IoT",
  "Product", "UI / UX Design", "Business Strategy", "Marketing", "Sales",
  "Finance", "Operations", "Data Science", "Robotics", "Biotech",
];

export const LOOKING_FOR_OPTIONS = [
  "Co-founder (Tech)", "Co-founder (Business)", "Co-founder (Design)", "Early Team Member", "Mentor / Advisor",
];

export const IDEA_STAGES = ["IDEA", "PROTOTYPE", "MVP", "LAUNCHED"] as const;

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function avatarGradient(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  const h2 = (h + 70) % 360;
  return `linear-gradient(135deg, hsl(${h} 65% 45%), hsl(${h2} 70% 40%))`;
}

export const DIGEST_LABELS: Record<NotifPrefs["digest"], string> = {
  instant: "Instant",
  daily: "Daily summary",
  weekly: "Weekly digest",
  off: "Paused",
};
