import { db } from "@/lib/db";

/**
 * Public "network pulse" — the latest anonymized activity across the network,
 * for the landing-page live ticker. Deliberately coarse: first names + campus
 * + idea titles only. Never emails, handles, or private messages.
 */
export async function GET() {
  try {
    return await buildPulse();
  } catch (e) {
    // a pulse outage must never take the landing page down — serve an empty
    // ticker and log loudly instead of throwing a 500 at first paint
    console.error("[pulse] failed to build the network pulse", e);
    return json({ pulse: [] });
  }
}

async function buildPulse() {
  const since = new Date(Date.now() - 30 * 24 * 3_600_000); // 30-day window

  const [ideas, interests, comments, connections, joinedInvites] = await Promise.all([
    db.idea.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, title: true, createdAt: true, author: { select: { name: true, college: true } } },
    }),
    db.interest.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        createdAt: true,
        member: { select: { college: true } },
        idea: { select: { title: true } },
      },
    }),
    db.comment.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        createdAt: true,
        member: { select: { name: true } },
        idea: { select: { title: true } },
      },
    }),
    db.connection.findMany({
      where: { status: "ACCEPTED", createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        createdAt: true,
        requester: { select: { college: true } },
        addressee: { select: { college: true } },
      },
    }),
    db.invite.findMany({
      where: { status: "USED", usedAt: { not: null, gte: since } },
      orderBy: { usedAt: "desc" },
      take: 5,
      select: { id: true, usedAt: true, createdAt: true, application: { select: { college: true } } },
    }),
  ]);

  type PulseItem = {
    id: string;
    kind: "idea" | "interest" | "comment" | "connection" | "join";
    text: string;
    at: string;
  };

  const items: PulseItem[] = [];

  for (const i of ideas) {
    items.push({
      id: `idea:${i.id}`,
      kind: "idea",
      text: `${first(i.author.name)} from ${short(i.author.college)} posted “${i.title}”`,
      at: i.createdAt.toISOString(),
    });
  }
  for (const it of interests) {
    items.push({
      id: `interest:${it.id}`,
      kind: "interest",
      text: `A founder from ${short(it.member.college)} raised their hand to join “${it.idea.title}”`,
      at: it.createdAt.toISOString(),
    });
  }
  for (const c of comments) {
    items.push({
      id: `comment:${c.id}`,
      kind: "comment",
      text: `${first(c.member.name)} joined the discussion on “${c.idea.title}”`,
      at: c.createdAt.toISOString(),
    });
  }
  for (const c of connections) {
    items.push({
      id: `connection:${c.id}`,
      kind: "connection",
      text: `Two founders connected — ${short(c.requester.college)} × ${short(c.addressee.college)}`,
      at: c.createdAt.toISOString(),
    });
  }
  for (const inv of joinedInvites) {
    const at = inv.usedAt ?? inv.createdAt;
    items.push({
      id: `join:${inv.id}`,
      kind: "join",
      text: `A new builder from ${short(inv.application.college)} accepted their invite`,
      at: at.toISOString(),
    });
  }

  items.sort((a, b) => (a.at < b.at ? 1 : -1));

  return json({
    pulse: items.slice(0, 10).map((i) => ({ ...i, ago: agoLabel(i.at) })),
  });
}

function first(name: string) {
  return name.split(" ")[0];
}

/** "Manipal Institute of Technology" → "Manipal Institute" — keeps the ticker tight */
function short(college: string) {
  if (college.length <= 14) return college;
  const cut = college.lastIndexOf(" ", 14);
  // no space to cut on (single long word) — truncate instead of dropping the last char
  return cut > 0 ? college.slice(0, cut) : `${college.slice(0, 13)}…`;
}

function agoLabel(iso: string): string {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
}

function json(data: unknown) {
  return Response.json(data, {
    headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
  });
}
