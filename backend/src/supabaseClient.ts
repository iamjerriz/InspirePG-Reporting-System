import { createClient } from "@supabase/supabase-js";
import { config } from "./config";

// Server-side only client, authenticated with the service role key. This key
// bypasses Row Level Security, so it must never be sent to the frontend -
// only ever used from backend code.
export const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
