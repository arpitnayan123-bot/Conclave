import { db } from "@/lib/db";
import { getAuthMember, json, jsonError } from "@/lib/auth";

const IDEA_STAGES = ["IDEA", "PROTOTYPE", "MVP", "LAUNCHED"];

const ideaInclude = {
  author: {
    select: { id: true, name: true, college: true, gradYear: true, roles: true, skills: true },
  },
  interests: { include: { member: { select: { id: true, name: true, college: true } } } },
  _count: { select: { comments: true } },
} as const;

// shape an idea row for the client (adds commentCount + bookmarked, drops raw _count)
function withCommentCount<T extends { _count?: { comments: number }; id: string }>(
  idea: T,
  bookmarkedIds?: Set<string>
) {
  const { _count, ...rest } = idea;
  return {
    ...rest,
    commentCount: _count?.comments ?? 0,
    ...(bookmarkedIds ? { bookmarked: bookmarkedIds.has(idea.id) } : {}),
  };
}

// Edit an idea (author only)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthMember(req);
  if (!auth) return jsonError("Unauthorized", 401);
  const { id } = await params;

  const idea = await db.idea.findUnique({ where: { id } });
  if (!idea) return jsonError("Idea not found", 404);
  if (idea.authorId !== auth.id) return jsonError("You can only edit your own ideas", 403);

  const { title, pitch, stage, needs, tags } = (await req.json().catch(() => ({}))) as {
    title?: string;
    pitch?: string;
    stage?: string;
    needs?: string;
    tags?: string;
  };

  if (title !== undefined && title.trim().length < 4)
    return jsonError("Give your idea a clear title");
  if (pitch !== undefined && pitch.trim().length < 40)
    return jsonError("Describe your idea in at least 40 characters");
  if (stage !== undefined && !IDEA_STAGES.includes(stage))
    return jsonError("Invalid stage");

  const updated = await db.idea.update({
    where: { id },
    data: {
      ...(title !== undefined ? { title: title.trim() } : {}),
      ...(pitch !== undefined ? { pitch: pitch.trim() } : {}),
      ...(stage !== undefined ? { stage } : {}),
      ...(needs !== undefined ? { needs: needs.trim() } : {}),
      ...(tags !== undefined ? { tags: tags.trim() } : {}),
    },
    include: ideaInclude,
  });
  const myBookmarks = await db.bookmark.findMany({
    where: { memberId: auth.id },
    select: { ideaId: true },
  });
  return json({ idea: withCommentCount(updated, new Set(myBookmarks.map((b) => b.ideaId))) });
}

// Delete an idea (author only) — cascades interests via Prisma relation
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthMember(req);
  if (!auth) return jsonError("Unauthorized", 401);
  const { id } = await params;

  const idea = await db.idea.findUnique({ where: { id } });
  if (!idea) return jsonError("Idea not found", 404);
  if (idea.authorId !== auth.id) return jsonError("You can only delete your own ideas", 403);

  await db.idea.delete({ where: { id } });
  return json({ ok: true });
}
