// Slop score: 0 = clean, higher = more slop. Filtered when score > threshold.

const HIGH_SLOP = [
  /\breact(ion|ing|s to)\b/i,
  /\bvlog\b/i,
  /\bgone (wrong|sexual|bad|weird)\b/i,
  /\bprank(ed|s)?\b/i,
  /\bstory\s?time\b/i,
  /\b24\s?hours?\b/i,
  /\bgrwm\b/i,
  /\bget ready with me\b/i,
  /\b(tiktok|meme|vine)\s?(compilation|comp|cringe)\b/i,
  /\b(asmr)\b/i,
  /\bsocial experiment\b/i,
  /\b(drama|beef|exposed|cancelled|apology)\b.*\b(explained|tea|update)\b/i,
  /\b(day in my|daily|weekly) (life|vlog|routine)\b/i,
  /\bhow i ?(lost|gained|made|spent|survived)\b/i,
  /\bi (quit|got fired|got dumped|bought|tried)\b/i,
  /\b(face?cam|just chatting|irl stream)\b/i,
]

const MEDIUM_SLOP = [
  /\byou('| )?(won't|will not) believe\b/i,
  /\b(shocking|insane|mind.?blowing|unbelievable|mind.?blowing)\b/i,
  /\b(exposed|cancelled|drama|beef)\b/i,
  /\b(destroyed|owned|rekt|ratio'?d)\b/i,
  /\b(subscribe|like and subscribe|smash that)\b/i,
  /\b(challenge|vs\.?|versus)\b/i,
  /\b(tier list|power ranking|ranking (every|all))\b/i,
  /\b(giveaway|win|winning)\b/i,
  /\b(roast|roasting|clowned)\b/i,
]

function countEmojis(str) {
  return (str.match(/\p{Emoji_Presentation}/gu) || []).length
}

function allCapsRatio(str) {
  const words = str.split(/\s+/).filter((w) => w.length > 2)
  if (words.length === 0) return 0
  const capsWords = words.filter((w) => w === w.toUpperCase() && /[A-Z]/.test(w))
  return capsWords.length / words.length
}

function excessivePunctuation(str) {
  return (str.match(/[!?]{2,}/g) || []).length
}

export function slopScore(video) {
  const title = video.title || ''
  const desc = video.description || ''
  let score = 0

  // High-confidence slop patterns
  for (const pattern of HIGH_SLOP) {
    if (pattern.test(title)) score += 4
  }

  // Medium-confidence patterns
  for (const pattern of MEDIUM_SLOP) {
    if (pattern.test(title)) score += 2
  }

  // Stylistic signals
  score += Math.round(allCapsRatio(title) * 8)
  score += countEmojis(title) * 1.5
  score += excessivePunctuation(title) * 2

  // Very short description is a signal of low-effort content
  if (desc.length < 30) score += 2

  return Math.round(score)
}

export function isSlop(video, threshold = 4) {
  return slopScore(video) >= threshold
}

// 0-3: clean, 4-7: questionable, 8+: slop
export function slopLabel(score) {
  if (score <= 3) return 'clean'
  if (score <= 7) return 'questionable'
  return 'slop'
}
