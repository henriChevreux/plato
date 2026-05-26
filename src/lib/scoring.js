function tokenize(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean)
}

function scoreField(text, topicTokens) {
  if (!text) return 0
  const lowerText = text.toLowerCase()
  let score = 0
  const phrase = topicTokens.join(' ')
  if (lowerText.includes(phrase)) {
    score += 3
  } else {
    const textTokens = tokenize(text)
    const matchCount = topicTokens.filter((t) => textTokens.includes(t)).length
    score += matchCount * 1
  }
  return score
}

const LEVEL_SIGNALS = {
  beginner: [
    'introduction', 'intro', 'basics', 'basic', 'beginner', 'beginners',
    'tutorial', 'explained', 'for dummies', 'simple', 'easy', '101',
    'guide', 'fundamentals', 'crash course', 'getting started', 'learn',
    'overview', 'what is',
  ],
  advanced: [
    'advanced', 'deep dive', 'in-depth', 'indepth', 'technical',
    'lecture', 'research', 'graduate', 'phd', 'master class',
    'masterclass', 'theory', 'proof', 'derivation', 'rigorous',
    'expert', 'professional', 'mathematics', 'mathematical',
    'paper', 'academic', 'university course',
  ],
}

function levelBonus(video, level) {
  if (!level || level === 'intermediate') return 0
  const text = `${video.title} ${video.description}`.toLowerCase()
  const mySignals = LEVEL_SIGNALS[level] || []
  const oppositeLevel = level === 'beginner' ? 'advanced' : 'beginner'
  const oppositeSignals = LEVEL_SIGNALS[oppositeLevel] || []
  const hasMySignal = mySignals.some((s) => text.includes(s))
  const hasOppositeSignal = oppositeSignals.some((s) => text.includes(s))
  if (hasMySignal && !hasOppositeSignal) return 4
  if (hasOppositeSignal && !hasMySignal) return -4
  return 0
}

// topics can be {name, level}[] or string[]
export function scoreVideo(video, topics) {
  let total = 0
  for (const topic of topics) {
    const name = typeof topic === 'string' ? topic : topic.name
    const level = typeof topic === 'string' ? 'intermediate' : (topic.level || 'intermediate')
    const tokens = tokenize(name)
    if (tokens.length === 0) continue
    const titleScore = scoreField(video.title, tokens) * 3
    const descScore = scoreField(video.description, tokens)
    const channelScore = scoreField(video.channelTitle, tokens) * 2
    total += titleScore + descScore + channelScore + levelBonus(video, level)
  }
  return total
}
