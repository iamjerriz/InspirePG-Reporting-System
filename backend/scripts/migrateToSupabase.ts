/**
 * One-time migration: pushes existing rows from data/logger.xlsx and their
 * proof images from uploads/ into the new Supabase-backed store.
 *
 * Usage (after filling in backend/.env with your Supabase project's values
 * and running supabase/schema.sql against that project):
 *
 *   cd backend
 *   npx tsx scripts/migrateToSupabase.ts
 *
 * Safe to re-run: rows already present (matched by sid + timestamp) are
 * skipped rather than duplicated.
 */
import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { config } from "../src/config";
import { appendLogRow, readAllLogRows } from "../src/db";
import { supabase } from "../src/supabaseClient";

const EXCEL_FILE_PATH = path.resolve(__dirname, "../data/logger.xlsx");
const UPLOADS_DIR = path.resolve(__dirname, "../uploads");

const MIME_BY_EXTENSION: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

interface LegacyRow {
  timestamp: string;
  firstName: string;
  lastName: string;
  sid: string;
  area: string;
  sellerType: string;
  proofFilename: string;
}

function readLegacyRows(): LegacyRow[] {
  if (!fs.existsSync(EXCEL_FILE_PATH)) {
    console.log(`No logger.xlsx found at ${EXCEL_FILE_PATH} - nothing to migrate.`);
    return [];
  }

  const workbook = XLSX.readFile(EXCEL_FILE_PATH);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });

  return rows
    .slice(1)
    .filter((row) => Array.isArray(row) && row.length > 0)
    .map((row) => ({
      timestamp: String(row[0] ?? ""),
      firstName: String(row[1] ?? ""),
      lastName: String(row[2] ?? ""),
      sid: String(row[3] ?? ""),
      area: String(row[4] ?? ""),
      sellerType: String(row[5] ?? ""),
      proofFilename: String(row[6] ?? ""),
    }));
}

async function uploadLegacyProofFile(filename: string): Promise<void> {
  const localPath = path.join(UPLOADS_DIR, filename);
  if (!fs.existsSync(localPath)) {
    console.warn(`  proof file missing on disk, skipping upload: ${filename}`);
    return;
  }

  const extension = path.extname(filename).toLowerCase();
  const buffer = fs.readFileSync(localPath);

  const { error } = await supabase.storage.from(config.supabaseStorageBucket).upload(filename, buffer, {
    contentType: MIME_BY_EXTENSION[extension] ?? "application/octet-stream",
    upsert: true,
  });

  if (error) {
    throw new Error(`Failed to upload ${filename} to storage: ${error.message}`);
  }
}

async function main() {
  const legacyRows = readLegacyRows();
  if (legacyRows.length === 0) return;

  const existing = await readAllLogRows();
  const existingKeys = new Set(existing.map((row) => `${row.sid}__${row.timestamp}`));

  console.log(`Found ${legacyRows.length} row(s) in logger.xlsx.`);

  let migrated = 0;
  let skipped = 0;

  for (const row of legacyRows) {
    const key = `${row.sid}__${row.timestamp}`;
    if (existingKeys.has(key)) {
      skipped += 1;
      continue;
    }

    console.log(`Migrating: ${row.firstName} ${row.lastName} (${row.sid}) @ ${row.timestamp}`);

    if (row.proofFilename) {
      await uploadLegacyProofFile(row.proofFilename);
    }

    await appendLogRow(row);
    migrated += 1;
  }

  console.log(`Done. Migrated ${migrated} row(s), skipped ${skipped} already-present row(s).`);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
