// Parse scripts/old-reviews.txt → structured review rows.
// Run with: node scripts/import-old-reviews.mjs           (dry run: prints preview)
//           node scripts/import-old-reviews.mjs --insert  (inserts into Supabase)
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = "https://vumykpkjirjhdtwlpzwe.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1bXlrcGtqaXJqaGR0d2xwendlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyOTczMzQsImV4cCI6MjA5Nzg3MzMzNH0.sJLzH45T_Muox5Lc_zXU6nyw2r4Ea6IrT0zPZt70L8k";

const MONTHS = {
  Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
  Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
};
const YEAR = "2026";

const isNum = (s) => /^[1-5]$/.test(s);
const isExp = (s) => s === "Easy" || s === "Medium" || s === "Hard";

function parseDate(line) {
  // "Jun 24, 12:16" -> "2026-06-24T12:16:00Z"
  const m = line.match(/^([A-Za-z]{3})\s+(\d{1,2}),\s+(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const [, mon, day, hh, mm] = m;
  const month = MONTHS[mon];
  if (!month) return null;
  return `${YEAR}-${month}-${String(day).padStart(2, "0")}T${hh.padStart(2, "0")}:${mm}:00Z`;
}

function parseBlock(block) {
  const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  const created_at = parseDate(lines[0]);
  if (!created_at) return null;

  let rest = lines.slice(1);

  // optional experience
  let experience_level = null;
  if (rest.length && isExp(rest[0])) {
    experience_level = rest.shift();
  }

  // product = leading number (rating given before the comment/name)
  let product_rating = null;
  if (rest.length && isNum(rest[0])) {
    product_rating = Number(rest.shift());
  }

  // support = last number, shipping = second-to-last number
  let support_rating = null;
  let shipping_rating = null;
  if (rest.length && isNum(rest[rest.length - 1])) {
    support_rating = Number(rest.pop());
  }
  if (rest.length && isNum(rest[rest.length - 1])) {
    shipping_rating = Number(rest.pop());
  }

  // whatever remains is text: last text = name, earlier text(s) = comment
  let reviewer_name = "Anonymous";
  let review_comment = null;
  const texts = rest.filter((l) => !isNum(l));
  if (texts.length === 1) {
    reviewer_name = texts[0];
  } else if (texts.length >= 2) {
    reviewer_name = texts[texts.length - 1];
    review_comment = texts.slice(0, -1).join(" ");
  }

  return {
    reviewer_name,
    product_rating,
    shipping_rating,
    support_rating,
    experience_level,
    review_comment,
    created_at,
  };
}

const raw = readFileSync(join(__dirname, "old-reviews.txt"), "utf8");
const blocks = raw.split(/^##$/m).map((b) => b.trim()).filter(Boolean);
const rows = blocks.map(parseBlock).filter(Boolean);

// ---- preview ----
console.log(`Parsed ${rows.length} reviews from ${blocks.length} blocks.\n`);
const pad = (s, n) => String(s ?? "").padEnd(n).slice(0, n);
console.log(
  pad("Date", 12) + pad("Name", 22) + pad("Exp", 8) + "P S U  Comment"
);
console.log("-".repeat(90));
for (const r of rows) {
  console.log(
    pad(r.created_at.slice(0, 10), 12) +
      pad(r.reviewer_name, 22) +
      pad(r.experience_level || "-", 8) +
      pad(r.product_rating ?? "-", 2) +
      pad(r.shipping_rating ?? "-", 2) +
      pad(r.support_rating ?? "-", 3) +
      (r.review_comment ? r.review_comment.slice(0, 40) : "")
  );
}

const insert = process.argv.includes("--insert");
if (!insert) {
  console.log(`\nDRY RUN. Re-run with --insert to write these ${rows.length} rows to Supabase.`);
  process.exit(0);
}

// ---- insert (batched) ----
const res = await fetch(`${SUPABASE_URL}/rest/v1/reviews`, {
  method: "POST",
  headers: {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
    Prefer: "return=minimal",
  },
  body: JSON.stringify(rows),
});

if (!res.ok) {
  console.error(`\nInsert failed: HTTP ${res.status}`);
  console.error(await res.text());
  process.exit(1);
}
console.log(`\n✅ Inserted ${rows.length} reviews into Supabase.`);
