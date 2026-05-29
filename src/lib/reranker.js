import { chat, isAvailable } from './ollama'

const LEVEL_GUIDANCE = {
  beginner: `The learner is a BEGINNER. Score HIGH (70-100) for: introductions, basics, tutorials, "what is X", step-by-step guides, gentle overviews. Score LOW (0-30) for: advanced theory, mathematical proofs, research-level content, assumes prior knowledge.`,
  intermediate: `The learner is INTERMEDIATE. Score HIGH for: practical tutorials, applied examples, moderate depth. Penalize both "complete beginner intro" videos and highly theoretical graduate-level content.`,
  advanced: `The learner is ADVANCED. Score HIGH (70-100) for: deep technical content, mathematical derivations, research-level discussions, cutting-edge topics, lectures that assume strong prior knowledge. Score LOW (0-30) for: introductions, basics, "what is X" overviews, beginner tutorials — these are a waste of time for an advanced learner.`,
}

async function rankSection(videos, { topicName, level, graphSummary }) {
  const levelGuide = LEVEL_GUIDANCE[level] || LEVEL_GUIDANCE.intermediate
  const candidates = videos.map((v) => ({
    videoId: v.videoId,
    title: v.title,
    channel: v.channelTitle,
    description: (v.description || '').slice(0, 200),
  }))

  const prompt = [
    `You are a learning content curator. Score these videos for topic relevance and level fit.`,
    `Topic: ${topicName}`,
    levelGuide,
    graphSummary ? `Learner context: ${graphSummary}` : '',
    '',
    'Return ONLY a JSON array: [{"videoId":"...","score":0-100,"reason":"one sentence"}]',
    '',
    'Videos:',
    JSON.stringify(candidates),
  ].filter(Boolean).join('\n')

  const result = await chat([{ role: 'user', content: prompt }], { format: 'json' })
  if (!result) return null

  const arr = Array.isArray(result)
    ? result
    : Array.isArray(result.scores)
    ? result.scores
    : null
  if (!arr) return null

  return arr
    .filter((r) => r && typeof r.videoId === 'string' && typeof r.score === 'number')
    .map((r) => ({
      videoId: r.videoId,
      score: Math.min(100, Math.max(0, Math.round(r.score))),
      reason: r.reason || '',
    }))
}

// sections = [{ topic, videos }] — one Ollama call per section
export async function rerank(sections, { graphSummary = '', onProgress } = {}) {
  if (sections.length === 0) return null
  const { available } = await isAvailable()
  if (!available) return null

  const total = sections.length
  let done = 0
  const results = []

  for (const { topic, videos } of sections) {
    const topicName = typeof topic === 'string' ? topic : topic.name
    const level = typeof topic === 'string' ? 'intermediate' : (topic.level || 'intermediate')
    const sectionResults = await rankSection(videos, { topicName, level, graphSummary })
    if (sectionResults) results.push(...sectionResults)
    done++
    onProgress?.({ scored: done, total })
  }

  return results.length > 0 ? results : null
}
