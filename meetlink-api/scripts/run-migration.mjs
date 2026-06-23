import 'dotenv/config';
import { readFileSync } from 'node:fs';
import pg from 'pg';

const file = process.argv[2];
if (!file) {
  console.error('usage: node scripts/run-migration.mjs <file.sql>');
  process.exit(1);
}

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;
const password = process.env.DATABASE_PASSWORD;

if (!connectionString) {
  throw new Error('DATABASE_URL is missing.');
}

const url = new URL(connectionString);
const isSupabase = url.hostname.includes('supabase.');
if (password) url.password = password;
if (isSupabase) url.searchParams.delete('sslmode');

const pool = new Pool({
  connectionString: url.toString(),
  ssl: isSupabase ? { rejectUnauthorized: false } : undefined,
});

const sql = readFileSync(file, 'utf8');

try {
  await pool.query(sql);
  console.log(`Applied ${file}`);
} catch (error) {
  console.error(`ERROR_CODE=${error.code}`);
  console.error(`ERROR_MESSAGE=${error.message}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
