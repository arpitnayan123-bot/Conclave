import { db } from "@/lib/db";
import { json } from "@/lib/auth";

export async function GET() {
  try {
    const [applications, members, ideas, invites, colleges, rejected, approved] =
      await Promise.all([
        db.application.count(),
        db.member.count(),
        db.idea.count(),
        db.invite.count(),
        db.member.findMany({ select: { college: true }, distinct: ["college"] }),
        db.application.count({ where: { status: "REJECTED" } }),
        db.application.count({ where: { status: "APPROVED" } }),
      ]);
    return json({
      applications,
      members,
      ideas,
      invites,
      colleges: colleges.length,
      // real deliberation record — decided = petitions the committee has ruled on
      decided: rejected + approved,
      declined: rejected,
    });
  } catch {
    return json({
      applications: 0, members: 0, ideas: 0, invites: 0, colleges: 0,
      decided: 0, declined: 0,
    });
  }
}
