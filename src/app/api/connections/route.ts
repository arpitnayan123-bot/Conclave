import { db } from "@/lib/db";
import { getAuthMember, json, jsonError } from "@/lib/auth";

// Get my connections (incoming / outgoing / accepted)
export async function GET(req: Request) {
  const auth = await getAuthMember(req);
  if (!auth) return jsonError("Unauthorized", 401);

  const connections = await db.connection.findMany({
    where: { OR: [{ requesterId: auth.id }, { addresseeId: auth.id }] },
    include: {
      requester: { select: { id: true, name: true, college: true, roles: true, skills: true, gradYear: true } },
      addressee: { select: { id: true, name: true, college: true, roles: true, skills: true, gradYear: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return json({
    incoming: connections
      .filter((c) => c.addresseeId === auth.id && c.status === "PENDING")
      .map((c) => ({ ...c, other: c.requester })),
    outgoing: connections
      .filter((c) => c.requesterId === auth.id && c.status === "PENDING")
      .map((c) => ({ ...c, other: c.addressee })),
    accepted: connections
      .filter((c) => c.status === "ACCEPTED")
      .map((c) => ({ ...c, other: c.requesterId === auth.id ? c.addressee : c.requester })),
  });
}

// Send a connection request
export async function POST(req: Request) {
  const auth = await getAuthMember(req);
  if (!auth) return jsonError("Unauthorized", 401);
  const { addresseeId, message } = (await req.json()) as { addresseeId: string; message?: string };
  if (!addresseeId || addresseeId === auth.id) return jsonError("Invalid target member");

  const target = await db.member.findUnique({ where: { id: addresseeId } });
  if (!target) return jsonError("Member not found", 404);

  const existing = await db.connection.findUnique({
    where: { requesterId_addresseeId: { requesterId: auth.id, addresseeId } },
  });
  if (existing) {
    if (existing.status === "DECLINED") {
      const updated = await db.connection.update({
        where: { id: existing.id },
        data: { status: "PENDING", message: message?.trim() || "" },
      });
      return json({ connection: updated });
    }
    return jsonError("Connection request already exists");
  }

  // If the other person already requested me, auto-accept
  const reverse = await db.connection.findUnique({
    where: { requesterId_addresseeId: { requesterId: addresseeId, addresseeId: auth.id } },
  });
  if (reverse && reverse.status === "PENDING") {
    const updated = await db.connection.update({
      where: { id: reverse.id },
      data: { status: "ACCEPTED" },
    });
    return json({ connection: updated, matched: true });
  }

  const connection = await db.connection.create({
    data: {
      requesterId: auth.id,
      addresseeId,
      message: message?.trim() || "",
      status: "PENDING",
    },
  });
  return json({ connection });
}
