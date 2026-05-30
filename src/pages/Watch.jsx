import { useEffect, useRef, useState } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { recordWatch } from '../lib/storage'
import { vaultPermission } from '../lib/vault'
import { extractConcepts, writeConceptNotes } from '../lib/concepts'

export function Watch() {
  const { videoId } = useParams()
  const { state } = useLocation()
  const navigate = useNavigate()
  const video = state?.video
  const topic = state?.topic
  const level = state?.level || 'intermediate'

  // 'idle' | 'syncing' | 'done' | 'error' | 'skipped'
  const [syncStatus, setSyncStatus] = useState('idle')
  const ranFor = useRef(null)

  useEffect(() => {
    // Dedupe so we only sync a given video once (also guards React StrictMode's
    // double-mount in dev). We intentionally do NOT abort the sync on unmount —
    // it's a background write, and setState on an unmounted component is a no-op.
    if (!videoId || ranFor.current === videoId) return
    ranFor.current = videoId

    const topicName = typeof topic === 'string' ? topic : topic?.name
    recordWatch({
      videoId,
      title: video?.title || '',
      channelTitle: video?.channelTitle || '',
      topic: topicName || '',
      level,
    })

    if (!video || !topicName) return

    ;(async () => {
      const perm = await vaultPermission()
      if (perm !== 'granted') { setSyncStatus('skipped'); return }
      setSyncStatus('syncing')
      try {
        const concepts = await extractConcepts(video, { topic: topicName })
        if (concepts.length === 0) { setSyncStatus('error'); return }
        await writeConceptNotes(topicName, level, video, concepts)
        setSyncStatus('done')
      } catch {
        setSyncStatus('error')
      }
    })()
  }, [videoId, video, topic, level])

  return (
    <div className="p-6">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 text-sm text-muted hover:text-text transition-colors flex items-center gap-1.5"
      >
        ← Back
      </button>

      <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
        <iframe
          className="absolute inset-0 w-full h-full"
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
          title={video?.title ?? 'Video'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>

      {video && (
        <div className="mt-6 space-y-3">
          <h1 className="text-lg font-medium text-text leading-snug">{video.title}</h1>
          <div className="flex items-center gap-2 text-sm text-muted flex-wrap">
            <span>{video.channelTitle}</span>
            {video.publishedAt && (
              <>
                <span>·</span>
                <span>{new Date(video.publishedAt).toLocaleDateString()}</span>
              </>
            )}
            {video.duration && (
              <>
                <span>·</span>
                <span>{video.duration}</span>
              </>
            )}
            {syncStatus !== 'idle' && syncStatus !== 'skipped' && (
              <>
                <span>·</span>
                <span className={syncStatus === 'error' ? 'text-red-400' : 'text-accent'}>
                  {syncStatus === 'syncing' && '◌ syncing to Obsidian…'}
                  {syncStatus === 'done' && '✓ added to knowledge graph'}
                  {syncStatus === 'error' && 'sync failed (is Ollama running?)'}
                </span>
              </>
            )}
          </div>
          {video.description && (
            <p className="text-sm text-muted leading-relaxed whitespace-pre-line border-t border-border pt-4 mt-4">
              {video.description}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
