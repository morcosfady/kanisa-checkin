// Forgiving search for the city and church boxes: ignores punctuation and capitals ("St." = "st"),
// matches the start of words, and tolerates small typos ("philopater" finds "Philopateer").

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

function distance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      // swapped neighbours count as one typo ("wroth" for "worth")
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1);
    }
  }
  return dp[a.length][b.length];
}

// 3 = word starts with it, 2 = word contains it, 1 = close spelling, 0 = no match
function tokenScore(q: string, w: string): number {
  if (w.startsWith(q)) return 3;
  if (q.length >= 2 && w.includes(q)) return 2;
  if (q.length >= 4) {
    const allowed = q.length >= 8 ? 2 : 1;
    // compare with the same-length start of the word (what the person has typed so far)
    for (const len of [q.length - 1, q.length, q.length + 1]) {
      if (len > 0 && w.length >= len && distance(q, w.slice(0, len)) <= allowed) return 1;
    }
  }
  return 0;
}

// 0 = not a match; higher = better. Every typed word has to match some word of the label.
export function searchScore(query: string, label: string, hint = ""): number {
  const tokens = norm(query).split(" ").filter(Boolean);
  if (tokens.length === 0) return 1;
  const words = norm(`${label} ${hint}`).split(" ").filter(Boolean);
  let total = 0;
  for (const t of tokens) {
    let best = 0;
    for (const w of words) best = Math.max(best, tokenScore(t, w));
    if (best === 0) return 0;
    total += best;
  }
  return total;
}
