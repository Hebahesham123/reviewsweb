// Egyptian display names used when a review has no name yet.
// On the dashboard we derive the name deterministically from the review id,
// so the same review always shows the same name (it won't flicker on refresh).

export const EG_FIRST = [
  "Ahmed", "Mohamed", "Mahmoud", "Mostafa", "Omar", "Youssef", "Khaled",
  "Hassan", "Amr", "Tarek", "Karim", "Sherif", "Ali", "Ibrahim", "Hossam",
  "Tamer", "Ramy", "Wael", "Sameh", "Adel", "Ayman", "Hany", "Magdy",
  "Mariam", "Nour", "Habiba", "Salma", "Farida", "Malak", "Hana", "Layla",
  "Yasmin", "Nada", "Aya", "Esraa", "Mai", "Dina", "Heba", "Mona", "Rana",
  "Reem", "Sara", "Amira", "Menna", "Doaa", "Shaimaa", "Eman", "Asmaa",
  "Noha", "Dalia", "Hala", "Nourhan", "Aliaa",
];

export const EG_LAST = [
  "Hassan", "Mohamed", "Ibrahim", "Mahmoud", "Abdelrahman", "Farouk",
  "Mansour", "Saad", "Adel", "Gamal", "Fathy", "Zaki", "Sabry", "Shawky",
  "Nabil", "Fawzy", "Lotfy", "Helmy", "Refaat", "ElSayed", "AbdelAziz",
  "Kamel", "Naguib", "Hegazy", "Sorour",
];

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic "First Last" Egyptian name derived from a seed (e.g. review id). */
export function egyptianNameFromSeed(seed: string): string {
  const h = hash(seed);
  const first = EG_FIRST[h % EG_FIRST.length];
  const last = EG_LAST[Math.floor(h / EG_FIRST.length) % EG_LAST.length];
  return `${first} ${last}`;
}

/** Real name if present, otherwise a stable fake Egyptian name from the seed. */
export function displayName(
  name: string | null | undefined,
  seed: string
): string {
  const trimmed = (name ?? "").trim();
  return trimmed || egyptianNameFromSeed(seed);
}
