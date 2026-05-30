// Read the knowledge graph back out of the Obsidian vault.
// Parses Plato/<Topic>/*.md concept notes into an in-memory graph and produces
// a short summary string used to bias the LLM reranker and frontier suggestions.

import { listNotes, listDirs, readNote } from './vault'
import { parseFrontmatter, parseLinks } from './concepts'

const PLATO_DIR = 'Plato'

// List topics that have concept notes in the vault.
export async function listTopics() {
  const dirs = await listDirs([PLATO_DIR])
  return dirs.filter((d) => d !== 'Videos')
}

// Build { topic, concepts: [{ name, summary, level, relatesTo, videoIds }], edges }
export async function loadGraph(topic) {
  const files = await listNotes([PLATO_DIR, topic])
  const concepts = []

  for (const file of files) {
    if (file.startsWith('_')) continue // skip MOC notes
    const md = await readNote([PLATO_DIR, topic], file)
    if (!md) continue
    const fm = parseFrontmatter(md)
    if (fm.type && fm.type !== 'concept') continue
    const name = file.replace(/\.md$/, '')
    // Related concepts are wikilinks excluding the MOC + video-id links
    const links = parseLinks(md).filter((l) => !l.startsWith('_') && !/^[\w-]{11}$/.test(l))
    concepts.push({
      name,
      summary: extractSummary(md),
      level: fm.level || '',
      relatesTo: links,
      videoIds: Array.isArray(fm.video_ids) ? fm.video_ids : [],
    })
  }

  const known = new Set(concepts.map((c) => c.name))
  const edges = []
  for (const c of concepts) {
    for (const r of c.relatesTo) {
      if (known.has(r)) edges.push([c.name, r])
    }
  }

  return { topic, concepts, edges }
}

function extractSummary(md) {
  const body = md.replace(/^---\n[\s\S]*?\n---/, '')
  // First non-heading, non-empty line after the title
  const lines = body.split('\n').map((l) => l.trim())
  for (const line of lines) {
    if (!line || line.startsWith('#') || line.startsWith('**') || line.startsWith('-')) continue
    return line
  }
  return ''
}

// Compact string of known concepts for prompt injection.
export async function summarizeKnown(topic) {
  const { concepts } = await loadGraph(topic)
  if (concepts.length === 0) return ''
  const names = concepts.map((c) => c.name)
  return `In "${topic}" the learner has already studied: ${names.join(', ')}.`
}
