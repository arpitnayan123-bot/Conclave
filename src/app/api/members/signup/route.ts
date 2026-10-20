import { db } from "@/lib/db";
import { hashPassword, json, jsonError, signToken } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    if (!rateLimit(`signup:${clientIp(req)}`, 5, 60 * 60_000))
      return jsonError("Too many signup attempts from this network. Try again later.", 429);

    const { token, password, bio, skills, roles } = (await req.json()) as {
      token: string; password: string; bio?: string; skills?: string; roles?: string;
    };

    // field-type guard — arrays or objects from non-UI clients would crash
    // .trim() / Prisma downstream as an opaque 500; refuse them cleanly
    for (const [k, v] of Object.entries({ token, password, bio, skills, roles })) {
      if (v !== undefined && typeof v !== "string") return jsonError(`Invalid field: ${k}`, 400);
    }

    if (!token) return jsonError("Invitation token is required");
    if (!password || password.length < 8)
      return jsonError("Password must be at least 8 characters");
    if (password.length > 200) return jsonError("Password is too long");
    // profile fields land on cards and the directory — cap them
    if (bio && bio.length > 600) return jsonError("Bio is too long (600 characters max)");
    if (skills && skills.length > 300) return jsonError("Skills list is too long (300 characters max)");
    if (roles && roles.length > 200) return jsonError("Roles are too long (200 characters max)");

    const invite = await db.invite.findUnique({ where: { token }, include: { application: true } });
    if (!invite) return jsonError("This invitation is invalid", 404);
    if (invite.status === "USED") return jsonError("This invitation has already been used", 410);
    if (invite.expiresAt && invite.expiresAt.getTime() < Date.now())
      return jsonError("This invitation has expired — ask the committee to extend a fresh one", 410);

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
