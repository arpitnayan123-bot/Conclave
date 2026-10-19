import { db } from "@/lib/db";
import { getAuthMember, json, jsonError } from "@/lib/auth";

// Member directory for the private network
export async function GET(req: Request) {
  const auth = await getAuthMember(req);
  if (!auth) return jsonError("Unauthorized", 401);

  const members = await db.member.findMany({
    where: { id: { not: auth.id } },
    include: {
      ideas: { select: { id: true, title: true, stage: true } },
      _count: { select: { ideas: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const myConnections = await db.connection.findMany({
    where: { OR: [{ requesterId: auth.id }, { addresseeId: auth.id }] },
  });

  // Directional status so the directory can offer "Accept" on incoming
  // requests instead of a dead "Requested" chip. DECLINED maps to null
  // (a fresh request is allowed). ACCEPTED wins over any PENDING row.
  const rank: Record<string, number> = { ACCEPTED: 3, PENDING_IN: 2, PENDING_OUT: 1 };
  const connMap: Record<string, string> = {};
  const connIdMap: Record<string, string> = {};
  for (const c of myConnections) {
    if (c.status === "DECLINED") continue;
    const other = c.requesterId === auth.id ? c.addresseeId : c.requesterId;
    const status =
      c.status === "ACCEPTED"
        ? "ACCEPTED"
        : c.requesterId === auth.id
          ? "PENDING_OUT"
          : "PENDING_IN";
    if (!connMap[other] || rank[status] > rank[connMap[other]]) {
      connMap[other] = status;
      connIdMap[other] = c.id;
    }
  }

  return json({
    members: members.map((m) => ({
      id: m.id, name: m.name, college: m.college, gradYear: m.gradYear,
      // email stays private unless we're already introduced (ACCEPTED) —
      // the profile card remains the contact surface for pending requests
      email: connMap[m.id] === "ACCEPTED" ? m.email : null,
      bio: m.bio, skills: m.skills, roles: m.roles, availableFor: m.availableFor,
      ideaCount: m._count.ideas,
      ideaTitles: m.ideas.map((i) => ({ id: i.id, title: i.title, stage: i.stage })),
      connectionStatus: connMap[m.id] || null,
      connectionId: connIdMap[m.id] || null,
    })),
  });
}
