import { db } from "@/lib/db";
import { json, jsonError } from "@/lib/auth";

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return jsonError("Missing token");
  const invite = await db.invite.findUnique({
    where: { token },
    include: { application: { select: { name: true, college: true, ideaTitle: true } } },
  });
  if (!invite) return jsonError("This invitation link is invalid", 404);
  if (invite.status === "USED") return jsonError("This invitation has already been used", 410);
  return json({
    valid: true,
    invite: {
      email: invite.email,
      name: invite.application.name,
      college: invite.application.college,
      ideaTitle: invite.application.ideaTitle,
    },
  });
}
