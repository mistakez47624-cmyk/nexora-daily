import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env["VITE_SUPABASE_URL"]?.trim();
const supabaseKey =
  import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"]?.trim() ||
  import.meta.env["VITE_SUPABASE_ANON_KEY"]?.trim();

export const supabaseConfigured = Boolean(supabaseUrl && supabaseKey);

/** Uses only the public publishable/anon key. Never put a service-role key here. */
export const supabase =
  supabaseConfigured && supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: true,
          persistSession: true,
        },
      })
    : null;
