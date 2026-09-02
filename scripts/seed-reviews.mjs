// 40 seed reviews (English + Arabic) for beauty-bareg.net → Supabase `reviews`.
//
// Run with: node scripts/seed-reviews.mjs           (dry run: prints a preview)
//           node scripts/seed-reviews.mjs --insert  (writes them to Supabase)
//
// Dates are spread across July 2026 and 2026-08-01 so the dashboard shows a
// natural trickle instead of 40 rows landing on the same minute.

const SUPABASE_URL = "https://vumykpkjirjhdtwlpzwe.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1bXlrcGtqaXJqaGR0d2xwendlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyOTczMzQsImV4cCI6MjA5Nzg3MzMzNH0.sJLzH45T_Muox5Lc_zXU6nyw2r4Ea6IrT0zPZt70L8k";

// [date, name, product, shipping, support, experience, comment]
const REVIEWS = [
  ["2026-07-01T10:24:00Z", "Menna Tarek", 5, 5, 5, "Easy",
    "The Kelly bag arrived exactly like the photos, stitching is so clean 😍 packaging was beautiful too. Definitely ordering again."],
  ["2026-07-01T16:47:00Z", "سارة عبد الرحمن", 5, 5, 5, "Easy",
    "الشنطة وصلت أسرع مما توقعت والجودة تحفة فعلاً ❤️ التغليف كان شيك جداً، شكراً ليكم"],
  ["2026-07-02T11:38:00Z", "Rana Hegazy", 5, 4, 5, "Easy",
    "Quality is amazing for the price. Delivery took one extra day but the team kept me updated the whole time."],
  ["2026-07-02T19:05:00Z", "Ingy Sorour", 5, 5, 5, "Easy", null],
  ["2026-07-03T12:16:00Z", "منة الله فاروق", 4, 5, 5, "Easy",
    "النظارة حلوة أوي وشبه الصور بالظبط، بس كنت متوقعة الجراب يكون أفضل شوية. عموماً تجربة ممتازة"],
  ["2026-07-04T09:52:00Z", "Youssef Kamel", 5, 5, 5, "Easy",
    "Ordered a card holder for my wife as a gift. The leather feels premium and the box made it look like a real boutique gift ✨"],
  ["2026-07-04T18:30:00Z", "Dalia Naguib", 4, 4, 5, "Medium",
    "Good quality overall, the hardware colour is a bit shinier than the pictures. Customer service replied within minutes though."],
  ["2026-07-05T13:11:00Z", "هبة مجدي", 5, 5, 5, "Easy",
    "تعامل راقي جداً من أول الرسالة لحد ما وصلت الأوردر. الشنطة أحلى من الصورة والله ❤️❤️"],
  ["2026-07-06T10:47:00Z", "Nourhan AbdelAziz", 5, 5, 4, "Easy",
    "Second order from you and still impressed. The swimsuit fit perfectly and the fabric is really good quality."],
  ["2026-07-07T12:03:00Z", "Amira Zaki", 3, 4, 4, "Medium",
    "The bag itself is nice but it came without the dust bag which was a bit disappointing for the price."],
  ["2026-07-08T11:29:00Z", "أحمد منصور", 5, 5, 5, "Easy",
    "اشتريت هدية لأختي وكانت مبسوطة جداً، الجودة ممتازة والتغليف شيك. تسلم إيديكم 🙏"],
  ["2026-07-08T17:56:00Z", "Laila Fathy", 5, 5, 5, "Easy",
    "Honestly the best online shopping experience I've had this year. Fast, professional and the product is exactly as described."],
  ["2026-07-09T13:40:00Z", "Marwa Gabr", 4, 5, 5, "Easy", null],
  ["2026-07-10T10:18:00Z", "ياسمين حسام", 5, 4, 5, "Medium",
    "الشنطة جميلة جداً والخامة ممتازة، بس الشحن اتأخر يومين عن الميعاد. برضه هكرر التجربة"],
  ["2026-07-10T19:33:00Z", "Hana ElSayed", 5, 5, 5, "Easy",
    "I keep getting compliments on this bag 😍 nobody believes the price. Thank you for the fast delivery!"],
  ["2026-07-11T12:52:00Z", "Karim Helmy", 2, 3, 4, "Hard",
    "The sneakers I received had a small defect on the side. Support answered but the replacement is still taking too long."],
  ["2026-07-12T14:07:00Z", "دينا شريف", 5, 5, 5, "Easy",
    "خدمة العملاء محترمة جداً وبيردوا بسرعة على أي سؤال. المنتج وصل بحالة ممتازة ومغلف كويس أوي"],
  ["2026-07-13T11:26:00Z", "Salma Refaat", 5, 5, 5, "Easy",
    "Perfect quality, perfect packaging, perfect service. Nothing more to say ❤️"],
  ["2026-07-14T16:44:00Z", "Aya Lotfy", 4, 4, 4, "Medium",
    "Nice product and reasonable price. The website could use clearer size details but the team helped me choose on WhatsApp."],
  ["2026-07-15T10:35:00Z", "نور عبد الله", 5, 5, 5, "Easy",
    "ثالث مرة أطلب منكم ومرة ورا التانية الجودة بتكون أحسن ❤️ ربنا يوفقكم"],
  ["2026-07-16T13:19:00Z", "Habiba Shawky", 5, 5, 5, "Easy",
    "Ordered on Sunday, received on Tuesday. The mini bag is even prettier in real life ✨"],
  ["2026-07-17T11:58:00Z", "Esraa Nabil", 5, 4, 5, "Easy",
    "Great quality for the money. Delivery guy was late but he called ahead so it was fine."],
  ["2026-07-18T18:12:00Z", "محمود فهمي", 5, 5, 5, "Easy", null],
  ["2026-07-19T12:41:00Z", "Sandy Adel", 5, 5, 5, "Easy",
    "The Tohfa collection is stunning. I bought two pieces and both arrived in perfect condition 🧡"],
  ["2026-07-20T15:27:00Z", "شيماء إبراهيم", 3, 3, 4, "Medium",
    "المنتج كويس بس العلبة وصلت مكسورة من جنب. اتواصلت معاهم وحلوا الموضوع بس كان المفروض تتغلف أحسن"],
  ["2026-07-21T10:53:00Z", "Mai Sabry", 5, 5, 5, "Easy",
    "Absolutely in love with the sunglasses! Great quality lenses and they came with a proper case."],
  ["2026-07-22T14:36:00Z", "Omar Gamal", 5, 5, 5, "Easy",
    "Bought a bag for my mum's birthday and she thought it was from a boutique. Excellent finishing 👏"],
  ["2026-07-23T12:09:00Z", "إيمان علي", 4, 5, 5, "Easy",
    "الأوردر وصل في ميعاده والتعامل محترم. اللون مختلف شوية عن الصورة بس حلو برضه"],
  ["2026-07-24T17:48:00Z", "Ghaidaa Darweesh", 5, 5, 5, "Easy",
    "This is my 6th bag from you and the quality never drops. You have a customer for life 😍"],
  ["2026-07-25T11:14:00Z", "Heidy Naeem", 1, 2, 2, "Hard",
    "Very disappointed this time. The item arrived scratched and it took three days to get any reply about the return."],
  ["2026-07-26T13:55:00Z", "مريم صلاح", 5, 5, 5, "Easy",
    "بجد تجربة ممتازة من أولها لآخرها 🤩 الشنطة تحفة والتغليف زي المحلات الكبيرة بالظبط"],
  ["2026-07-27T10:31:00Z", "Nada Enan", 5, 5, 4, "Easy",
    "Lovely product and quick shipping. Support took a little while to reply but they were helpful once they did."],
  ["2026-07-28T16:20:00Z", "Jehan Mostafa", 5, 5, 5, "Easy",
    "I was looking for something simple and elegant and this is exactly it. Soft leather, great finishing, worth every pound."],
  ["2026-07-29T12:47:00Z", "طارق سعد", 5, 5, 5, "Easy", null],
  ["2026-07-30T11:05:00Z", "Alia Oraby", 4, 5, 5, "Easy",
    "The pink bag is beautiful quality. The sunglasses are cute too, though the case felt a little cheap."],
  ["2026-07-31T13:23:00Z", "نوال عزام", 5, 4, 5, "Medium",
    "الجودة ممتازة والسعر مناسب جداً بالنسبة للخامة. الشحن أخد وقت شوية بس المنتج يستاهل"],
  ["2026-08-01T08:12:00Z", "Yara Yasser", 5, 5, 5, "Easy",
    "Fast delivery, beautiful packaging, and the bag is exactly like the pictures. Highly recommend 🧡"],
  ["2026-08-01T09:26:00Z", "هالة فخري", 5, 5, 5, "Easy",
    "شكراً على الاهتمام والمتابعة، حسيت إن فيه حد فعلاً مهتم يوصلني الأوردر بحالة كويسة ❤️"],
  ["2026-08-01T10:03:00Z", "Sherif Naguib", 4, 4, 5, "Medium",
    "Good experience overall. The product matches the description, delivery was a bit slow during the holiday week."],
  ["2026-08-01T10:44:00Z", "Farida Hassan", 5, 5, 5, "Easy",
    "Just received my order and I'm so happy with it ✨ the quality is unreal for this price. Thank you Beauty Bareg!"],
];

