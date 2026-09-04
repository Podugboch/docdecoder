// Friction for honest users, not security. Anyone can clear localStorage and get
// three more, and that is fine — the hard limit on what this can cost you is the
// monthly spend cap set in the Anthropic console, which no client can bypass.
const KEY = 'dd.scans'
export const FREE_LIMIT = 3

function thisMonth() {
  return new Date().toISOString().slice(0, 7) // 2026-09
}

function read() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { month: thisMonth(), count: 0 }
    const parsed = JSON.parse(raw)
    if (parsed.month !== thisMonth()) return { month: thisMonth(), count: 0 }
    return { month: parsed.month, count: Number(parsed.count) || 0 }
  } catch {
    // Private browsing, or storage disabled. Fail open — a blocked scan is worse
    // than an uncounted one.
    return { month: thisMonth(), count: 0 }
  }
}

export function scansLeft() {
  return Math.max(0, FREE_LIMIT - read().count)
}

// Returns how many are left afterwards, so the caller never has to re-read.
export function recordScan() {
  try {
    const { count } = read()
    localStorage.setItem(KEY, JSON.stringify({ month: thisMonth(), count: count + 1 }))
  } catch {
    // Nothing to do; see above.
  }
  return scansLeft()
}
