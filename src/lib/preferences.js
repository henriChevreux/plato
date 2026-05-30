// On-device preference learning — the pragmatic alternative to RLHF.
//
// 👍/👎 feedback is stored as labeled samples; a plain-JS logistic regression
// (gradient descent, no deps) learns feature weights that predict whether the
// user will like a video. predict() blends into the feed ranking (PLA-22), and
// the raw pairs can be exported as JSONL for a future DPO fine-tune (PLA-23).

import { getPreferences, setPreferences } from './storage'

// Fixed feature order. The first 7 come from scoreVideo's feature vector
// (src/lib/scoring.js); llmScore (0-100, the reranker's judgment) is appended.
const FEATURE_KEYS = [
  'titleScore', 'channelScore', 'descScore', 'levelBonus',
  'slopScore', 'durationSeconds', 'ageDays',
]

export const LABEL_UP = 1
export const LABEL_DOWN = 0

function toVector(featureVector = {}, llmScore) {
  const v = FEATURE_KEYS.map((k) => {
    const x = featureVector?.[k]
    return typeof x === 'number' && Number.isFinite(x) ? x : 0
  })
  // llmScore may be null/undefined → treat as neutral 50
  v.push(typeof llmScore === 'number' && Number.isFinite(llmScore) ? llmScore : 50)
  return v
}

function sigmoid(z) {
  return 1 / (1 + Math.exp(-z))
}

function dot(a, b) {
  let s = 0
  for (let i = 0; i < a.length; i++) s += a[i] * b[i]
  return s
}

// ---- Store ---------------------------------------------------------------

export function getSamples() {
  return getPreferences()
}

export function sampleCount() {
  return getPreferences().length
}

// Upsert feedback for a video (re-thumbing the same video replaces its label).
export function recordFeedback({ videoId, featureVector, llmScore, label }) {
  if (!videoId) return
  const list = getPreferences().filter((s) => s.videoId !== videoId)
  list.push({
    videoId,
    featureVector: featureVector || null,
    llmScore: typeof llmScore === 'number' ? llmScore : null,
    label: label === LABEL_UP ? LABEL_UP : LABEL_DOWN,
    ts: new Date().toISOString(),
  })
  setPreferences(list)
}

export function removeFeedback(videoId) {
  setPreferences(getPreferences().filter((s) => s.videoId !== videoId))
}

// Current label for a video, or null if no feedback yet.
export function getLabel(videoId) {
  const s = getPreferences().find((x) => x.videoId === videoId)
  return s ? s.label : null
}

export function clearPreferences() {
  setPreferences([])
}

// ---- Model ---------------------------------------------------------------

// Train a logistic-regression preference model from stored samples.
// Returns { w, b, mean, std } or null when there isn't enough signal
// (fewer than 2 samples, or only one class — nothing to separate).
export function trainModel(samples = getPreferences()) {
  const usable = samples.filter((s) => s.featureVector)
  if (usable.length < 2) return null
  const labels = usable.map((s) => s.label)
  if (!labels.includes(LABEL_UP) || !labels.includes(LABEL_DOWN)) return null

  const X = usable.map((s) => toVector(s.featureVector, s.llmScore))
  const n = X[0].length
  const m = X.length

  // Standardize features so wildly different scales (e.g. durationSeconds vs
  // levelBonus) don't dominate the gradient.
  const mean = new Array(n).fill(0)
  const std = new Array(n).fill(0)
  for (const x of X) for (let j = 0; j < n; j++) mean[j] += x[j]
  for (let j = 0; j < n; j++) mean[j] /= m
  for (const x of X) for (let j = 0; j < n; j++) std[j] += (x[j] - mean[j]) ** 2
  for (let j = 0; j < n; j++) std[j] = Math.sqrt(std[j] / m) || 1
  const Z = X.map((x) => x.map((v, j) => (v - mean[j]) / std[j]))

  let w = new Array(n).fill(0)
  let b = 0
  const lr = 0.3
  const l2 = 0.001
  const epochs = 300

  for (let e = 0; e < epochs; e++) {
    const gw = new Array(n).fill(0)
    let gb = 0
    for (let i = 0; i < m; i++) {
      const p = sigmoid(dot(w, Z[i]) + b)
      const err = p - labels[i]
      for (let j = 0; j < n; j++) gw[j] += err * Z[i][j]
      gb += err
    }
    for (let j = 0; j < n; j++) w[j] -= lr * (gw[j] / m + l2 * w[j])
    b -= lr * (gb / m)
  }

  return { w, b, mean, std }
}

// Probability in [0,1] that the user prefers this video. Returns 0.5 (neutral,
// no ranking effect) when there is no trained model.
export function predict(model, featureVector, llmScore) {
  if (!model) return 0.5
  const x = toVector(featureVector, llmScore)
  const z = x.map((v, j) => (v - model.mean[j]) / model.std[j])
  return sigmoid(dot(model.w, z) + model.b)
}

// ---- Export (DPO upgrade path) -------------------------------------------

// One JSON object per line: the feature snapshot + label. Documents the path to
// a future DPO fine-tune of a small Ollama model without building it now.
export function exportJSONL() {
  return getPreferences()
    .map((s) => JSON.stringify({
      videoId: s.videoId,
      label: s.label === LABEL_UP ? 'up' : 'down',
      llmScore: s.llmScore,
      features: s.featureVector,
      ts: s.ts,
    }))
    .join('\n')
}
