import { db } from "@/lib/db";
import { getAuthMember, json, jsonError } from "@/lib/auth";

// Idea feed (private network)
export async function GET(req: Request) {
  const auth = await getAuthMember(req);
  if (!auth) return jsonError("Unauthorized", 401);

  const [ideas, myBookmarks] = await Promise.all([
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
    }),
    db.bookmark.findMany({ where: { memberId: auth.id }, select: { ideaId: true } }),
  ]);
  const bookmarked = new Set(myBookmarks.map((b) => b.ideaId));
  return json({
    ideas: ideas.map(({ _count, ...idea }) => ({
      ...idea,
      commentCount: _count.comments,
      bookmarked: bookmarked.has(idea.id),
    })),
    meId: auth.id,
  });
}

export async function POST(req: Request) {
  const auth = await getAuthMember(req);
  if (!auth) return jsonError("Unauthorized", 401);
  const { title, pitch, stage, needs, tags } = (await req.json()) as {
    title: string; pitch: string; stage?: string; needs?: string; tags?: string;
  };
  if (!title?.trim() || title.trim().length < 4) return jsonError("Give your idea a clear title");
  if (!pitch?.trim() || pitch.trim().length < 40)
    return jsonError("Describe your idea in at least 40 characters");

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
}
