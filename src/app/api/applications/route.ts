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

    // caps — everything here lands in the committee console verbatim
    if (name.trim().length > 80) return jsonError("Name is too long (80 characters max)");
    if (ideaTitle.trim().length > 120) return jsonError("Idea title is too long (120 characters max)");
    if (ideaPitch.trim().length > 4000)
      return jsonError("Your pitch is too long — 4000 characters max");
    if (skills.trim().length > 300) return jsonError("Skills list is too long (300 characters max)");
    if (lookingFor && lookingFor.trim().length > 300)
      return jsonError("“Looking for” is too long (300 characters max)");

    // stage must be a real stage
    const STAGES = ["IDEA", "PROTOTYPE", "MVP", "LAUNCHED"];
    if (stage && !STAGES.includes(stage)) return jsonError("Invalid stage");

    // linkedin must be a real http(s) URL — stored fields render as links in
    // the committee console, so javascript:/data: URLs are refused outright
    let linkedinSafe: string | null = null;
    if (linkedin?.trim()) {
      try {
        const u = new URL(linkedin.trim());
        if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("protocol");
        linkedinSafe = u.toString();
      } catch {
        return jsonError("LinkedIn must be a full URL starting with https://");
      }
    }

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
        linkedin: linkedinSafe,
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
    take: 500,
  });
  return json({ applications });
}
