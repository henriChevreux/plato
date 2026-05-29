const KEYS = {
  API_KEY: 'plato_api_key',
  TOPICS: 'plato_topics',
  BLOCKLIST: 'plato_blocklist',
  SAVED: 'plato_saved',
  SLOP_THRESHOLD: 'plato_slop_threshold',
  MIN_DURATION: 'plato_min_duration',
  BANNER: 'plato_banner',
  THEME: 'plato_theme',
  OLLAMA_URL: 'plato_ollama_url',
  OLLAMA_MODEL: 'plato_ollama_model',
  AI_RERANK_ENABLED: 'plato_ai_rerank',
}

export function getApiKey() {
  return localStorage.getItem(KEYS.API_KEY) || ''
}
export function setApiKey(key) {
  localStorage.setItem(KEYS.API_KEY, key)
}

export function getTopics() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEYS.TOPICS)) || []
    // Migrate from string[] to {name, level}[]
    return raw.map((t) => (typeof t === 'string' ? { name: t, level: 'intermediate' } : t))
  } catch { return [] }
}
export function setTopics(topics) {
  localStorage.setItem(KEYS.TOPICS, JSON.stringify(topics))
}

export function getBlocklist() {
  try { return JSON.parse(localStorage.getItem(KEYS.BLOCKLIST)) || [] } catch { return [] }
}
export function setBlocklist(list) {
  localStorage.setItem(KEYS.BLOCKLIST, JSON.stringify(list))
}

export function getSaved() {
  try { return JSON.parse(localStorage.getItem(KEYS.SAVED)) || [] } catch { return [] }
}
export function setSaved(videos) {
  localStorage.setItem(KEYS.SAVED, JSON.stringify(videos))
}

export function getSlopThreshold() {
  const val = localStorage.getItem(KEYS.SLOP_THRESHOLD)
  return val !== null ? Number(val) : 4
}
export function setSlopThreshold(n) {
  localStorage.setItem(KEYS.SLOP_THRESHOLD, String(n))
}

// stored in seconds; default 5 min
export function getMinDuration() {
  const val = localStorage.getItem(KEYS.MIN_DURATION)
  return val !== null ? Number(val) : 300
}
export function setMinDuration(n) {
  localStorage.setItem(KEYS.MIN_DURATION, String(n))
}

// null = use default /banner.jpg
// 'light' | 'dark' | 'system'
export function getTheme() {
  return localStorage.getItem(KEYS.THEME) || 'system'
}
export function setTheme(t) {
  localStorage.setItem(KEYS.THEME, t)
}

export function getBanner() {
  return localStorage.getItem(KEYS.BANNER) || null
}
export function setBanner(dataUrl) {
  if (dataUrl) localStorage.setItem(KEYS.BANNER, dataUrl)
  else localStorage.removeItem(KEYS.BANNER)
}

export function getOllamaUrl() {
  return localStorage.getItem(KEYS.OLLAMA_URL) || 'http://localhost:11434'
}
export function setOllamaUrl(url) {
  localStorage.setItem(KEYS.OLLAMA_URL, url)
}

export function getOllamaModel() {
  return localStorage.getItem(KEYS.OLLAMA_MODEL) || 'llama3.1:8b'
}
export function setOllamaModel(m) {
  localStorage.setItem(KEYS.OLLAMA_MODEL, m)
}

export function getAiRerankEnabled() {
  return localStorage.getItem(KEYS.AI_RERANK_ENABLED) === 'true'
}
export function setAiRerankEnabled(v) {
  localStorage.setItem(KEYS.AI_RERANK_ENABLED, String(v))
}
