import { chat, isAvailable } from './ollama'

export async function rerank(videos, { topics = [], level = 'intermediate', graphSummary = '' } = {}) {
  if (videos.length === 0) return null
  const { available } = await isAvailable()
  if (!available) return null

  const topicNames = topics.map((t) => (typeof t === 'string' ? t : t.name)).join(', ')
  const candidates = videos.map((v) => ({
    videoId: v.videoId,
    title: v.title,
    channel: v.channelTitle,
    description: (v.description || '').slice(0, 300),
  }))

  const lines = [
    `You are a learning content curator. Score each video for a ${level} learner studying: ${topicNames}.`,
    graphSummary ? `Learner context: ${graphSummary}` : '',
    '',
    'Return ONLY a JSON array: [{"videoId":"...","score":0-100,"reason":"one sentence"}]',
    '100 = perfect fit for this learner\'s level and topic. 0 = completely irrelevant.',
    '',
    'Videos:',
    JSON.stringify(candidates),
  ].filter(Boolean)

  const result = await chat([{ role: 'user', content: lines.join('\n') }], { format: 'json' })
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
