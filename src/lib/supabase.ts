import { createClient } from "@supabase/supabase-js";

// Vercel values created from Windows stdin can contain a BOM and trailing
// CR/LF characters. Strip them before creating the client; an untrimmed key
// is rejected as an invalid HTTP header before Supabase can make a request.
const cleanEnvValue = (value: unknown): string =>
  typeof value === "string" ? value.replace(/^\uFEFF/, "").trim() : "";

const supabaseUrl = cleanEnvValue(import.meta.env.VITE_SUPABASE_URL);
const supabaseKey = cleanEnvValue(import.meta.env.VITE_SUPABASE_ANON_KEY);

export const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
