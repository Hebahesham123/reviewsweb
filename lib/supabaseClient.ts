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
  /** Set when the reviewer arrived via a personalised ?cid= link (sent by n8n). */
  customer_id: string | null;
  order_number: string | null;
  /** Required on the public form; normalised to +20... before it is stored. */
  phone: string | null;
  /** Public URL in the review-images storage bucket, when a photo was attached. */
  image_url: string | null;
  customer_email: string | null;
};
