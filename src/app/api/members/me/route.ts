import { getAuthMember, json, jsonError } from "@/lib/auth";
import { db } from "@/lib/db";

const DIGEST_VALUES = ["instant", "daily", "weekly", "off"];

/** validate + sanitize the notification preferences JSON blob */
export function sanitizeNotifPrefs(raw: unknown): string | null {
  if (raw === undefined || raw === null) return null;
  let parsed: { digest?: unknown; mutedIdeaIds?: unknown };
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
  } else if (typeof raw === "object") {
    parsed = raw as { digest?: unknown; mutedIdeaIds?: unknown };
  } else {
    return null;
  }
  const digest = typeof parsed.digest === "string" && DIGEST_VALUES.includes(parsed.digest)
    ? parsed.digest
    : "instant";
  const muted = Array.isArray(parsed.mutedIdeaIds)
    ? parsed.mutedIdeaIds.filter((v): v is string => typeof v === "string").slice(0, 100)
    : [];
  return JSON.stringify({ digest, mutedIdeaIds: muted });
}

export async function GET(req: Request) {
  const member = await getAuthMember(req);
  if (!member) return jsonError("Unauthorized", 401);
  // getAuthMember already returns a flat, hash-free own-row — safe to return as-is.
  return json({ member });
}

export async function PATCH(req: Request) {
  const auth = await getAuthMember(req);
  if (!auth) return jsonError("Unauthorized", 401);
  const body = (await req.json().catch(() => null)) as {
    name?: string; bio?: string; skills?: string; roles?: string; availableFor?: string; gradYear?: string;
    notifPrefs?: unknown;
  } | null;
  if (!body) return jsonError("Invalid JSON body", 400);

  // length caps — the profile is rendered on cards and the directory
  const CAPS: Array<[keyof typeof body, number]> = [
    ["name", 80], ["bio", 600], ["skills", 300], ["roles", 200], ["availableFor", 300],
  ];
  for (const [key, cap] of CAPS) {
    const value = body[key];
    if (typeof value === "string" && value.length > cap) {
      return jsonError(`“${key}” is too long — ${cap} characters max`, 400);
    }
    if (value !== undefined && typeof value !== "string") {
      return jsonError(`“${key}” must be text`, 400);
    }
  }

  const prefs = sanitizeNotifPrefs(body.notifPrefs);
  if (body.notifPrefs !== undefined && prefs === null) {
    return jsonError("Invalid notification preferences", 400);
  }

  const member = await db.member.update({
    where: { id: auth.id },
    data: {
      ...(body.name?.trim() ? { name: body.name.trim() } : {}),
      ...(body.bio !== undefined ? { bio: body.bio } : {}),
      ...(body.skills !== undefined ? { skills: body.skills } : {}),
      ...(body.roles !== undefined ? { roles: body.roles } : {}),
      ...(body.availableFor !== undefined ? { availableFor: body.availableFor } : {}),
      ...(body.gradYear ? { gradYear: body.gradYear } : {}),
      ...(prefs !== null ? { notifPrefs: prefs } : {}),
    },
  });
  return json({
    member: {
      id: member.id, name: member.name, email: member.email, college: member.college,
      gradYear: member.gradYear, bio: member.bio, skills: member.skills,
      roles: member.roles, availableFor: member.availableFor, notifPrefs: member.notifPrefs,
    },
  });
}
