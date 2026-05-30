import { useState } from 'react'
import { useApiKey } from '../hooks/useApiKey'
import { useSlopThreshold } from '../hooks/useSlopThreshold'
import { useBlocklist } from '../hooks/useBlocklist'
import { useRefreshFeed } from '../hooks/useFeed'
import { SlopExplainer } from '../components/SlopExplainer'
import { useMinDuration } from '../hooks/useMinDuration'
import { useBanner, DEFAULT_BANNER } from '../hooks/useBanner'
import { useTheme } from '../hooks/useTheme'
import { useOllama } from '../hooks/useOllama'
import { useVault } from '../hooks/useVault'

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
  const { theme, setTheme } = useTheme()
  const { url: ollamaUrl, saveUrl: saveOllamaUrl, model: ollamaModel, saveModel: saveOllamaModel, aiEnabled, toggleAi, status: ollamaStatus } = useOllama()
  const { supported: vaultSupported, status: vaultStatus, name: vaultName, connect: connectVault, reconnect: reconnectVault, disconnect: disconnectVault } = useVault()
  const refresh = useRefreshFeed()

  async function handleConnectVault() {
    try { await connectVault() } catch { /* user cancelled picker */ }
  }

  const [ollamaUrlInput, setOllamaUrlInput] = useState(ollamaUrl)
  const [ollamaModelInput, setOllamaModelInput] = useState(ollamaModel)

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

      {/* Theme */}
      <section className="space-y-4">
        <h2 className="text-xs text-muted uppercase tracking-widest">Theme</h2>
        <div className="flex border border-border w-fit">
          {[
            { value: 'light',  label: 'Light'  },
            { value: 'system', label: 'System' },
            { value: 'dark',   label: 'Dark'   },
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={`px-5 py-2 text-sm transition-colors border-r border-border last:border-r-0 ${
                theme === value
                  ? 'text-accent bg-surface'
                  : 'text-muted hover:text-text'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
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
            style={{ background: 'var(--banner-gradient)' }}
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

      {/* AI Re-ranking */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xs text-muted uppercase tracking-widest">AI Re-ranking</h2>
          <span
            className={`w-2 h-2 rounded-full ${
              ollamaStatus.available === null
                ? 'bg-muted'
                : ollamaStatus.available
                ? 'bg-emerald-400'
                : 'bg-red-400'
            }`}
          />
        </div>
        <p className="text-sm text-muted">
          Re-ranks your feed using a local LLM via Ollama for better quality and proficiency fit.
        </p>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-muted">Ollama base URL</label>
            <input
              type="text"
              value={ollamaUrlInput}
              onChange={(e) => setOllamaUrlInput(e.target.value)}
              onBlur={() => saveOllamaUrl(ollamaUrlInput)}
              className="w-full bg-surface border border-border px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:border-border-hover font-mono"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted">Model</label>
            <input
              type="text"
              value={ollamaModelInput}
              onChange={(e) => setOllamaModelInput(e.target.value)}
              onBlur={() => saveOllamaModel(ollamaModelInput)}
              placeholder="llama3.1:8b"
              className="w-full bg-surface border border-border px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:border-border-hover font-mono"
            />
          </div>
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              onClick={() => toggleAi(!aiEnabled)}
              className={`relative w-9 h-5 rounded-full transition-colors ${aiEnabled ? 'bg-accent' : 'bg-border'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-bg transition-transform ${aiEnabled ? 'translate-x-4' : 'translate-x-0'}`}
              />
            </div>
            <span className="text-sm text-text">Enable AI re-ranking</span>
          </label>
        </div>
        {ollamaStatus.available === false && (
          <div className="text-xs text-muted space-y-1 border border-border px-3 py-2">
            <p className="text-text">Ollama not detected. To enable:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Install Ollama from <span className="font-mono">ollama.com</span></li>
              <li><span className="font-mono">ollama pull llama3.1:8b</span></li>
              <li><span className="font-mono">OLLAMA_ORIGINS=http://localhost:5173 ollama serve</span></li>
            </ol>
          </div>
        )}
        {ollamaStatus.available && ollamaStatus.models.length > 0 && (
          <p className="text-xs text-muted">
            Available models: {ollamaStatus.models.join(', ')}
          </p>
        )}
      </section>

      {/* Obsidian Knowledge Graph */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xs text-muted uppercase tracking-widest">Obsidian Knowledge Graph</h2>
          <span
            className={`w-2 h-2 rounded-full ${
              vaultStatus === 'granted'
                ? 'bg-emerald-400'
                : vaultStatus === 'unsupported'
                ? 'bg-red-400'
                : 'bg-muted'
            }`}
          />
        </div>
        <p className="text-sm text-muted">
          Connect an Obsidian vault folder. As you watch videos (with AI enabled), Plato extracts
          the concepts and writes linked notes into <span className="font-mono">Plato/</span>, building
          a graph of what you&apos;ve learned. View it on the Knowledge page or in Obsidian.
        </p>

        {!vaultSupported ? (
          <div className="text-xs text-muted border border-border px-3 py-2">
            Your browser doesn&apos;t support the File System Access API. Use Chrome, Edge, or another
            Chromium-based browser to connect a vault.
          </div>
        ) : vaultStatus === 'granted' ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-text">
              Connected: <span className="font-mono">{vaultName}</span>
            </span>
            <button
              onClick={disconnectVault}
              className="text-xs text-muted hover:text-text transition-colors"
            >
              disconnect
            </button>
          </div>
        ) : vaultStatus === 'prompt' || vaultStatus === 'denied' ? (
          <div className="flex items-center gap-3">
            <button
              onClick={reconnectVault}
              className="px-4 py-2 border border-accent text-accent text-sm hover:bg-accent hover:text-bg transition-colors"
            >
              Reconnect &quot;{vaultName}&quot;
            </button>
            <button
              onClick={disconnectVault}
              className="text-xs text-muted hover:text-text transition-colors"
            >
              forget
            </button>
          </div>
        ) : (
          <button
            onClick={handleConnectVault}
            className="px-4 py-2 border border-accent text-accent text-sm hover:bg-accent hover:text-bg transition-colors"
          >
            Connect Obsidian vault
          </button>
        )}
      </section>

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
