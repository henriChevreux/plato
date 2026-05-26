import { useBanner } from '../hooks/useBanner'

export function Banner() {
  const { bannerSrc } = useBanner()

  return (
    <div className="relative w-full overflow-hidden">
      <img
        src={bannerSrc}
        alt=""
        className="w-full h-auto block"
        draggable={false}
      />
      {/* subtle fade at bottom so content transitions cleanly */}
      <div
        className="absolute inset-0"
        style={{
          background: 'var(--banner-gradient)',
        }}
      />
    </div>
  )
}
