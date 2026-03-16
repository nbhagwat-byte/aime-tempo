import { createClient } from '@supabase/supabase-js';

function requireEnv(name: 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY'): string {
  const value = import.meta.env[name];
  if (!value || typeof value !== 'string' || !value.trim()) {
    throw new Error(
      `[aime Tempo] Missing required env var: ${name}. ` +
        `Set it in Vercel Project Settings → Environment Variables.`
    );
  }
  return value;
}

export const supabase = createClient(
  requireEnv('VITE_SUPABASE_URL'),
  requireEnv('VITE_SUPABASE_ANON_KEY')
);

