import { db } from "@/lib/db";
import { getAuthMember, json, jsonError } from "@/lib/auth";
import { isCollectionIcon } from "@/lib/collection-icons";

/**
 * PATCH  /api/collections/[id] — update a folder { name?, icon? } (owner only).
 *                                At least one of name / icon must be present.
 * DELETE /api/collections/[id] — delete a folder (items cascade, owner only).
 */
async function ownedCollection(id: string, memberId: string) {
  return db.collection.findFirst({
    where: { id, memberId },
    select: { id: true, name: true },
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthMember(req);
  if (!auth) return jsonError("Unauthorized", 401);
  const { id } = await params;

  const owned = await ownedCollection(id, auth.id);
  if (!owned) return jsonError("Collection not found", 404);

  let body: { name?: unknown; icon?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const data: { name?: string; icon?: string } = {};

  if (body.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (name.length < 2 || name.length > 40) {
      return jsonError("Collection name must be 2–40 characters", 400);
    }
    const dupe = await db.collection.findFirst({
      where: { memberId: auth.id, name: { equals: name }, id: { not: id } },
      select: { id: true },
    });
    if (dupe) return jsonError("You already have a collection with that name", 400);
    data.name = name;
  }

  if (body.icon !== undefined) {
    if (!isCollectionIcon(body.icon)) {
      return jsonError("Unknown collection icon", 400);
    }
    data.icon = body.icon;
  }

  if (Object.keys(data).length === 0) {
    return jsonError("Nothing to update — provide a name or an icon", 400);
  }

  const updated = await db.collection.update({
    where: { id },
    data,
    select: { id: true, name: true, icon: true, createdAt: true },
  });

  return json({ collection: updated });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthMember(req);
  if (!auth) return jsonError("Unauthorized", 401);
  const { id } = await params;

  const owned = await ownedCollection(id, auth.id);
  if (!owned) return jsonError("Collection not found", 404);

  await db.collection.delete({ where: { id } });
  return json({ deleted: true });
}
