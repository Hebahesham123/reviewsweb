/**
 * Title Case: the first letter of every word capitalised, everything else
 * lowercased.  "heba hassan" -> "Heba Hassan",  "PERFECT" -> "Perfect".
 *
 * Deliberately NOT applied to customer IDs or order numbers — "ORD-1042"
 * would become "Ord-1042" and stop matching what n8n sent.
 */

/**
 * True for characters that have a case (Latin, Cyrillic, Greek...).
 * Arabic, digits, emoji and punctuation all return false, so they pass
 * through untouched instead of eating the capital.
 *
 * Done this way rather than with a \p{L} regex because tsconfig targets
 * ES2017, where Unicode property escapes are not available.
 */
function isCased(ch: string): boolean {
  return ch.toLowerCase() !== ch.toUpperCase();
}

export function titleCase(input: string | null | undefined): string {
  if (!input) return "";

  // Words break on whitespace and hyphens, so "abdel-rahman" -> "Abdel-Rahman".
  return input.replace(/[^\s-]+/g, (word) => {
    let capitalised = false;
    let out = "";

    for (const ch of word) {
      if (!capitalised && isCased(ch)) {
        out += ch.toUpperCase();
        capitalised = true;
      } else {
        // Uncased characters before the first letter stay exactly as typed.
        out += capitalised ? ch.toLowerCase() : ch;
      }
    }

    return out;
  });
}
