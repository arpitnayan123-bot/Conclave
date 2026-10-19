import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getAuthMember, json, jsonError } from "@/lib/auth";

/**
 * POST /api/ideas/[id]/bookmark — toggle "save for later" on an idea (auth).
 * Returns { bookmarked: boolean }.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthMember(req);
  if (!auth) return jsonError("Unauthorized", 401);
  const { id } = await params;

  const idea = await db.idea.findUnique({ where: { id }, select: { id: true } });
  if (!idea) return jsonError("Idea not found", 404);

  const existing = await db.bookmark.findUnique({
    where: { ideaId_memberId: { ideaId: id, memberId: auth.id } },
  });

  if (existing) {
    await db.bookmark.delete({ where: { id: existing.id } });
    // keep collections ⊆ bookmarks: drop this idea from all of my collection folders
    await db.collectionItem.deleteMany({
      where: { ideaId: id, collection: { memberId: auth.id } },
    });
    return json({ bookmarked: false });
  }

  try {
    await db.bookmark.create({ data: { ideaId: id, memberId: auth.id } });
  } catch (e) {
    // double-click race: already saved — treat as bookmarked
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return json({ bookmarked: true });
    }
    throw e;
  }
  return json({ bookmarked: true });
}
