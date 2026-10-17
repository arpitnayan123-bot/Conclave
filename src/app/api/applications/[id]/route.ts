import { db } from "@/lib/db";
import { isAdminRequest, json, jsonError } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(req))) return jsonError("Unauthorized", 401);
  const { id } = await params;
  const body = await req.json();
  const { status, reviewNote } = body as { status?: string; reviewNote?: string };

  if (status && !["PENDING", "APPROVED", "REJECTED"].includes(status))
    return jsonError("Invalid status");

  const application = await db.application.update({
    where: { id },
    data: {
      ...(status ? { status } : {}),
      ...(reviewNote !== undefined ? { reviewNote } : {}),
    },
    include: { invite: true },
  });
  return json({ application });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(req))) return jsonError("Unauthorized", 401);
  const { id } = await params;
  await db.application.delete({ where: { id } });
  return json({ ok: true });
}
