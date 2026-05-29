import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFeed, useRefreshFeed } from '../hooks/useFeed'
import { useTopics } from '../hooks/useTopics'
import { useApiKey } from '../hooks/useApiKey'
import { useBlocklist } from '../hooks/useBlocklist'
import { useSlopThreshold } from '../hooks/useSlopThreshold'
import { useMinDuration } from '../hooks/useMinDuration'
import { getAiRerankEnabled } from '../lib/storage'
import { VideoCard } from '../components/VideoCard'
import { EmptyState } from '../components/EmptyState'

function SkeletonCard() {
  return (
    <div className="shrink-0 w-72 border border-border bg-surface animate-pulse">
      <div className="aspect-video bg-border" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-border w-3/4" />
        <div className="h-3 bg-border w-1/2" />
      </div>
    </div>
  )
}

function SkeletonSection({ topic }) {
  const name = typeof topic === 'string' ? topic : topic.name
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-text capitalize">{name}</h2>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </section>
  )
}

const LEVEL_COLOR = {
  beginner:     'text-emerald-400',
  intermediate: 'text-accent',
  advanced:     'text-violet-400',
}

function TopicSection({ topic, videos }) {
  const name  = typeof topic === 'string' ? topic : topic.name
  const level = typeof topic === 'string' ? null  : topic.level
  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-sm font-medium text-text capitalize">{name}</h2>
        {level && level !== 'intermediate' && (
          <span className={`text-xs ${LEVEL_COLOR[level]}`}>{level}</span>
        )}
        <span className="text-xs text-muted">{videos.length}</span>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-3 -mx-8 px-8">
        {videos.map((video) => (
          <div key={video.videoId} className="shrink-0 w-72">
            <VideoCard video={video} />
          </div>
        ))}
      </div>
    </section>
  )
}

export function Feed() {
  const { topics } = useTopics()
  const { apiKey } = useApiKey()
  const { blocklist } = useBlocklist()
  const { threshold } = useSlopThreshold()
  const { minDuration } = useMinDuration()
  const [aiEnabled] = useState(() => getAiRerankEnabled())
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef(null)

  useEffect(() => {
    if (aiStatus === 'scoring') {
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [aiStatus])
  const { data: sections, isLoading, isError, error, filteredCount, aiStatus } = useFeed(topics, apiKey, blocklist, threshold, minDuration, aiEnabled)
  const refresh = useRefreshFeed()
  const navigate = useNavigate()

  if (!apiKey) {
    return (
      <div className="p-8">
        <EmptyState
          title="API key required"
          subtitle="Add your YouTube Data API v3 key to get started."
          action={
            <button
              onClick={() => navigate('/settings')}
              className="px-4 py-2 border border-accent text-accent text-sm hover:bg-accent hover:text-bg transition-colors"
            >
              Go to Settings
            </button>
          }
        />
      </div>
    )
  }

  if (topics.length === 0) {
    return (
      <div className="p-8">
        <EmptyState
          title="No topics yet"
          subtitle="Define what you want to watch — machine learning, philosophy, physics."
          action={
            <button
              onClick={() => navigate('/topics')}
              className="px-4 py-2 border border-accent text-accent text-sm hover:bg-accent hover:text-bg transition-colors"
            >
              Add Topics
            </button>
          }
        />
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-3">
          <p className="text-xs text-muted">
            {filteredCount > 0 ? `${filteredCount} videos filtered` : 'curated feed'}
          </p>
          {aiStatus === 'scoring' && (
            <span className="text-xs text-muted animate-pulse">AI scoring… {elapsed}s</span>
          )}
          {aiStatus === 'done' && (
            <span className="text-xs text-accent">AI scoring done</span>
          )}
        </div>
        <button
          onClick={refresh}
          disabled={isLoading}
          className="text-xs text-muted hover:text-text transition-colors disabled:opacity-40"
        >
          {isLoading ? 'loading...' : 'refresh'}
        </button>
      </div>

      {isError && (
        <div className="mb-8 px-4 py-3 border border-error text-error text-sm">
          {error?.message || 'Failed to load feed.'}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-12">
          {topics.map((t) => <SkeletonSection key={typeof t === 'string' ? t : t.name} topic={t} />)}
        </div>
      ) : sections?.length > 0 ? (
        <div className="space-y-12">
          {sections.map(({ topic, videos }) => (
            <TopicSection key={topic} topic={topic} videos={videos} />
          ))}
        </div>
      ) : (
        !isError && (
          <EmptyState
            title="No videos found"
            subtitle="Try different topics, lower the slop threshold, or check your API key."
          />
        )
      )}
    </div>
  )
}
