import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getAuthMember, json, jsonError } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

const P2002 = (e: unknown) =>
  e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

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

// Send a connection request (an "introduction request" in club parlance)
export async function POST(req: Request) {
  const auth = await getAuthMember(req);
  if (!auth) return jsonError("Unauthorized", 401);
  if (!rateLimit(`intro:${auth.id}`, 20, 60 * 60_000))
    return jsonError("Too many introduction requests in an hour — let the circle breathe.", 429);

  const body = (await req.json().catch(() => null)) as {
    addresseeId?: unknown; message?: unknown;
  } | null;
  if (!body || typeof body.addresseeId !== "string" || !body.addresseeId)
    return jsonError("Invalid target member");
  const { addresseeId } = body;
  if (addresseeId === auth.id) return jsonError("You can't introduce yourself");
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (message.length > 500)
    return jsonError("The note is too long — 500 characters max");

  const target = await db.member.findUnique({ where: { id: addresseeId }, select: { id: true } });
  if (!target) return jsonError("Member not found", 404);

  const existing = await db.connection.findUnique({
    where: { requesterId_addresseeId: { requesterId: auth.id, addresseeId } },
  });
  if (existing) {
    if (existing.status === "DECLINED") {
      const updated = await db.connection.update({
        where: { id: existing.id },
        data: { status: "PENDING", message },
      });
      return json({ connection: updated });
    }
    if (existing.status === "ACCEPTED") {
      return json({ connection: existing, matched: true });
    }
    return jsonError("Connection request already exists", 409);
  }

  // If the other person already requested me, auto-accept (mutual interest).
  const reverse = await db.connection.findUnique({
    where: { requesterId_addresseeId: { requesterId: addresseeId, addresseeId: auth.id } },
  });
  if (reverse) {
    if (reverse.status === "PENDING") {
      const updated = await db.connection.update({
        where: { id: reverse.id },
        data: { status: "ACCEPTED" },
      });
      return json({ connection: updated, matched: true });
    }
    if (reverse.status === "ACCEPTED") {
      return json({ connection: reverse, matched: true });
    }
    // reverse DECLINED → fall through and create my fresh request
  }

  try {
    const connection = await db.connection.create({
      data: {
        requesterId: auth.id,
        addresseeId,
        message,
        status: "PENDING",
      },
    });
    return json({ connection });
  } catch (e) {
    if (P2002(e)) {
      // double-click race — re-read whatever row won and report it honestly
      const winner = await db.connection.findFirst({
        where: { OR: [{ requesterId: auth.id, addresseeId }, { requesterId: addresseeId, addresseeId: auth.id }] },
      });
      if (winner)
        return json({ connection: winner, matched: winner.status === "ACCEPTED" });
    }
    throw e;
  }
}
