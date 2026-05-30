import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVault } from '../hooks/useVault'
import { useTopics } from '../hooks/useTopics'
import { loadGraph, listTopics } from '../lib/graph'
import { suggestNext } from '../lib/frontier'
import { getVaultName } from '../lib/vault'
import { EmptyState } from '../components/EmptyState'

function obsidianLink(vaultName, topic, concept) {
  const file = `Plato/${topic}/${concept}`
  return `obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(file)}`
}

export function Knowledge() {
  const { supported, status, name, connect, reconnect } = useVault()
  const { topics } = useTopics()
  const navigate = useNavigate()

  const [topicNames, setTopicNames] = useState([])
  const [selected, setSelected] = useState(null)
  const [graph, setGraph] = useState(null)
  const [loading, setLoading] = useState(false)
  const [frontier, setFrontier] = useState(null)
  const [frontierLoading, setFrontierLoading] = useState(false)

  // Determine available topics: those in the vault, falling back to app topics.
  useEffect(() => {
    if (status !== 'granted') return
    listTopics().then((vaultTopics) => {
      const appNames = topics.map((t) => (typeof t === 'string' ? t : t.name))
      const merged = [...new Set([...vaultTopics, ...appNames])]
      setTopicNames(merged)
      setSelected((cur) => cur || merged[0] || null)
    })
  }, [status, topics])

  const loadTopic = useCallback(async (topic) => {
    setSelected(topic)
    setGraph(null)
    setFrontier(null)
    setLoading(true)
    const g = await loadGraph(topic)
    setGraph(g)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (selected && status === 'granted') loadTopic(selected)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  const topicLevel = (name) => {
    const t = topics.find((t) => (typeof t === 'string' ? t : t.name) === name)
    return typeof t === 'string' ? 'intermediate' : (t?.level || 'intermediate')
  }

  async function handleSuggest() {
    if (!selected) return
    setFrontierLoading(true)
    const next = await suggestNext(selected, topicLevel(selected), graph)
    setFrontier(next)
    setFrontierLoading(false)
  }

  function findVideos(query) {
    navigate(`/search?q=${encodeURIComponent(query)}`)
  }

  if (!supported) {
    return (
      <div className="p-8">
        <EmptyState
          title="Browser not supported"
          subtitle="The knowledge graph needs the File System Access API. Use Chrome, Edge, or another Chromium browser."
        />
      </div>
    )
  }

  if (status !== 'granted') {
    return (
      <div className="p-8 max-w-xl">
        <h1 className="text-lg font-medium text-text mb-1">Knowledge Graph</h1>
        <p className="text-sm text-muted mb-6">
          Connect your Obsidian vault to build a graph of what you learn. As you watch videos,
          Plato writes linked concept notes you can explore here and in Obsidian.
        </p>
        {status === 'prompt' || status === 'denied' ? (
          <button
            onClick={reconnect}
            className="px-4 py-2 border border-accent text-accent text-sm hover:bg-accent hover:text-bg transition-colors"
          >
            Reconnect &quot;{getVaultName()}&quot;
          </button>
        ) : (
          <button
            onClick={connect}
            className="px-4 py-2 border border-accent text-accent text-sm hover:bg-accent hover:text-bg transition-colors"
          >
            Connect Obsidian vault
          </button>
        )}
      </div>
    )
  }

  const concepts = graph?.concepts || []

  return (
    <div className="p-8 max-w-3xl space-y-8">
      <div>
        <h1 className="text-lg font-medium text-text mb-1">Knowledge Graph</h1>
        <p className="text-sm text-muted">
          Vault: <span className="text-text">{name}</span>
        </p>
      </div>

      {/* Topic tabs */}
      {topicNames.length > 0 ? (
        <div className="flex gap-2 flex-wrap">
          {topicNames.map((t) => (
            <button
              key={t}
              onClick={() => loadTopic(t)}
              className={`px-3 py-1.5 text-sm border transition-colors capitalize ${
                selected === t
                  ? 'border-accent text-accent'
                  : 'border-border text-muted hover:text-text hover:border-border-hover'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">No topics yet. Add topics and watch videos to populate the graph.</p>
      )}

      {/* Known concepts */}
      {loading ? (
        <p className="text-sm text-muted animate-pulse">Loading graph…</p>
      ) : selected ? (
        <section className="space-y-4">
          <h2 className="text-xs text-muted uppercase tracking-widest">
            Known concepts {concepts.length > 0 && `(${concepts.length})`}
          </h2>
          {concepts.length === 0 ? (
            <p className="text-sm text-muted">
              Nothing yet for <span className="capitalize">{selected}</span>. Watch a video on this topic
              (with a vault connected and Ollama running) to add concepts.
            </p>
          ) : (
            <div className="space-y-2">
              {concepts.map((c) => (
                <div key={c.name} className="border border-border px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-text">{c.name}</span>
                    <a
                      href={obsidianLink(name, selected, c.name)}
                      className="text-xs text-accent hover:underline shrink-0"
                    >
                      Open in Obsidian ↗
                    </a>
                  </div>
                  {c.summary && <p className="text-xs text-muted mt-1">{c.summary}</p>}
                  {c.relatesTo.length > 0 && (
                    <p className="text-xs text-subtle mt-1">→ {c.relatesTo.join(', ')}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {/* Frontier suggestions */}
      {selected && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs text-muted uppercase tracking-widest">What to learn next</h2>
            <button
              onClick={handleSuggest}
              disabled={frontierLoading}
              className="text-xs text-accent hover:underline disabled:opacity-40"
            >
              {frontierLoading ? 'thinking…' : frontier ? 'regenerate' : 'suggest next concepts'}
            </button>
          </div>
          {frontier && frontier.length === 0 && (
            <p className="text-sm text-muted">No suggestions (is Ollama running?).</p>
          )}
          {frontier && frontier.length > 0 && (
            <div className="space-y-2">
              {frontier.map((s) => (
                <div key={s.concept} className="border border-border px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-text">{s.concept}</span>
                    <button
                      onClick={() => findVideos(s.query)}
                      className="text-xs text-accent hover:underline shrink-0"
                    >
                      Find videos →
                    </button>
                  </div>
                  {s.why && <p className="text-xs text-muted mt-1">{s.why}</p>}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
