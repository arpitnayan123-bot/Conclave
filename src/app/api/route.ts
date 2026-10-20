import { db } from "@/lib/db";

// Health probe: process liveness + a real database round-trip.
// Safe to poll from uptime monitors and QA rounds — it must never throw.
export async function GET() {
  let database: "up" | "down" = "down";
  try {
    await db.$queryRaw`SELECT 1`;
    database = "up";
  } catch {
    // reported honestly below; a failed probe is data, not a crash
  }
  return Response.json({
    ok: database === "up",
    service: "conclave-api",
    database,
    time: new Date().toISOString(),
  });
}