const rows = REVIEWS.map(
  ([created_at, reviewer_name, product_rating, shipping_rating, support_rating, experience_level, review_comment]) => ({
    reviewer_name,
    product_rating,
    shipping_rating,
    support_rating,
    experience_level,
    review_comment,
    created_at,
  })
);

// ---- preview ----
const pad = (s, n) => String(s ?? "").padEnd(n).slice(0, n);
console.log(`Prepared ${rows.length} reviews.\n`);
console.log(pad("Date", 12) + pad("Name", 20) + pad("Exp", 8) + "P S U  Comment");
console.log("-".repeat(92));
for (const r of rows) {
  console.log(
    pad(r.created_at.slice(0, 10), 12) +
      pad(r.reviewer_name, 20) +
      pad(r.experience_level || "-", 8) +
      pad(r.product_rating ?? "-", 2) +
      pad(r.shipping_rating ?? "-", 2) +
      pad(r.support_rating ?? "-", 3) +
      (r.review_comment ? r.review_comment.slice(0, 44) : "(no comment)")
  );
}

const avg = (k) => {
  const v = rows.map((r) => r[k]).filter((n) => typeof n === "number");
  return (v.reduce((a, b) => a + b, 0) / v.length).toFixed(2);
};
const arabic = rows.filter((r) => /[؀-ۿ]/.test(r.reviewer_name + (r.review_comment || ""))).length;
console.log(
  `\nAverages — product ${avg("product_rating")} · shipping ${avg("shipping_rating")} · support ${avg("support_rating")}`
);
console.log(`Arabic: ${arabic} · English: ${rows.length - arabic}`);

const insert = process.argv.includes("--insert");
if (!insert) {
  console.log(`\nDRY RUN. Re-run with --insert to write these ${rows.length} rows to Supabase.`);
  process.exit(0);
}

// ---- insert (single batch) ----
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
