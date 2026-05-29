import { useParams, useLocation, useNavigate } from 'react-router-dom'

export function Watch() {
  const { videoId } = useParams()
  const { state } = useLocation()
  const navigate = useNavigate()
  const video = state?.video

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
