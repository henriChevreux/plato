// Frontier recommendations: given what the learner already knows (the graph),
// ask the LLM for the natural NEXT concepts to learn, and turn those into
// extra YouTube search queries that extend their knowledge base.

import { chat, isAvailable } from './ollama'

// Returns [{ concept, why, query }] — next concepts to learn + a search query each.
export async function suggestNext(topic, level, graph, { limit = 5 } = {}) {
  const { available } = await isAvailable()
  if (!available) return []

  const known = (graph?.concepts || []).map((c) => c.name)
  const prompt = [
    `You are a curriculum planner. The learner is studying "${topic}" at a ${level} level.`,
    known.length
      ? `They have already learned these concepts: ${known.join(', ')}.`
      : `They are just starting out and have learned nothing yet.`,
    '',
    `Suggest the ${limit} most valuable NEXT concepts that are a natural extension of`,
    `what they already know — neither redundant with the list above nor too advanced a leap.`,
    `For each, give a one-clause reason and a good YouTube search query to find a video on it.`,
    '',
    `Return ONLY JSON: {"next": [{"concept": "...", "why": "...", "query": "..."}]}`,
  ].join('\n')

  const result = await chat([{ role: 'user', content: prompt }], { format: 'json' })
  if (!result || !Array.isArray(result.next)) return []

  return result.next
    .filter((s) => s && typeof s.concept === 'string' && s.concept.trim())
    .slice(0, limit)
    .map((s) => ({
      concept: s.concept.trim(),
      why: typeof s.why === 'string' ? s.why.trim() : '',
      query: (typeof s.query === 'string' && s.query.trim()) || `${topic} ${s.concept}`.trim(),
    }))
}
