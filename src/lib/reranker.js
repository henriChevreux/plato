import { chat, isAvailable } from './ollama'

const LEVEL_GUIDANCE = {
  beginner: `The learner is a BEGINNER. Score HIGH (70-100) for: introductions, basics, tutorials, "what is X", step-by-step guides, gentle overviews. Score LOW (0-30) for: advanced theory, mathematical proofs, research-level content, assumes prior knowledge.`,
  intermediate: `The learner is INTERMEDIATE. Score HIGH for: practical tutorials, applied examples, moderate depth. Penalize both "complete beginner intro" videos and highly theoretical graduate-level content.`,
  advanced: `The learner is ADVANCED. Score HIGH (70-100) for: deep technical content, mathematical derivations, research-level discussions, cutting-edge topics, lectures that assume strong prior knowledge. Score LOW (0-30) for: introductions, basics, "what is X" overviews, beginner tutorials — these are a waste of time for an advanced learner.`,
}

async function scoreOne(video, { topicNames, level, graphSummary }) {
  const levelGuide = LEVEL_GUIDANCE[level] || LEVEL_GUIDANCE.intermediate
  const prompt = [
    `You are a learning content curator. Score this video for relevance and level fit.`,
    `Topic: ${topicNames}`,
    levelGuide,
    graphSummary ? `Learner context: ${graphSummary}` : '',
    '',
    `Video: "${video.title}" by ${video.channelTitle}`,
    `Description: ${(video.description || '').slice(0, 300)}`,
    '',
    'Return ONLY JSON: {"score": 0-100, "reason": "one sentence"}',
  ].filter(Boolean).join('\n')

  const result = await chat([{ role: 'user', content: prompt }], { format: 'json' })
  if (!result || typeof result.score !== 'number') return null
  return {
    videoId: video.videoId,
    score: Math.min(100, Math.max(0, Math.round(result.score))),
    reason: result.reason || '',
  }
}

export async function rerank(videos, { topics = [], level = 'intermediate', graphSummary = '', onProgress } = {}) {
  if (videos.length === 0) return null
  const { available } = await isAvailable()
  if (!available) return null

  const topicNames = topics.map((t) => (typeof t === 'string' ? t : t.name)).join(', ')
  const total = videos.length
  let scored = 0
  const results = []

  for (const video of videos) {
    const result = await scoreOne(video, { topicNames, level, graphSummary })
    scored++
    if (result) results.push(result)
    onProgress?.({ scored, total, result })
  }

  return results.length > 0 ? results : null
}
