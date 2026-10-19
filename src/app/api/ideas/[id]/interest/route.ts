import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getAuthMember, json, jsonError } from "@/lib/auth";

// Toggle "I'm interested" on an idea
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthMember(req);
  if (!auth) return jsonError("Unauthorized", 401);
  const { id } = await params;
  const { message } = (await req.json().catch(() => ({}))) as { message?: string };

  const idea = await db.idea.findUnique({ where: { id }, select: { id: true, authorId: true } });
  if (!idea) return jsonError("Idea not found", 404);
  if (idea.authorId === auth.id)
    return jsonError("You can't raise your hand on your own venture", 400);

  const existing = await db.interest.findUnique({
    where: { ideaId_memberId: { ideaId: id, memberId: auth.id } },
  });

  if (existing) {
    await db.interest.delete({ where: { id: existing.id } });
    return json({ interested: false });
  }

  const note = (message ?? "").trim();
  if (note.length > 500) return jsonError("The note is too long — 500 characters max");

  try {
    await db.interest.create({
      data: { ideaId: id, memberId: auth.id, message: note },
    });
  } catch (e) {
    // double-click race: the row already exists — treat as now-interested
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return json({ interested: true });
    }
    throw e;
  }
  return json({ interested: true });
}
