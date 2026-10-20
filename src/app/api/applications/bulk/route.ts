import { db } from "@/lib/db";
import { generateInviteToken, isAdminRequest, json, jsonError } from "@/lib/auth";

// Same fortnight TTL as single mints — see src/app/api/invites/route.ts.
const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

const ACTIONS = ["APPROVED", "REJECTED", "PENDING"] as const;
type Action = (typeof ACTIONS)[number];

/**
 * POST /api/applications/bulk  (admin)
 * Body: { ids: string[], action: "APPROVED" | "REJECTED" | "PENDING", reviewNote?: string, createInvites?: boolean }
 * Applies one decision to many applications; optionally auto-creates invites
 * for applications that end up APPROVED without one.
 */
export async function POST(req: Request) {
  if (!(await isAdminRequest(req))) return jsonError("Unauthorized", 401);

  let body: { ids?: unknown; action?: string; reviewNote?: unknown; createInvites?: boolean };
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request body");
  }

  const ids = Array.isArray(body.ids)
    ? body.ids.filter((i): i is string => typeof i === "string" && i.length > 0)
    : [];
  const action = body.action as Action;
  const reviewNote = typeof body.reviewNote === "string" ? body.reviewNote : undefined;
  const createInvites = Boolean(body.createInvites);

  if (ids.length === 0) return jsonError("Select at least one application");
  if (ids.length > 100) return jsonError("Too many applications in one batch (max 100)");
  if (!action || !ACTIONS.includes(action)) return jsonError("Invalid action");

  // ensure the targets exist
  const targets = await db.application.findMany({
    where: { id: { in: ids } },
    include: { invite: true },
  });
  if (targets.length === 0) return jsonError("No matching applications", 404);

  // optionally mint invites for newly-approved applications that lack one
  const createdInvites: {
    id: string;
    token: string;
    email: string;
    application: { name: string; ideaTitle: string };
  }[] = [];

  // one transaction: a mid-batch failure must not leave some applications
  // approved while others stay pending, or half the invites minted
  await db.$transaction(async (tx) => {
    await tx.application.updateMany({
      where: { id: { in: targets.map((t) => t.id) } },
      data: {
        status: action,
        ...(reviewNote !== undefined ? { reviewNote } : {}),
      },
    });

    if (action === "APPROVED" && createInvites) {
      const needsInvite = targets.filter((t) => !t.invite);
      for (const t of needsInvite) {
        const invite = await tx.invite.create({
          data: {
            token: generateInviteToken(),
            applicationId: t.id,
            email: t.email,
            status: "SENT",
            expiresAt: new Date(Date.now() + INVITE_TTL_MS),
          },
        });
        createdInvites.push({
          id: invite.id,
          token: invite.token,
          email: invite.email,
          application: { name: t.name, ideaTitle: t.ideaTitle },
        });
      }
    }
  });

  const totalInvitesForBatch = await db.invite.count({
    where: { applicationId: { in: targets.map((t) => t.id) } },
  });

  return json({
    updated: targets.length,
    invited: createdInvites.length,
    invites: createdInvites,
    totalInvitesForBatch,
  });
}
