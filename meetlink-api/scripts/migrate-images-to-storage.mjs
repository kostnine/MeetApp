// One-time migration: move existing base64 data-URL images out of Postgres text columns
// into Supabase Storage, replacing each column value with the public URL.
//
// New uploads are already offloaded by the app (src/common/image-storage.ts); this backfills
// rows created before that. Safe to re-run (only touches values still starting with data:image).
//
// Usage (from outputs/meetlink-api):
//   SUPABASE_URL=https://<proj>.supabase.co SUPABASE_SERVICE_KEY=<service-role> \
//   SUPABASE_BUCKET=meetlink node scripts/migrate-images-to-storage.mjs
// (DATABASE_URL / DATABASE_PASSWORD are read from the env / .env, like the other scripts.)

import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import pg from 'pg';

const { Pool } = pg;

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.SUPABASE_BUCKET || 'meetlink';
const DATA_URL_RE = /^data:(image\/[a-z0-9.+-]+);base64,([\s\S]+)$/i;

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is missing.');
if (!SUPABASE_URL || !SERVICE_KEY) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY are required.');

const url = new URL(process.env.DATABASE_URL);
const isSupabase = url.hostname.includes('supabase.');
if (process.env.DATABASE_PASSWORD) url.password = process.env.DATABASE_PASSWORD;
if (isSupabase) url.searchParams.delete('sslmode');

const pool = new Pool({
  connectionString: url.toString(),
  ssl: isSupabase ? { rejectUnauthorized: false } : undefined,
});

async function upload(dataUrl, prefix) {
  const m = DATA_URL_RE.exec(String(dataUrl).trim());
  if (!m) return null;
  const mime = m[1].toLowerCase();
  const ext = (mime.split('/')[1] || 'bin').replace('jpeg', 'jpg').replace(/[^a-z0-9]/g, '') || 'bin';
  const key = `${prefix}/${Date.now()}-${randomBytes(8).toString('hex')}.${ext}`;
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodeURI(key)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': mime, 'x-upsert': 'true' },
    body: Buffer.from(m[2], 'base64'),
  });
  if (!res.ok) throw new Error(`upload failed (${res.status}): ${await res.text()}`);
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${encodeURI(key)}`;
}

async function migrate(table, column, prefix) {
  const { rows } = await pool.query(
    `select id, ${column} as val from ${table} where ${column} like 'data:image/%'`,
  );
  console.log(`${table}.${column}: ${rows.length} data-URL rows`);
  let ok = 0;
  for (const row of rows) {
    try {
      const publicUrl = await upload(row.val, prefix);
      if (!publicUrl) continue;
      await pool.query(`update ${table} set ${column} = $2 where id = $1`, [row.id, publicUrl]);
      ok += 1;
    } catch (e) {
      console.error(`  ! ${table} ${row.id}: ${e.message}`);
    }
  }
  console.log(`  → migrated ${ok}/${rows.length}`);
}

try {
  await migrate('profiles', 'avatar_url', 'avatars');
  await migrate('stories', 'image_url', 'stories');
  await migrate('profile_photos', 'image_url', 'photos');
  console.log('Done.');
} finally {
  await pool.end();
}
