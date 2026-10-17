import { db } from "@/lib/db";
import { json } from "@/lib/auth";

/**
 * Public member spotlight — the founding circle.
 * Returns the earliest-admitted members (no emails, no private fields)
 * with public profile data + venture counts for the landing page.
 */
export async function GET() {
  const members = await db.member.findMany({
    orderBy: { createdAt: "asc" },
    take: 4,
    select: {
      id: true,
      name: true,
      college: true,
      gradYear: true,
      bio: true,
      roles: true,
      skills: true,
      availableFor: true,
      _count: { select: { ideas: true } },
    },
  });

  return json({
    members: members.map((m) => ({
      id: m.id,
      name: m.name,
      college: m.college,
      gradYear: m.gradYear,
      bio: m.bio,
      roles: m.roles,
      skills: m.skills,
      availableFor: m.availableFor,
      ideaCount: m._count.ideas,
    })),
  });
}
