import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getWatchHistory, clearWatchHistory } from '../lib/storage'
import { loadVideoConcepts } from '../lib/graph'
import { useVault } from '../hooks/useVault'
import { EmptyState } from '../components/EmptyState'

const LEVEL_COLOR = {
  beginner:     'text-emerald-400',
  intermediate: 'text-accent',
  advanced:     'text-violet-400',
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days < 1) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}w ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}

export function Watched() {
  const navigate = useNavigate()
  const { connected } = useVault()
  const [history, setHistory] = useState(() => getWatchHistory())
  // { [videoId]: string[] | null }  — null = no note / not extracted
  const [concepts, setConcepts] = useState({})

  // Read extracted concepts for each video back from the vault.
  useEffect(() => {
    if (!connected || history.length === 0) return
    let cancelled = false
    ;(async () => {
      const map = {}
      for (const entry of history) {
        map[entry.videoId] = await loadVideoConcepts(entry.videoId)
      }
      if (!cancelled) setConcepts(map)
    })()
    return () => { cancelled = true }
  }, [connected, history])

  function open(entry) {
    navigate(`/watch/${entry.videoId}`, {
      state: {
        video: { videoId: entry.videoId, title: entry.title, channelTitle: entry.channelTitle },
        topic: entry.topic,
        level: entry.level,
      },
    })
  }

  function handleClear() {
    clearWatchHistory()
    setHistory([])
    setConcepts({})
  }

  if (history.length === 0) {
    return (
      <div className="p-8">
        <EmptyState
          title="Nothing watched yet"
          subtitle="Videos you open will appear here, along with the concepts extracted from each."
        />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium text-text mb-1">Watched</h1>
          <p className="text-sm text-muted">
            {history.length} video{history.length === 1 ? '' : 's'} · concepts extracted as you watch
          </p>
        </div>
        <button
          onClick={handleClear}
          className="text-xs text-muted hover:text-text transition-colors"
        >
          clear history
        </button>
      </div>

      {!connected && (
        <div className="text-xs text-muted border border-border px-3 py-2">
          Connect your Obsidian vault in Settings to see the concepts extracted from each video.
        </div>
      )}

      <div className="space-y-3">
        {history.map((entry) => {
          const vidConcepts = concepts[entry.videoId]
          return (
            <div key={entry.videoId} className="border border-border bg-surface flex gap-3 p-3">
              <button
                onClick={() => open(entry)}
                className="shrink-0 w-32 aspect-video bg-subtle overflow-hidden group"
                title="Watch again"
              >
                <img
                  src={`https://i.ytimg.com/vi/${entry.videoId}/mqdefault.jpg`}
                  alt={entry.title}
                  className="w-full h-full object-cover group-hover:opacity-85 transition-opacity"
                  loading="lazy"
                />
              </button>

              <div className="min-w-0 flex-1 space-y-1.5">
                <button
                  onClick={() => open(entry)}
                  className="block text-left text-sm font-medium text-text leading-snug line-clamp-2 hover:text-accent transition-colors"
                >
                  {entry.title || entry.videoId}
                </button>

                <div className="flex items-center gap-2 text-xs text-muted flex-wrap">
                  {entry.channelTitle && <span className="truncate">{entry.channelTitle}</span>}
                  {entry.topic && (
                    <>
                      <span>·</span>
                      <span className="capitalize">{entry.topic}</span>
                    </>
                  )}
                  {entry.level && entry.level !== 'intermediate' && (
                    <span className={LEVEL_COLOR[entry.level]}>{entry.level}</span>
                  )}
                  <span>·</span>
                  <span>{timeAgo(entry.watchedAt)}</span>
                </div>

                {/* Extracted concepts */}
                {connected && (
                  vidConcepts === undefined ? (
                    <p className="text-xs text-subtle">loading concepts…</p>
                  ) : vidConcepts && vidConcepts.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {vidConcepts.map((c) => (
                        <span
                          key={c}
                          className="text-xs text-accent border border-border px-1.5 py-0.5"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-subtle">no concepts extracted</p>
                  )
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
