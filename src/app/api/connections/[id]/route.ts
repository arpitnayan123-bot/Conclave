import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getAuthMember, json, jsonError } from "@/lib/auth";

const P2025 = (e: unknown) =>
  e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025";

// Accept or decline an incoming connection request
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthMember(req);
  if (!auth) return jsonError("Unauthorized", 401);
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { status?: string } | null;
  if (!body) return jsonError("Invalid JSON body", 400);
  const { status } = body;
  if (status !== "ACCEPTED" && status !== "DECLINED") return jsonError("Invalid status");

  const connection = await db.connection.findUnique({ where: { id } });
  if (!connection) return jsonError("Connection not found", 404);
  if (connection.addresseeId !== auth.id) return jsonError("Not your request to answer", 403);
  if (connection.status !== "PENDING") return jsonError("This request was already handled", 409);

  const updated = await db.connection.update({ where: { id }, data: { status } });
  return json({ connection: updated });
}

// Withdraw an outgoing request that hasn't been answered yet
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthMember(req);
  if (!auth) return jsonError("Unauthorized", 401);
  const { id } = await params;

  const connection = await db.connection.findUnique({ where: { id } });
  if (!connection) return jsonError("Connection not found", 404);
  if (connection.requesterId !== auth.id)
    return jsonError("Only the sender can withdraw a request", 403);
  if (connection.status !== "PENDING")
    return jsonError("An answered introduction can't be withdrawn — decline it instead", 409);

  try {
    await db.connection.delete({ where: { id } });
  } catch (e) {
    if (P2025(e)) return jsonError("Connection not found", 404);
    throw e;
  }
  return json({ ok: true });
}
