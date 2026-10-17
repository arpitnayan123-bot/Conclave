import { db } from "@/lib/db";
import { hashPassword, json, jsonError, signToken } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { token, password, bio, skills, roles } = (await req.json()) as {
      token: string; password: string; bio?: string; skills?: string; roles?: string;
    };

    if (!token) return jsonError("Invitation token is required");
    if (!password || password.length < 8)
      return jsonError("Password must be at least 8 characters");

    const invite = await db.invite.findUnique({ where: { token }, include: { application: true } });
    if (!invite) return jsonError("This invitation is invalid", 404);
    if (invite.status === "USED") return jsonError("This invitation has already been used", 410);

    const emailExists = await db.member.findUnique({ where: { email: invite.email } });
    if (emailExists) return jsonError("An account with this email already exists", 409);

    const member = await db.member.create({
      data: {
        inviteId: invite.id,
        name: invite.application.name,
        email: invite.email,
        passwordHash: hashPassword(password),
        college: invite.application.college,
        gradYear: invite.application.gradYear,
        bio: bio?.trim() || "",
        skills: skills?.trim() || invite.application.skills,
        roles: roles?.trim() || "Founder",
      },
    });

    await db.invite.update({
      where: { id: invite.id },
      data: { status: "USED", usedAt: new Date() },
    });

    const jwt = signToken({ sub: member.id, role: "member" });
    return json({
      token: jwt,
      member: {
        id: member.id, name: member.name, email: member.email, college: member.college,
        gradYear: member.gradYear, bio: member.bio, skills: member.skills,
        roles: member.roles, availableFor: member.availableFor,
      },
    });
  } catch (e) {
    console.error("signup failed", e);
    return jsonError("Signup failed. Please try again.", 500);
  }
}
