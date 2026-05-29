import { chat, isAvailable } from './ollama'

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

  for (const video of videos) {
    const result = await scoreOne(video, { topicNames, level, graphSummary })
    scored++
    if (result) results.push(result)
    onProgress?.({ scored, total, result })
  }

  return results.length > 0 ? results : null
}
