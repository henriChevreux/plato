import { useState } from 'react'
import { useApiKey } from '../hooks/useApiKey'
import { useSlopThreshold } from '../hooks/useSlopThreshold'
import { useBlocklist } from '../hooks/useBlocklist'
import { useRefreshFeed } from '../hooks/useFeed'
import { SlopExplainer } from '../components/SlopExplainer'
import { useMinDuration } from '../hooks/useMinDuration'
import { useBanner, DEFAULT_BANNER } from '../hooks/useBanner'

const THRESHOLD_LABELS = {
  0: 'Off — show everything',
  2: 'Lenient — obvious slop only',
  4: 'Balanced (default)',
  6: 'Strict — remove anything questionable',
  10: 'Maximum — very aggressive',
}

function closestLabel(val) {
  const keys = Object.keys(THRESHOLD_LABELS).map(Number)
  const closest = keys.reduce((a, b) => Math.abs(b - val) < Math.abs(a - val) ? b : a)
  return THRESHOLD_LABELS[closest]
}

export function Settings() {
  const { apiKey, saveApiKey } = useApiKey()
  const { threshold, setThreshold } = useSlopThreshold()
  const { blocklist, unblockChannel } = useBlocklist()
  const { minDuration, setMinDuration } = useMinDuration()
  const { bannerSrc, isCustom, uploadBanner, resetBanner } = useBanner()
  const refresh = useRefreshFeed()

  const [keyInput, setKeyInput] = useState(apiKey)
  const [saved, setSaved] = useState(false)

  function handleSaveKey(e) {
    e.preventDefault()
    saveApiKey(keyInput)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleThresholdChange(e) {
    const val = Number(e.target.value)
    setThreshold(val)
    refresh()
  }

  function handleUnblock(channel) {
    unblockChannel(channel)
    refresh()
  }

  return (
    <div className="p-8 max-w-xl space-y-12">
      <div>
        <h1 className="text-lg font-medium text-text mb-1">Settings</h1>
        <p className="text-sm text-muted">Preferences are stored locally in your browser.</p>
      </div>

      {/* API Key */}
      <section className="space-y-4">
        <h2 className="text-xs text-muted uppercase tracking-widest">YouTube API Key</h2>
        <form onSubmit={handleSaveKey} className="space-y-3">
          <input
            type="password"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="AIza..."
            className="w-full bg-surface border border-border px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:border-border-hover font-mono"
          />
          <p className="text-xs text-muted">
            Get a free key at{' '}
            <a
              href="https://console.cloud.google.com/apis/library/youtube.googleapis.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              Google Cloud Console
            </a>
            . Enable YouTube Data API v3, then create an API key under Credentials.
          </p>
          <button
            type="submit"
            className="px-4 py-2 border border-accent text-accent text-sm hover:bg-accent hover:text-bg transition-colors"
          >
            {saved ? 'Saved ✓' : 'Save key'}
          </button>
        </form>
      </section>

      {/* Slop Filter */}
      <section className="space-y-4">
        <h2 className="text-xs text-muted uppercase tracking-widest">Slop Filter</h2>
        <p className="text-sm text-muted">
          Plato scores each video for clickbait, reaction content, vlogs, and low-effort patterns.
          Adjust how aggressively it filters.
        </p>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text">Threshold: {threshold}</span>
            <span className="text-muted text-xs">{closestLabel(threshold)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={threshold}
            onChange={handleThresholdChange}
            className="w-full accent-accent"
          />
          <div className="flex justify-between text-xs text-muted">
            <span>Off</span>
            <span>Maximum</span>
          </div>
        </div>
        <SlopExplainer threshold={threshold} />
      </section>

      {/* Banner */}
      <section className="space-y-4">
        <h2 className="text-xs text-muted uppercase tracking-widest">Banner</h2>
        <div className="relative w-full overflow-hidden border border-border">
          <img
            src={bannerSrc}
            alt="Current banner"
            className="w-full h-auto block"
          />
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to bottom, rgba(10,10,10,0.1) 0%, rgba(10,10,10,0.5) 100%)' }}
          />
        </div>
        <div className="flex items-center gap-3">
          <label className="px-4 py-2 border border-border text-muted text-sm hover:border-border-hover hover:text-text transition-colors cursor-pointer">
            Upload image
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => uploadBanner(e.target.files?.[0])}
            />
          </label>
          {isCustom && (
            <button
              onClick={resetBanner}
              className="text-xs text-muted hover:text-text transition-colors"
            >
              Reset to default
            </button>
          )}
        </div>
        <p className="text-xs text-muted">
          Stored locally in your browser. Recommended ratio: ~3:1 (e.g. 1500×500px).
        </p>
      </section>

      {/* Minimum duration */}
      <section className="space-y-4">
        <h2 className="text-xs text-muted uppercase tracking-widest">Minimum Video Length</h2>
        <p className="text-sm text-muted">
          Filter out short clips, YouTube Shorts, and low-effort content under a certain length.
        </p>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text">
              {minDuration === 0
                ? 'Off — show all lengths'
                : `At least ${Math.floor(minDuration / 60)} min`}
            </span>
            <span className="text-xs text-muted">
              {minDuration === 0
                ? 'API: no filter'
                : minDuration >= 1200
                ? 'API: long (>20 min)'
                : 'API: medium + long (>4 min)'}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={30}
            step={1}
            value={Math.floor(minDuration / 60)}
            onChange={(e) => setMinDuration(Number(e.target.value) * 60)}
            className="w-full accent-accent"
          />
          <div className="flex justify-between text-xs text-muted">
            <span>Off</span>
            <span>30 min</span>
          </div>
        </div>
      </section>

      {/* Blocked Channels */}
      {blocklist.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xs text-muted uppercase tracking-widest">Blocked Channels</h2>
          <div className="space-y-1">
            {blocklist.map((channel) => (
              <div
                key={channel}
                className="flex items-center justify-between px-3 py-2 border border-border text-sm"
              >
                <span className="text-muted">{channel}</span>
                <button
                  onClick={() => handleUnblock(channel)}
                  className="text-xs text-muted hover:text-text transition-colors"
                >
                  unblock
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Quota info */}
      <section className="border-t border-border pt-6">
        <p className="text-xs text-muted">
          Quota: each topic search = 100 units + 1 unit for duration lookup. Free tier = 10,000/day.
          With 5 topics that's ~501 units per refresh — roughly 19 refreshes/day.
          Results are cached per browser session.
        </p>
      </section>
    </div>
  )
}
