import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { isAdminRequest, json, jsonError } from "@/lib/auth";

const P2025 = (e: unknown) =>
  e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(req))) return jsonError("Unauthorized", 401);
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as {
    status?: string; reviewNote?: string;
  } | null;
  if (!body) return jsonError("Invalid JSON body", 400);
  const { status, reviewNote } = body;

  if (status && !["PENDING", "APPROVED", "REJECTED"].includes(status))
    return jsonError("Invalid status");
  if (reviewNote !== undefined && (typeof reviewNote !== "string" || reviewNote.length > 1000))
    return jsonError("Review note must be at most 1000 characters", 400);

  try {
    const application = await db.application.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(reviewNote !== undefined ? { reviewNote } : {}),
      },
      include: { invite: true },
    });
    return json({ application });
  } catch (e) {
    if (P2025(e)) return jsonError("Application not found", 404);
    throw e;
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(req))) return jsonError("Unauthorized", 401);
  const { id } = await params;

  // Guard the cascade: deleting a petition cascades its invitation, which
  // cascades the ADMITTED MEMBER (and everything they built in the club).
  // A stale petition with a living seat must be kept — remove the seat first.
  const application = await db.application.findUnique({
    where: { id },
    include: { invite: { include: { member: { select: { id: true, name: true } } } } },
  });
  if (!application) return jsonError("Application not found", 404);
  if (application.invite?.member) {
    return jsonError(
      `This petition has an admitted member (${application.invite.member.name}). Remove the seat first.`,
      409
    );
  }

  try {
    await db.application.delete({ where: { id } });
    return json({ ok: true });
  } catch (e) {
    if (P2025(e)) return jsonError("Application not found", 404);
    throw e;
  }
}
