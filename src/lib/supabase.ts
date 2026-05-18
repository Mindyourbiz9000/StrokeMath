import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Defensive parsing: pasted env values frequently carry a trailing newline
// or space, and the URL is often pasted with a trailing slash — both produce
// the GoTrue "No API key found in request" error on OAuth redirects.
const rawUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const url = rawUrl?.replace(/\/+$/, '');
const anonKey = (
  import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
)?.trim();

const looksValid =
  !!url &&
  /^https:\/\/[a-z0-9-]+\.supabase\.(co|in|net)$/i.test(url) &&
  !!anonKey &&
  anonKey.split('.').length === 3; // anon key is a JWT (header.payload.sig)

if (import.meta.env.DEV && (url || anonKey) && !looksValid) {
  // eslint-disable-next-line no-console
  console.warn(
    '[ShotIQ] Supabase env looks misconfigured.\n' +
      `  VITE_SUPABASE_URL  = ${url ?? '(missing)'}  (expected https://<ref>.supabase.co)\n` +
      `  VITE_SUPABASE_ANON_KEY ${anonKey ? 'set' : '(missing)'} ` +
      `${anonKey && anonKey.split('.').length !== 3 ? '— not a JWT, use the anon "public" key' : ''}`,
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
