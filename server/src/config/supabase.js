import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

const options = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
};

export const supabaseAdmin = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  options,
);

export function createUserClient(accessToken) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    ...options,
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });
}
