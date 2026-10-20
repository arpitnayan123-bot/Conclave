import fs from "fs";
import path from "path";
import { db } from "@/lib/db";
import { isAdminRequest, json, jsonError } from "@/lib/auth";

/**
 * The house ledger, snapshotted.
 *
 * POST /api/admin/backup — take a consistent SQLite snapshot (VACUUM INTO)
 *                          and keep only the newest KEEP files. Admin-gated.
 * GET  /api/admin/backup — list existing snapshots. Admin-gated.
 *
 * The snapshot path is generated server-side from a timestamp alone — no user
 * input ever reaches the SQL string, so $executeRawUnsafe is a deliberate,
 * reviewed use. VACUUM INTO copies the database through SQLite's own backup
 * machinery, so the file is a consistent point-in-time image even under
 * concurrent writes.
 */

const BACKUP_DIR = path.join(process.cwd(), "db", "backups");
const KEEP = 5;
const NAME = /^conclave-\d{4}-\d{2}-\d{2}T[\d-]+Z\.db$/;

function listSnapshots() {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  return fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => NAME.test(f))
    .map((f) => {
      const st = fs.statSync(path.join(BACKUP_DIR, f));
      return { file: f, sizeBytes: st.size, createdAt: st.mtime.toISOString() };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function GET(req: Request) {
  if (!(await isAdminRequest(req))) return jsonError("Unauthorized", 401);
  return json({ backups: listSnapshots() });
}

export async function POST(req: Request) {
  if (!(await isAdminRequest(req))) return jsonError("Unauthorized", 401);
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  // filesystem-safe timestamp (2025-10-20T09-12-33Z). Two snapshots can land
  // in the same second, and VACUUM INTO refuses to overwrite — so a -2, -3…
  // suffix walks forward until the name is free.
  const base = new Date()
    .toISOString()
    .replace(/\.\d+Z$/, "")
    .replace(/:/g, "-");
  let file = path.join(BACKUP_DIR, `conclave-${base}Z.db`);
  for (let n = 2; fs.existsSync(file); n += 1) {
    file = path.join(BACKUP_DIR, `conclave-${base}-${n}Z.db`);
  }

  try {
    await db.$executeRawUnsafe(`VACUUM INTO '${file}'`);
  } catch (e) {
    console.error("[backup] snapshot failed", e);
    return jsonError("Snapshot failed — the ledger stayed untouched. Check server logs.", 500);
  }

  // prune: the newest KEEP snapshots survive
  for (const old of listSnapshots().slice(KEEP)) {
    try {
      fs.unlinkSync(path.join(BACKUP_DIR, old.file));
    } catch {
      // best effort — a locked file just rides to the next round
    }
  }

  const backups = listSnapshots();
  return json({
    ok: true,
    file: path.basename(file),
    sizeBytes: fs.statSync(file).size,
    kept: backups.length,
    backups,
  });
}
