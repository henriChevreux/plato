import { useSaved } from '../hooks/useSaved'
import { VideoCard } from '../components/VideoCard'
import { EmptyState } from '../components/EmptyState'
import { useNavigate } from 'react-router-dom'

export function Saved() {
  const { saved } = useSaved()
  const navigate = useNavigate()

  if (saved.length === 0) {
    return (
      <EmptyState
        title="Nothing saved yet"
        subtitle="Hover a video and click 'save' to add it here."
        action={
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 border border-accent text-accent text-sm hover:bg-accent hover:text-bg transition-colors"
          >
            Browse Feed
          </button>
        }
      />
    )
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-medium text-text">Saved</h1>
        <span className="text-xs text-muted">{saved.length} video{saved.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {saved.map((video) => (
          <VideoCard key={video.videoId} video={video} />
        ))}
      </div>
    </div>
  )
}
