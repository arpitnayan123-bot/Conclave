import { db } from "@/lib/db";
import { getAuthMember, json, jsonError } from "@/lib/auth";

// Accept or decline an incoming connection request
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthMember(req);
  if (!auth) return jsonError("Unauthorized", 401);
  const { id } = await params;
  const { status } = (await req.json()) as { status: "ACCEPTED" | "DECLINED" };
  if (!["ACCEPTED", "DECLINED"].includes(status)) return jsonError("Invalid status");

  const connection = await db.connection.findUnique({ where: { id } });
  if (!connection) return jsonError("Connection not found", 404);
  if (connection.addresseeId !== auth.id) return jsonError("Not your request to answer", 403);
  if (connection.status !== "PENDING") return jsonError("This request was already handled");

  const updated = await db.connection.update({ where: { id }, data: { status } });
  return json({ connection: updated });
}
