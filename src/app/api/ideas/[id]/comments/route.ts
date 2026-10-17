import { db } from "@/lib/db";
import { getAuthMember, json, jsonError } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

// Discussion thread for an idea
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthMember(req);
  if (!auth) return jsonError("Unauthorized", 401);
  const { id } = await params;

  const idea = await db.idea.findUnique({ where: { id }, select: { id: true } });
  if (!idea) return jsonError("Idea not found", 404);

  const comments = await db.comment.findMany({
    where: { ideaId: id },
    include: {
      member: { select: { id: true, name: true, college: true, roles: true } },
    },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
  return json({ comments, meId: auth.id });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthMember(req);
  if (!auth) return jsonError("Unauthorized", 401);
  if (!rateLimit(`comment:${auth.id}`, 20, 60_000))
    return jsonError("Slow down — too many comments in a minute.", 429);

  const { id } = await params;
  const { body } = (await req.json().catch(() => ({}))) as { body?: string };
  const text = body?.trim() ?? "";
  if (text.length < 2) return jsonError("Comment is too short");
  if (text.length > 600) return jsonError("Comment must be 600 characters or fewer");

  const idea = await db.idea.findUnique({ where: { id }, select: { id: true } });
  if (!idea) return jsonError("Idea not found", 404);

  const comment = await db.comment.create({
    data: { ideaId: id, memberId: auth.id, body: text },
    include: {
      member: { select: { id: true, name: true, college: true, roles: true } },
    },
  });
  return json({ comment });
}

// Delete own comment; the idea author may moderate any comment on their idea
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthMember(req);
  if (!auth) return jsonError("Unauthorized", 401);
  const { id } = await params;

  const url = new URL(req.url);
  const commentId = url.searchParams.get("commentId");
  if (!commentId) return jsonError("commentId is required", 400);

  const comment = await db.comment.findUnique({
    where: { id: commentId },
    include: { idea: { select: { authorId: true } } },
  });
  if (!comment || comment.ideaId !== id) return jsonError("Comment not found", 404);

  const canDelete = comment.memberId === auth.id || comment.idea.authorId === auth.id;
  if (!canDelete) return jsonError("You can only remove your own comments", 403);

  await db.comment.delete({ where: { id: commentId } });
  return json({ ok: true });
}
