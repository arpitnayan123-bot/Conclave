import { db } from "@/lib/db";
import { getAuthMember, json, jsonError } from "@/lib/auth";

// Public member profile (private network) — member fields + their ideas
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthMember(req);
  if (!auth) return jsonError("Unauthorized", 401);
  const { id } = await params;

  const member = await db.member.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      college: true,
      gradYear: true,
      bio: true,
      skills: true,
      roles: true,
      availableFor: true,
      createdAt: true,
      _count: { select: { ideas: true } },
    },
  });
  if (!member) return jsonError("Member not found", 404);

  const ideas = await db.idea.findMany({
    where: { authorId: id },
    select: {
      id: true,
      title: true,
      pitch: true,
      stage: true,
      needs: true,
      tags: true,
      createdAt: true,
      interests: { select: { id: true, memberId: true, message: true } },
      _count: { select: { comments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // connection status between viewer and this member
  const conn = await db.connection.findFirst({
    where: {
      OR: [
        { requesterId: auth.id, addresseeId: id },
        { requesterId: id, addresseeId: auth.id },
      ],
    },
  });

  return json({
    member: {
      id: member.id,
      name: member.name,
      college: member.college,
      gradYear: member.gradYear,
      bio: member.bio,
      skills: member.skills,
      roles: member.roles,
      availableFor: member.availableFor,
      createdAt: member.createdAt,
      ideaCount: member._count.ideas,
    },
    ideas: ideas.map((i) => ({
      id: i.id,
      title: i.title,
      pitch: i.pitch,
      stage: i.stage,
      needs: i.needs,
      tags: i.tags,
      createdAt: i.createdAt.toISOString(),
      interestCount: i.interests.length,
      viewerInterested: i.interests.some((x) => x.memberId === auth.id),
      commentCount: i._count.comments,
    })),
    connectionStatus: conn?.status ?? null,
    isMe: auth.id === id,
  });
}
