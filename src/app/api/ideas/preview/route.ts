import { db } from "@/lib/db";

// Public teaser for the landing page: latest ideas circulating inside the network.
// Deliberately minimal — title/stage/needs + author first name & college only.
export async function GET() {
  const ideas = await db.idea.findMany({
    orderBy: { createdAt: "desc" },
    take: 3,
    select: {
      id: true,
      title: true,
      stage: true,
      needs: true,
      createdAt: true,
      author: { select: { name: true, college: true } },
      _count: { select: { interests: true, comments: true } },
    },
  });

  return json({
    ideas: ideas.map((i) => ({
      id: i.id,
      title: i.title,
      stage: i.stage,
      needs: i.needs,
      createdAt: i.createdAt.toISOString(),
      authorFirstName: i.author.name.split(" ")[0],
      authorCollege: i.author.college,
      interestCount: i._count.interests,
      commentCount: i._count.comments,
    })),
  });
}

function json(data: unknown) {
  return Response.json(data, {
    headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
  });
}
