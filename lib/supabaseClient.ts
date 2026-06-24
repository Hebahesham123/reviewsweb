import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase env vars. Copy .env.local.example to .env.local and fill in your values."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Review = {
  id: string;
  reviewer_name: string;
  product_rating: number | null;
  shipping_rating: number | null;
  support_rating: number | null;
  experience_level: "Easy" | "Medium" | "Hard" | null;
  review_comment: string | null;
  created_at: string;
};
