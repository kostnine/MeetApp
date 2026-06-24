import { randomBytes } from 'node:crypto';

const DATA_URL_RE = /^data:(image\/[a-z0-9.+-]+);base64,([\s\S]+)$/i;

/**
 * Transparently offload a base64 image data-URL to Supabase Storage and return its public
 * URL, so large blobs stop living in Postgres text columns (and in every row a query returns,
 * e.g. the conversation list's avatars).
 *
 * If `value` is NOT a data-URL (already a URL, or null) it is returned unchanged. If Storage
 * isn't configured, or the upload fails, the ORIGINAL data-URL is returned — so user actions
 * never break and there is zero behavior change until the env vars below are set.
 *
 * To activate (no code change): create a PUBLIC Supabase Storage bucket and set
 *   SUPABASE_URL            = https://<project>.supabase.co
 *   SUPABASE_SERVICE_KEY    = <service-role key>   (or SUPABASE_SERVICE_ROLE_KEY)
 *   SUPABASE_BUCKET         = <bucket name>        (optional, default "meetlink")
 */
export async function offloadImage(value: string | null | undefined, prefix: string): Promise<string | null> {
  if (value === undefined || value === null) return value ?? null;
  const match = DATA_URL_RE.exec(value.trim());
  if (!match) return value; // already a URL (or not an image data-URL) → store as-is

  const supabaseUrl = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_BUCKET || 'meetlink';
  if (!supabaseUrl || !serviceKey) return value; // not configured → keep the data-URL (no regression)

  const mime = match[1].toLowerCase();
  const ext = (mime.split('/')[1] || 'bin').replace('jpeg', 'jpg').replace(/[^a-z0-9]/g, '') || 'bin';
  const bytes = Buffer.from(match[2], 'base64');
  const key = `${prefix}/${Date.now()}-${randomBytes(8).toString('hex')}.${ext}`;

  try {
    const res = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${encodeURI(key)}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': mime,
        'x-upsert': 'true',
      },
      body: bytes,
    });
    if (!res.ok) return value; // upload failed → keep the data-URL so the user's save still works
    return `${supabaseUrl}/storage/v1/object/public/${bucket}/${encodeURI(key)}`;
  } catch {
    return value; // network/other error → graceful fallback
  }
}
