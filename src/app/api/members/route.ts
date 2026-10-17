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

  const connMap: Record<string, string> = {};
  for (const c of myConnections) {
    const other = c.requesterId === auth.id ? c.addresseeId : c.requesterId;
    connMap[other] = c.status;
  }

  return json({
    members: members.map((m) => ({
      id: m.id, name: m.name, email: m.email, college: m.college, gradYear: m.gradYear,
      bio: m.bio, skills: m.skills, roles: m.roles, availableFor: m.availableFor,
      ideaCount: m._count.ideas,
      ideaTitles: m.ideas.map((i) => ({ id: i.id, title: i.title, stage: i.stage })),
      connectionStatus: connMap[m.id] || null,
    })),
  });
}
