import { db } from "@/lib/db";
import { isAdminRequest, json, jsonError } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    if (!rateLimit(`apply:${clientIp(req)}`, 5, 10 * 60_000))
      return jsonError("Too many submissions from this network. Try again in a few minutes.", 429);

    const body = await req.json();
    const {
      name, email, college, gradYear, linkedin,
      ideaTitle, ideaPitch, stage, skills, lookingFor,
    } = body as Record<string, string>;

    if (!name?.trim() || name.trim().length < 2) return jsonError("Please enter your full name");
    if (!email?.trim() || !/^[^\s@]+@gmail\.com$/i.test(email.trim()))
      return jsonError("A valid Gmail address is required (invitations are sent to Gmail only)");
    if (!college) return jsonError("Please select your campus");
    if (!gradYear) return jsonError("Please select your graduation year");
    if (!ideaTitle?.trim() || ideaTitle.trim().length < 4)
      return jsonError("Give your idea a clear title");
    if (!ideaPitch?.trim() || ideaPitch.trim().length < 80)
      return jsonError("Your pitch must be at least 80 characters — tell us the real story");
    if (!skills?.trim()) return jsonError("Add at least one skill");

    const dup = await db.application.findFirst({
      where: { email: email.trim().toLowerCase(), ideaTitle: ideaTitle.trim() },
    });
    if (dup) return jsonError("You have already submitted this idea. Our team is reviewing it.");

    const application = await db.application.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        college,
        gradYear,
        linkedin: linkedin?.trim() || null,
        ideaTitle: ideaTitle.trim(),
        ideaPitch: ideaPitch.trim(),
        stage: stage || "IDEA",
        skills: skills.trim(),
        lookingFor: lookingFor?.trim() || "",
      },
    });
    return json({ ok: true, id: application.id });
  } catch (e) {
    console.error("application submit failed", e);
    return jsonError("Something went wrong. Please try again.", 500);
  }
}

export async function GET(req: Request) {
  if (!(await isAdminRequest(req))) return jsonError("Unauthorized", 401);
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const applications = await db.application.findMany({
    where: status ? { status } : undefined,
    include: { invite: true },
    orderBy: { createdAt: "desc" },
  });
  return json({ applications });
}
