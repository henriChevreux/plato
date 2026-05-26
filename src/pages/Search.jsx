import { useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { searchByTopic } from '../lib/youtube'
import { scoreVideo } from '../lib/scoring'
import { slopScore, slopLabel } from '../lib/slop'
import { useApiKey } from '../hooks/useApiKey'
import { useTopics } from '../hooks/useTopics'
import { useBlocklist } from '../hooks/useBlocklist'
import { useSlopThreshold } from '../hooks/useSlopThreshold'
import { VideoCard } from '../components/VideoCard'
import { EmptyState } from '../components/EmptyState'
import { useNavigate } from 'react-router-dom'

function SearchSkeleton() {
  return (
    <div className="border border-border bg-surface animate-pulse">
      <div className="aspect-video bg-border" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-border w-3/4" />
        <div className="h-3 bg-border w-1/2" />
      </div>
    </div>
  )
}

export function Search() {
  const { apiKey } = useApiKey()
  const { topics } = useTopics()
  const { blocklist } = useBlocklist()
  const { threshold } = useSlopThreshold()
  const navigate = useNavigate()

  const [query, setQuery] = useState('')
  const [submitted, setSubmitted] = useState('')
  const [showFiltered, setShowFiltered] = useState(false)
  const inputRef = useRef(null)

  const { data: rawResults, isLoading, isError, error } = useQuery({
    queryKey: ['search', submitted],
    queryFn: () => searchByTopic(submitted, apiKey, 2),
    enabled: Boolean(submitted && apiKey),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  })

  function handleSubmit(e) {
    e.preventDefault()
    const q = query.trim()
    if (q) setSubmitted(q)
  }

  const blockSet = new Set(blocklist)

  const scored = rawResults?.map((v) => ({
    ...v,
    score: scoreVideo(v, topics),
    slopScore: slopScore(v),
  }))

  const clean = scored?.filter((v) => v.slopScore < threshold && !blockSet.has(v.channelTitle))
  const filtered = scored?.filter((v) => v.slopScore >= threshold || blockSet.has(v.channelTitle))

  const displayed = showFiltered ? filtered : clean

  if (!apiKey) {
    return (
      <EmptyState
        title="API key required"
        subtitle="Add your YouTube Data API v3 key to search."
        action={
          <button
            onClick={() => navigate('/settings')}
            className="px-4 py-2 border border-accent text-accent text-sm hover:bg-accent hover:text-bg transition-colors"
          >
            Go to Settings
          </button>
        }
      />
    )
  }

  return (
    <div className="p-8">
      <form onSubmit={handleSubmit} className="flex gap-2 mb-8 max-w-2xl">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search — slop filtered automatically"
          className="flex-1 bg-surface border border-border px-4 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none focus:border-border-hover"
          autoFocus
        />
        <button
          type="submit"
          className="px-5 py-2.5 border border-accent text-accent text-sm hover:bg-accent hover:text-bg transition-colors"
        >
          Search
        </button>
      </form>

      {isError && (
        <div className="mb-6 px-4 py-3 border border-error text-error text-sm max-w-2xl">
          {error?.message || 'Search failed.'}
        </div>
      )}

      {scored && (
        <div className="flex items-center gap-4 mb-6 text-xs text-muted">
          <span>{clean?.length ?? 0} results</span>
          {(filtered?.length ?? 0) > 0 && (
            <button
              onClick={() => setShowFiltered((v) => !v)}
              className="text-muted hover:text-text transition-colors underline underline-offset-2"
            >
              {showFiltered
                ? `← back to clean results`
                : `${filtered.length} filtered out — show?`}
            </button>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SearchSkeleton key={i} />)}
        </div>
      ) : displayed?.length > 0 ? (
        <>
          {showFiltered && (
            <div className="mb-4 px-3 py-2 border border-[#333] text-xs text-muted max-w-fit">
              showing filtered content — these were removed from your results
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayed.map((video) => (
              <VideoCard key={video.videoId} video={video} />
            ))}
          </div>
        </>
      ) : submitted && !isLoading ? (
        <EmptyState
          title={showFiltered ? "Nothing was filtered" : "No results"}
          subtitle={showFiltered ? "All results passed the slop filter." : "Try a different query."}
        />
      ) : null}
    </div>
  )
}
