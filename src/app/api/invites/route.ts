import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { generateInviteToken, isAdminRequest, json, jsonError } from "@/lib/auth";

// List all invites (admin)
export async function GET(req: Request) {
  if (!(await isAdminRequest(req))) return jsonError("Unauthorized", 401);
  const invites = await db.invite.findMany({
    include: { application: true, member: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });
  return json({ invites });
}

// Create (or re-fetch) an invite for an approved application
export async function POST(req: Request) {
  if (!(await isAdminRequest(req))) return jsonError("Unauthorized", 401);
  const body = (await req.json().catch(() => null)) as { applicationId?: string } | null;
  if (!body?.applicationId) return jsonError("Invalid JSON body", 400);
  const { applicationId } = body;
  const application = await db.application.findUnique({ where: { id: applicationId } });
  if (!application) return jsonError("Application not found", 404);
  if (application.status !== "APPROVED")
    return jsonError("Only approved applications can receive invitations");

  const existing = await db.invite.findUnique({ where: { applicationId } });
  if (existing) return json({ invite: existing, reused: true });

  try {
    const invite = await db.invite.create({
      data: {
        token: generateInviteToken(),
        applicationId,
        email: application.email,
        status: "SENT",
      },
    });
    return json({ invite });
  } catch (e) {
    // double-click race: another tab minted it first — hand back that one
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const invite = await db.invite.findUnique({ where: { applicationId } });
      if (invite) return json({ invite, reused: true });
    }
    throw e;
  }
}
