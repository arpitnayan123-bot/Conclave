import { db } from "@/lib/db";
import { getAuthMember, json, jsonError } from "@/lib/auth";

// Toggle "I'm interested" on an idea
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthMember(req);
  if (!auth) return jsonError("Unauthorized", 401);
  const { id } = await params;
  const { message } = (await req.json().catch(() => ({}))) as { message?: string };

  const idea = await db.idea.findUnique({ where: { id } });
  if (!idea) return jsonError("Idea not found", 404);

  const existing = await db.interest.findUnique({
    where: { ideaId_memberId: { ideaId: id, memberId: auth.id } },
  });

  if (existing) {
    await db.interest.delete({ where: { id: existing.id } });
    return json({ interested: false });
  }

  await db.interest.create({
    data: { ideaId: id, memberId: auth.id, message: message?.trim() || "" },
  });
  return json({ interested: true });
}
