import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Pasted env values frequently carry a trailing newline/space, a trailing
// slash, or even a path like `/rest/v1/` (the REST endpoint shown in the
// dashboard). The Supabase client expects ONLY the project origin
// (https://<ref>.supabase.co) and appends /auth/v1, /rest/v1 itself — so we
// normalise whatever was provided down to its origin.
const SUPA_HOST = /\.supabase\.(co|in|net)$/i;

function normaliseUrl(raw?: string): string | undefined {
  const v = raw?.trim();
  if (!v) return undefined;
  try {
    const u = new URL(v);
    if (u.protocol !== 'https:' || !SUPA_HOST.test(u.hostname)) return undefined;
    return `https://${u.hostname}`; // origin only — drop any path/query
  } catch {
    return undefined;
  }
}

const url = normaliseUrl(import.meta.env.VITE_SUPABASE_URL as string | undefined);
const anonKey = (
  import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
)?.trim();

// The anon "public" key is a JWT: header.payload.signature
const keyIsJwt = !!anonKey && anonKey.split('.').length === 3;
const looksValid = !!url && keyIsJwt;

if ((import.meta.env.VITE_SUPABASE_URL || anonKey) && !looksValid) {
  // eslint-disable-next-line no-console
  console.warn(
    '[ShotIQ] Supabase env invalid — login/sync disabled.\n' +
      `  VITE_SUPABASE_URL → ${url ?? '(unparseable; use https://<ref>.supabase.co with NO path)'}\n` +
      `  VITE_SUPABASE_ANON_KEY → ${
        anonKey ? (keyIsJwt ? 'ok' : 'not a JWT — use the anon "public" key') : '(missing)'
      }`,
  );
}

/**
 * Supabase is optional. When the env vars are absent/invalid the whole app
 * still works against localStorage; cloud sync + Google login stay off.
 */
export const supabase: SupabaseClient | null = looksValid
  ? createClient(url!, anonKey!)
  : null;

export const isCloudEnabled = supabase != null;
