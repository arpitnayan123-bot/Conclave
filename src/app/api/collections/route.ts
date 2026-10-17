import { db } from "@/lib/db";
import { getAuthMember, json, jsonError } from "@/lib/auth";

/**
 * GET  /api/collections — list the signed-in member's collection folders
 *                       with the ids of the ideas inside each (auth).
 * POST /api/collections — create a folder { name } (auth).
 */
export async function GET(req: Request) {
  const auth = await getAuthMember(req);
  if (!auth) return jsonError("Unauthorized", 401);

  const rows = await db.collection.findMany({
    where: { memberId: auth.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      createdAt: true,
      items: { orderBy: { createdAt: "desc" }, select: { ideaId: true } },
    },
  });

  return json({
    collections: rows.map((c) => ({
      id: c.id,
      name: c.name,
      createdAt: c.createdAt,
      ideaIds: c.items.map((i) => i.ideaId),
    })),
  });
}

export async function POST(req: Request) {
  const auth = await getAuthMember(req);
  if (!auth) return jsonError("Unauthorized", 401);

  let body: { name?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length < 2 || name.length > 40) {
    return jsonError("Collection name must be 2–40 characters", 400);
  }

  const count = await db.collection.count({ where: { memberId: auth.id } });
  if (count >= 12) {
    return jsonError("Collection limit reached (12) — remove one first", 400);
  }

  const dupe = await db.collection.findFirst({
    where: { memberId: auth.id, name: { equals: name } },
    select: { id: true },
  });
  if (dupe) return jsonError("You already have a collection with that name", 400);

  const created = await db.collection.create({
    data: { memberId: auth.id, name },
    select: { id: true, name: true, createdAt: true },
  });

  return json({ collection: { ...created, ideaIds: [] } }, 201);
}
