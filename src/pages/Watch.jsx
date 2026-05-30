import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { recordWatch } from '../lib/storage'
import { vaultPermission } from '../lib/vault'
import { extractConcepts, writeConceptNotes } from '../lib/concepts'
import { recordFeedback, removeFeedback, getLabel, LABEL_UP, LABEL_DOWN } from '../lib/preferences'
import { useTopics } from '../hooks/useTopics'

export function Watch() {
  const { videoId } = useParams()
  const { state } = useLocation()
  const navigate = useNavigate()
  const video = state?.video
  const navTopic = typeof state?.topic === 'string' ? state.topic : state?.topic?.name
  const navLevel = state?.level || 'intermediate'

  const { topics } = useTopics()

  const [assignedTopic, setAssignedTopic] = useState(navTopic || '')
  const [label, setLabel] = useState(() => getLabel(videoId))
  // 'idle' | 'syncing' | 'done' | 'error' | 'skipped'
  const [syncStatus, setSyncStatus] = useState('idle')
  const recordedFor = useRef(null)
  const syncedKey = useRef(null)

  const levelForTopic = useCallback(
    (name) => topics.find((t) => t.name === name)?.level || navLevel,
    [topics, navLevel]
  )

  // File the video under a topic: record the watch + extract/write concept notes.
  const syncToTopic = useCallback(async (topicName) => {
    if (!video || !topicName) return
    const key = `${videoId}|${topicName}`
    if (syncedKey.current === key) return
    syncedKey.current = key

    const level = levelForTopic(topicName)
    recordWatch({
      videoId,
      title: video.title || '',
      channelTitle: video.channelTitle || '',
      topic: topicName,
      level,
    })

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
  }, [video, videoId, levelForTopic])

  // On mount: log the watch. If it already has a topic (came from the Feed),
  // auto-sync; otherwise just record it topic-less until the user assigns one.
  useEffect(() => {
    if (!videoId || recordedFor.current === videoId) return
    recordedFor.current = videoId
    if (video && navTopic) {
      syncToTopic(navTopic)
    } else {
      recordWatch({
        videoId,
        title: video?.title || '',
        channelTitle: video?.channelTitle || '',
        topic: '',
        level: navLevel,
      })
    }
  }, [videoId, video, navTopic, navLevel, syncToTopic])

  function handlePick(e) {
    const name = e.target.value
    setAssignedTopic(name)
    if (name) syncToTopic(name)
  }

  function handleThumb(value) {
    if (label === value) {
      removeFeedback(videoId)
      setLabel(null)
    } else {
      const featureVector = video?.features ?? video?.score?.features ?? null
      recordFeedback({ videoId, featureVector, llmScore: video?.llmScore ?? null, label: value })
      setLabel(value)
    }
  }

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
        <div className="mt-6 space-y-4">
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
          </div>

          {/* Feedback — trains the on-device preference model */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-text">Helpful?</span>
            <button
              onClick={() => handleThumb(LABEL_UP)}
              title="More like this"
              className={`px-3 py-1.5 border text-sm transition-colors ${
                label === LABEL_UP
                  ? 'border-emerald-400 text-emerald-400'
                  : 'border-border text-muted hover:text-text hover:border-border-hover'
              }`}
            >
              👍
            </button>
            <button
              onClick={() => handleThumb(LABEL_DOWN)}
              title="Less like this"
              className={`px-3 py-1.5 border text-sm transition-colors ${
                label === LABEL_DOWN
                  ? 'border-red-400 text-red-400'
                  : 'border-border text-muted hover:text-text hover:border-border-hover'
              }`}
            >
              👎
            </button>
          </div>

          {/* Save to a topic / knowledge graph */}
          <div className="flex items-center gap-3 flex-wrap border-y border-border py-3">
            <span className="text-sm text-text">Save to topic:</span>
            {topics.length === 0 ? (
              <button
                onClick={() => navigate('/topics')}
                className="text-sm text-accent hover:underline"
              >
                add a topic first →
              </button>
            ) : (
              <select
                value={assignedTopic}
                onChange={handlePick}
                className="bg-surface border border-border px-2 py-1.5 text-sm text-text focus:outline-none focus:border-border-hover capitalize"
              >
                <option value="">Choose a topic…</option>
                {topics.map((t) => (
                  <option key={t.name} value={t.name}>{t.name}</option>
                ))}
              </select>
            )}
            {syncStatus === 'syncing' && (
              <span className="text-xs text-accent">◌ syncing to Obsidian…</span>
            )}
            {syncStatus === 'done' && assignedTopic && (
              <span className="text-xs text-accent">✓ saved to {assignedTopic}</span>
            )}
            {syncStatus === 'skipped' && assignedTopic && (
              <span className="text-xs text-muted">saved to history — connect a vault to extract concepts</span>
            )}
            {syncStatus === 'error' && (
              <span className="text-xs text-red-400">extraction failed (is Ollama running?)</span>
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
