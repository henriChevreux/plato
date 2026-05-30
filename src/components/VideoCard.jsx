import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSaved } from '../hooks/useSaved'
import { useBlocklist } from '../hooks/useBlocklist'
import { slopLabel } from '../lib/slop'
import { recordFeedback, removeFeedback, getLabel, LABEL_UP, LABEL_DOWN } from '../lib/preferences'

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days < 1) return 'today'
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}w ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}

const qualityDot = {
  clean: 'bg-emerald-500',
  questionable: 'bg-yellow-500',
  slop: 'bg-red-500',
}

export function VideoCard({ video, onBlocked, topic }) {
  const topicName = typeof topic === 'string' ? topic : topic?.name
  const topicLevel = typeof topic === 'string' ? 'intermediate' : (topic?.level || 'intermediate')
  const navigate = useNavigate()
  const { isSaved, saveVideo, unsaveVideo } = useSaved()
  const { blockChannel } = useBlocklist()
  const [actionsVisible, setActionsVisible] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [prefLabel, setPrefLabel] = useState(() => getLabel(video.videoId))

  if (blocked) return null

  const saved = isSaved(video.videoId)
  const label = slopLabel(video.slopScore ?? 0)

  function handleBlock(e) {
    e.preventDefault()
    e.stopPropagation()
    blockChannel(video.channelTitle)
    setBlocked(true)
    onBlocked?.()
  }

  function handleSave(e) {
    e.preventDefault()
    e.stopPropagation()
    saved ? unsaveVideo(video.videoId) : saveVideo(video)
  }

  function handleThumb(value, e) {
    e.preventDefault()
    e.stopPropagation()
    if (prefLabel === value) {
      removeFeedback(video.videoId)
      setPrefLabel(null)
    } else {
      recordFeedback({
        videoId: video.videoId,
        featureVector: video.features ?? null,
        llmScore: video.llmScore ?? null,
        label: value,
      })
      setPrefLabel(value)
    }
  }

  return (
    <div
      className="group relative border border-border hover:border-border-hover transition-colors bg-surface"
      onMouseEnter={() => setActionsVisible(true)}
      onMouseLeave={() => setActionsVisible(false)}
    >
      <div
        className="cursor-pointer"
        onClick={() => navigate(`/watch/${video.videoId}`, { state: { video, topic: topicName, level: topicLevel } })}
      >
        <div className="relative overflow-hidden aspect-video bg-subtle">
          {video.thumbnail ? (
            <img
              src={video.thumbnail}
              alt={video.title}
              className="w-full h-full object-cover group-hover:opacity-85 transition-opacity"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted text-xs">
              no thumbnail
            </div>
          )}

          {/* quality dot */}
          <div
            className={`absolute top-2 right-2 w-2 h-2 rounded-full opacity-80 ${qualityDot[label]}`}
            title={`Quality: ${label} (slop score: ${video.slopScore ?? 0})`}
          />

          {/* duration badge */}
          {video.duration && (
            <div className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-xs px-1.5 py-0.5 font-medium tabular-nums">
              {video.duration}
            </div>
          )}
        </div>

        <div className="p-3 space-y-1">
          <p className="text-sm font-medium text-text leading-snug line-clamp-2 group-hover:text-accent transition-colors">
            {video.title}
          </p>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted truncate">{video.channelTitle}</p>
            <p className="text-xs text-muted shrink-0 ml-2">{timeAgo(video.publishedAt)}</p>
          </div>
        </div>
      </div>

      {/* hover action bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 flex border-t border-border bg-surface transition-opacity duration-150 ${
          actionsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <button
          onClick={(e) => handleThumb(LABEL_UP, e)}
          title="More like this"
          className={`px-3 py-2 text-xs border-r border-border transition-colors ${
            prefLabel === LABEL_UP ? 'text-emerald-400' : 'text-muted hover:text-text'
          }`}
        >
          👍
        </button>
        <button
          onClick={(e) => handleThumb(LABEL_DOWN, e)}
          title="Less like this"
          className={`px-3 py-2 text-xs border-r border-border transition-colors ${
            prefLabel === LABEL_DOWN ? 'text-red-400' : 'text-muted hover:text-text'
          }`}
        >
          👎
        </button>
        <button
          onClick={handleSave}
          className="flex-1 py-2 text-xs text-muted hover:text-text transition-colors border-r border-border"
        >
          {saved ? 'saved ✓' : 'save'}
        </button>
        <button
          onClick={handleBlock}
          className="flex-1 py-2 text-xs text-muted hover:text-error transition-colors"
        >
          block
        </button>
      </div>
    </div>
  )
}
