import { db } from "@/lib/db";
import { isAdminRequest, json, jsonError } from "@/lib/auth";

// Aggregated analytics for the admin review console
export async function GET(req: Request) {
  if (!(await isAdminRequest(req))) return jsonError("Unauthorized", 401);

  const [apps, invites, members, ideas, interests, connections] = await Promise.all([
    db.application.findMany({ select: { status: true, createdAt: true, updatedAt: true, college: true, stage: true } }),
    db.invite.findMany({ select: { status: true, createdAt: true } }),
    db.member.findMany({ select: { createdAt: true } }),
    db.idea.count(),
    db.interest.count(),
    db.connection.count(),
  ]);

  // status split
  const byStatus = { PENDING: 0, APPROVED: 0, REJECTED: 0 };
  for (const a of apps) byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;

  // applications per day (last 14 days)
  const days: { date: string; label: string; applications: number; approved: number }[] = [];
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    const inDay = apps.filter((a) => a.createdAt >= d && a.createdAt < next);
    days.push({
      date: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      applications: inDay.length,
      approved: inDay.filter((a) => a.status === "APPROVED").length,
    });
  }

  // top colleges
  const collegeMap: Record<string, number> = {};
  for (const a of apps) collegeMap[a.college] = (collegeMap[a.college] ?? 0) + 1;
  const topColleges = Object.entries(collegeMap)
    .map(([college, count]) => ({ college, count }))
    .sort((x, y) => y.count - x.count)
    .slice(0, 6);

  // stage distribution among applicants' pitches
  const stageMap: Record<string, number> = {};
  for (const a of apps) {
    const s = a.stage || "IDEA";
    stageMap[s] = (stageMap[s] ?? 0) + 1;
  }
  const stageSplit = Object.entries(stageMap).map(([stage, count]) => ({ stage, count }));

  // invites
  const invitesSent = invites.length;
  const invitesUsed = invites.filter((i) => i.status === "USED").length;

  // review speed (SLA): time to decision ≈ updatedAt - createdAt on decided apps
  // (approximation — updatedAt also moves on note edits)
  const decided = apps.filter((a) => a.status !== "PENDING");
  const hours = decided
    .map((a) => (a.updatedAt.getTime() - a.createdAt.getTime()) / 3_600_000)
    .filter((h) => h >= 0)
    .sort((a, b) => a - b);
  const pick = (arr: number[], idx: number) =>
    arr.length ? arr[Math.min(arr.length - 1, Math.max(0, idx))] : 0;
  const review = {
    decided: decided.length,
    avgHours: hours.length ? hours.reduce((s, h) => s + h, 0) / hours.length : 0,
    medianHours: pick(hours, Math.floor(hours.length / 2)),
    fastestHours: pick(hours, 0),
    slowestHours: pick(hours, hours.length - 1),
  };

  return json({
    totals: {
      applications: apps.length,
      members: members.length,
      ideas,
      interests,
      connections,
      invitesSent,
      invitesUsed,
      byStatus,
    },
    timeline: days,
    topColleges,
    stageSplit,
    review,
  });
}
