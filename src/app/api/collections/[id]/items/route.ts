import { db } from "@/lib/db";
import { getAuthMember, json, jsonError } from "@/lib/auth";

/**
 * POST /api/collections/[id]/items — add or remove an idea from a folder (owner only).
 * Body: { ideaId, action: "add" | "remove" }.
 * Adding auto-saves (bookmarks) the idea so folders stay a subset of saved ideas.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthMember(req);
  if (!auth) return jsonError("Unauthorized", 401);
  const { id } = await params;

  const collection = await db.collection.findFirst({
    where: { id, memberId: auth.id },
    select: { id: true, name: true },
  });
  if (!collection) return jsonError("Collection not found", 404);

  let body: { ideaId?: unknown; action?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const ideaId = typeof body.ideaId === "string" ? body.ideaId : "";
  if (!ideaId) return jsonError("ideaId is required", 400);
  // an unknown action used to silently mean "add" — refuse it so a typo'd
  // client can't mutate folders by accident
  if (body.action !== "add" && body.action !== "remove")
    return jsonError("action must be \"add\" or \"remove\"", 400);
  const action: "add" | "remove" = body.action;

  const idea = await db.idea.findUnique({ where: { id: ideaId }, select: { id: true } });
  if (!idea) return jsonError("Idea not found", 404);

  if (action === "remove") {
    await db.collectionItem.deleteMany({ where: { collectionId: id, ideaId } });
    return json({ inCollection: false, bookmarked: null });
  }

  // ensure the idea is bookmarked by this member (folders ⊆ saved)
  const bookmark = await db.bookmark.findUnique({
    where: { ideaId_memberId: { ideaId, memberId: auth.id } },
    select: { id: true },
  });
  if (!bookmark) {
    await db.bookmark.create({ data: { ideaId, memberId: auth.id } });
  }

  await db.collectionItem.upsert({
    where: { collectionId_ideaId: { collectionId: id, ideaId } },
    update: {},
    create: { collectionId: id, ideaId },
  });

  return json({ inCollection: true, bookmarked: true });
}
