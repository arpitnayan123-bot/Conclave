import { db } from "@/lib/db";
import { json, jsonError } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";

// Public application status tracker — an applicant checks their own review
// status by email. Returns minimal, non-sensitive fields only (no pitch,
// no review notes). Exact-match on the Gmail used at submission.

export async function POST(req: Request) {
  try {
    if (!rateLimit(`track:${clientIp(req)}`, 12, 10 * 60_000))
      return jsonError("Too many lookups from this network. Try again in a few minutes.", 429);

    const body = (await req.json()) as { email?: string };
    const email = body.email?.trim().toLowerCase();
    if (!email || !/^[^\s@]+@gmail\.com$/i.test(email))
      return jsonError("Enter the Gmail address you applied with");

    const applications = await db.application.findMany({
      where: { email },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        ideaTitle: true,
        stage: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        invite: { select: { status: true } },
      },
    });

    return json({
      applications: applications.map((a) => ({
        id: a.id,
        ideaTitle: a.ideaTitle,
        stage: a.stage,
        status: a.status,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
        invited: a.invite?.status === "SENT" || a.invite?.status === "USED",
      })),
    });
  } catch (e) {
    console.error("application status lookup failed", e);
    return jsonError("Something went wrong. Please try again.", 500);
  }
}
