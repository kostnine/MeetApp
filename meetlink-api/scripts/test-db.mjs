import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
const password = process.env.DATABASE_PASSWORD;

if (!connectionString) {
  throw new Error('DATABASE_URL is missing.');
}

const url = new URL(connectionString);
const isSupabase = url.hostname.includes('supabase.');

if (password) {
  url.password = password;
}

if (isSupabase) {
  url.searchParams.delete('sslmode');
}

console.log(`host=${url.hostname}`);
console.log(`user=${url.username}`);
console.log(`passwordLength=${password?.length ?? 0}`);

const pool = new Pool({
  connectionString: url.toString(),
  ssl: isSupabase ? { rejectUnauthorized: false } : undefined,
});

try {
  const result = await pool.query('select current_user, current_database()');
  console.log(JSON.stringify(result.rows[0], null, 2));
}
catch (error) {
  console.error(`ERROR_CODE=${error.code}`);
  console.error(`ERROR_MESSAGE=${error.message}`);
  process.exitCode = 1;
}
finally {
  await pool.end();
}
