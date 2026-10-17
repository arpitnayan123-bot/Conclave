import { db } from "@/lib/db";
import { getAuthMember, json, jsonError } from "@/lib/auth";

type NotificationEvent = {
  id: string;
  kind: "interest" | "request" | "accepted" | "comment";
  createdAt: string;
  actor: { id: string; name: string; college: string };
  ideaTitle?: string;
  ideaId?: string;
  message?: string;
};

// Recent activity for the signed-in member: interests on my ideas,
// incoming connection requests, and requests that got accepted.
export async function GET(req: Request) {
  const auth = await getAuthMember(req);
  if (!auth) return jsonError("Unauthorized", 401);

  const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30); // 30-day window

  // per-idea mute list + digest preference from the member's saved prefs
  let mutedIdeaIds: string[] = [];
  try {
    const prefs = JSON.parse(auth.notifPrefs || "{}") as { mutedIdeaIds?: string[] };
    if (Array.isArray(prefs.mutedIdeaIds)) mutedIdeaIds = prefs.mutedIdeaIds.filter((v) => typeof v === "string");
  } catch {
    /* malformed prefs — treat as no mutes */
  }

  const [myIdeas, incoming, accepted, myCommentedIdeas] = await Promise.all([
    db.idea.findMany({
      where: { authorId: auth.id, interests: { some: {} } },
      select: {
        id: true,
        title: true,
        interests: {
          where: { memberId: { not: auth.id }, createdAt: { gte: since } },
          include: { member: { select: { id: true, name: true, college: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    db.connection.findMany({
      where: { addresseeId: auth.id, status: "PENDING" },
      include: {
        requester: { select: { id: true, name: true, college: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    db.connection.findMany({
      where: {
        requesterId: auth.id,
        status: "ACCEPTED",
      },
      include: {
        addressee: { select: { id: true, name: true, college: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    // comments on my ideas (not my own comments)
    db.idea.findMany({
      where: {
        authorId: auth.id,
        comments: { some: { memberId: { not: auth.id }, createdAt: { gte: since } } },
      },
      select: {
        id: true,
        title: true,
        comments: {
          where: { memberId: { not: auth.id }, createdAt: { gte: since } },
          include: { member: { select: { id: true, name: true, college: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
  ]);

  const events: NotificationEvent[] = [];

  for (const idea of myIdeas) {
    if (mutedIdeaIds.includes(idea.id)) continue; // muted idea — skip interest pings
    for (const it of idea.interests) {
      events.push({
        id: `interest-${it.id}`,
        kind: "interest",
        createdAt: it.createdAt.toISOString(),
        actor: it.member,
        ideaTitle: idea.title,
        ideaId: idea.id,
        message: it.message,
      });
    }
  }

  for (const idea of myCommentedIdeas) {
    if (mutedIdeaIds.includes(idea.id)) continue; // muted idea — skip comment pings
    for (const c of idea.comments) {
      events.push({
        id: `comment-${c.id}`,
        kind: "comment",
        createdAt: c.createdAt.toISOString(),
        actor: c.member,
        ideaTitle: idea.title,
        ideaId: idea.id,
        message: c.body.length > 120 ? `${c.body.slice(0, 117)}…` : c.body,
      });
    }
  }

  for (const c of incoming) {
    events.push({
      id: `request-${c.id}`,
      kind: "request",
      createdAt: c.createdAt.toISOString(),
      actor: c.requester,
      message: c.message,
    });
  }

  for (const c of accepted) {
    if (c.createdAt < since) continue;
    events.push({
      id: `accepted-${c.id}`,
      kind: "accepted",
      createdAt: c.createdAt.toISOString(),
      actor: c.addressee,
    });
  }

  events.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return json({ events: events.slice(0, 30) });
}
