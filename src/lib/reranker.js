import { chat, isAvailable } from './ollama'

const CONCURRENCY = 5

async function scoreOne(video, { topicNames, level, graphSummary }) {
  const prompt = [
    `You are a learning content curator. Score this video for a ${level} learner studying: ${topicNames}.`,
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

  for (let i = 0; i < videos.length; i += CONCURRENCY) {
    const batch = videos.slice(i, i + CONCURRENCY)
    const batchResults = await Promise.all(
      batch.map((v) => scoreOne(v, { topicNames, level, graphSummary }))
    )
    for (const r of batchResults) {
      if (r) results.push(r)
      scored++
      onProgress?.({ scored, total })
    }
  }

  return results.length > 0 ? results : null
}
