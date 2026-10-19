import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getAuthMember, json, jsonError } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

const IDEA_STAGES = ["IDEA", "PROTOTYPE", "MVP", "LAUNCHED"];
const P2002 = (e: unknown) =>
  e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

// Idea feed (private network) — windowed: ?limit (max 100, default 50) + ?offset.
// The Room stays fast as the ledger grows; clients page with hasMore.
export async function GET(req: Request) {
  const auth = await getAuthMember(req);
  if (!auth) return jsonError("Unauthorized", 401);

  const url = new URL(req.url);
  const parsedLimit = Number.parseInt(url.searchParams.get("limit") ?? "", 10);
  const parsedOffset = Number.parseInt(url.searchParams.get("offset") ?? "", 10);
  const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 50;
  const offset = Number.isFinite(parsedOffset) ? Math.max(parsedOffset, 0) : 0;

  const [ideas, myBookmarks, total] = await Promise.all([
    db.idea.findMany({
      include: {
        author: {
          select: { id: true, name: true, college: true, gradYear: true, roles: true, skills: true },
        },
        interests: {
          include: { member: { select: { id: true, name: true, college: true } } },
          orderBy: { createdAt: "desc" },
        },
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    db.bookmark.findMany({ where: { memberId: auth.id }, select: { ideaId: true } }),
    db.idea.count(),
  ]);
  const bookmarked = new Set(myBookmarks.map((b) => b.ideaId));
  return json({
    ideas: ideas.map(({ _count, ...idea }) => ({
      ...idea,
      commentCount: _count.comments,
      bookmarked: bookmarked.has(idea.id),
    })),
    meId: auth.id,
    total,
    hasMore: offset + ideas.length < total,
  });
}

export async function POST(req: Request) {
  const auth = await getAuthMember(req);
  if (!auth) return jsonError("Unauthorized", 401);
  if (!rateLimit(`idea:${auth.id}`, 8, 60 * 60_000))
    return jsonError("You've presented several ventures recently — give the circle room to deliberate.", 429);

  const body = (await req.json().catch(() => null)) as {
    title?: unknown; pitch?: unknown; stage?: unknown; needs?: unknown; tags?: unknown;
  } | null;
  if (!body) return jsonError("Invalid JSON body", 400);
  const { title, pitch, stage, needs, tags } = body as Record<string, string>;
  if (typeof title !== "string" || typeof pitch !== "string")
    return jsonError("Title and pitch are required");
  if (title.trim().length < 4) return jsonError("Give your idea a clear title");
  if (pitch.trim().length < 40)
    return jsonError("Describe your idea in at least 40 characters");
  if (title.trim().length > 120) return jsonError("Title is too long (120 characters max)");
  if (pitch.trim().length > 4000) return jsonError("Pitch is too long (4000 characters max)");
  if (needs && needs.length > 200) return jsonError("“Needs” is too long (200 characters max)");
  if (tags && tags.length > 200) return jsonError("Tags are too long (200 characters max)");
  if (stage && !IDEA_STAGES.includes(stage)) return jsonError("Invalid stage");

  try {
    const idea = await db.idea.create({
      data: {
        authorId: auth.id,
        title: title.trim(),
        pitch: pitch.trim(),
        stage: stage || "IDEA",
        needs: needs?.trim() || "",
        tags: tags?.trim() || "",
      },
      include: {
        author: {
          select: { id: true, name: true, college: true, gradYear: true, roles: true, skills: true },
        },
        interests: { include: { member: { select: { id: true, name: true, college: true } } } },
        _count: { select: { comments: true } },
      },
    });
    const { _count, ...rest } = idea;
    return json({ idea: { ...rest, commentCount: _count.comments, bookmarked: false } });
  } catch (e) {
    if (P2002(e)) return jsonError("Venture already presented", 409);
    throw e;
  }
}
