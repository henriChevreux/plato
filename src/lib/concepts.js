// Concept extraction + Obsidian note writing for the knowledge graph.
// Concepts are inferred from the video's title/description/channel via Ollama
// (transcript-based extraction is a documented future upgrade). Notes are
// written as linked Markdown so Obsidian's graph view renders the structure.

import { chat, isAvailable } from './ollama'
import { writeNote, readNote, sanitize } from './vault'

const san = sanitize

const PLATO_DIR = 'Plato'

// Returns [{ name, summary, relatesTo: [] }] or [] on failure.
export async function extractConcepts(video, { topic } = {}) {
  const { available } = await isAvailable()
  if (!available) return []

  const prompt = [
    `You extract the key learnable CONCEPTS from an educational video's metadata.`,
    topic ? `Overall topic: ${topic}` : '',
    `Video title: "${video.title}"`,
    `Channel: ${video.channelTitle}`,
    `Description: ${(video.description || '').slice(0, 600)}`,
    '',
    `Identify 2-5 distinct concepts a viewer would learn. For each, give a short`,
    `summary (one sentence) and list which OTHER concepts in your list it relates to.`,
    `Use concise canonical concept names (e.g. "Gradient Descent", not "how gradient descent works").`,
    '',
    `Return ONLY JSON: {"concepts": [{"name": "...", "summary": "...", "relatesTo": ["..."]}]}`,
  ].filter(Boolean).join('\n')

  const result = await chat([{ role: 'user', content: prompt }], { format: 'json' })
  if (!result || !Array.isArray(result.concepts)) return []

  return result.concepts
    .filter((c) => c && typeof c.name === 'string' && c.name.trim())
    .slice(0, 6)
    .map((c) => ({
      name: c.name.trim(),
      summary: typeof c.summary === 'string' ? c.summary.trim() : '',
      relatesTo: Array.isArray(c.relatesTo) ? c.relatesTo.filter((r) => typeof r === 'string' && r.trim()) : [],
    }))
}

function frontmatter(obj) {
  const lines = ['---']
  for (const [k, v] of Object.entries(obj)) {
    if (Array.isArray(v)) {
      lines.push(`${k}:`)
      for (const item of v) lines.push(`  - ${item}`)
    } else {
      lines.push(`${k}: ${v}`)
    }
  }
  lines.push('---')
  return lines.join('\n')
}

// Parse a tiny subset of YAML frontmatter (flat scalars + simple lists).
export function parseFrontmatter(md) {
  const match = md.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return {}
  const out = {}
  let currentList = null
  for (const line of match[1].split('\n')) {
    const listItem = line.match(/^\s+-\s+(.*)$/)
    if (listItem && currentList) {
      out[currentList].push(listItem[1].trim())
      continue
    }
    const kv = line.match(/^([\w-]+):\s*(.*)$/)
    if (kv) {
      const [, key, val] = kv
      if (val === '') { out[key] = []; currentList = key }
      else { out[key] = val.trim(); currentList = null }
    }
  }
  return out
}

// Extract [[wikilinks]] from note body.
export function parseLinks(md) {
  const body = md.replace(/^---\n[\s\S]*?\n---/, '')
  const links = []
  const re = /\[\[([^\]]+)\]\]/g
  let m
  while ((m = re.exec(body))) links.push(m[1].trim())
  return links
}

function wikilink(name) {
  return `[[${san(name)}]]`
}

// Write/append concept notes, a topic MOC, and a per-video note.
// Appends to existing concept notes (recording the new source video) rather than clobbering.
export async function writeConceptNotes(topic, level, video, concepts) {
  if (!concepts || concepts.length === 0) return { written: 0 }
  const topicDir = [PLATO_DIR, topic]

  for (const concept of concepts) {
    const filename = `${sanitize(concept.name)}.md`
    const existing = await readNote(topicDir, filename)

    if (existing) {
      const fm = parseFrontmatter(existing)
      const videoIds = new Set(Array.isArray(fm.video_ids) ? fm.video_ids : [])
      if (!videoIds.has(video.videoId)) {
        videoIds.add(video.videoId)
        const updated = existing.replace(
          /^---\n[\s\S]*?\n---/,
          frontmatter({
            topic,
            level: fm.level || level,
            type: 'concept',
            first_seen: fm.first_seen || new Date().toISOString().slice(0, 10),
            video_ids: [...videoIds],
          })
        ) + `\n- Also seen in [[${video.videoId}]] (${video.title})`
        await writeNote(topicDir, filename, updated)
      }
      continue
    }

    const related = concept.relatesTo.map(wikilink).join(', ')
    const body = [
      frontmatter({
        topic,
        level,
        type: 'concept',
        first_seen: new Date().toISOString().slice(0, 10),
        video_ids: [video.videoId],
      }),
      '',
      `# ${concept.name}`,
      '',
      concept.summary || '',
      '',
      related ? `**Related:** ${related}` : '',
      '',
      `**Topic:** ${wikilink(`_${topic} MOC`)}`,
      `**First seen in:** [[${video.videoId}]] — ${video.title}`,
      '',
    ].filter((l) => l !== undefined).join('\n')
    await writeNote(topicDir, filename, body)
  }

  await updateMOC(topic, level, concepts)
  await writeVideoNote(topic, video, concepts)
  return { written: concepts.length }
}

async function updateMOC(topic, level, concepts) {
  const filename = `_${sanitize(topic)} MOC.md`
  const existing = await readNote([PLATO_DIR, topic], filename)
  const known = new Set(existing ? parseLinks(existing) : [])
  for (const c of concepts) known.add(sanitize(c.name))

  const body = [
    frontmatter({ topic, level, type: 'moc' }),
    '',
    `# ${topic} — Map of Content`,
    '',
    `Concepts learned so far in **${topic}**:`,
    '',
    ...[...known].sort().map((name) => `- [[${name}]]`),
    '',
  ].join('\n')
  await writeNote([PLATO_DIR, topic], filename, body)
}

async function writeVideoNote(topic, video, concepts) {
  const filename = `${sanitize(video.videoId)}.md`
  const body = [
    frontmatter({
      topic,
      type: 'video',
      video_id: video.videoId,
      channel: video.channelTitle,
      watched: new Date().toISOString().slice(0, 10),
    }),
    '',
    `# ${video.title}`,
    '',
    `By ${video.channelTitle}`,
    '',
    `https://www.youtube.com/watch?v=${video.videoId}`,
    '',
    `**Concepts covered:** ${concepts.map((c) => wikilink(c.name)).join(', ')}`,
    `**Topic:** ${wikilink(`_${topic} MOC`)}`,
    '',
  ].join('\n')
  await writeNote([PLATO_DIR, 'Videos'], filename, body)
}
