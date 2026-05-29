const BASE = 'https://www.googleapis.com/youtube/v3'

// Parse ISO 8601 duration → { display: "5:30", seconds: 330 }
function parseDurationFull(iso) {
  if (!iso) return { display: null, seconds: null }
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return { display: null, seconds: null }
  const h = parseInt(match[1] || '0')
  const m = parseInt(match[2] || '0')
  const s = parseInt(match[3] || '0')
  const seconds = h * 3600 + m * 60 + s
  const display = h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`
  return { display, seconds }
}

export function parseDuration(iso) {
  return parseDurationFull(iso).display
}

// Map minDuration (seconds) to YouTube API videoDuration buckets.
// Returns an array of bucket values to fetch (may be >1 to cover a range).
// short: <4 min  |  medium: 4–20 min  |  long: >20 min
function durationBuckets(minDurationSeconds) {
  if (!minDurationSeconds || minDurationSeconds === 0) return [null]       // no filter
  if (minDurationSeconds >= 1200) return ['long']                           // >20 min only
  return ['medium', 'long']                                                 // exclude shorts (<4 min)
}

function mapItems(items) {
  return (items || []).map((item) => ({
    videoId: item.id.videoId,
    title: item.snippet.title,
    channelTitle: item.snippet.channelTitle,
    description: item.snippet.description,
    thumbnail:
      item.snippet.thumbnails?.medium?.url ||
      item.snippet.thumbnails?.default?.url,
    publishedAt: item.snippet.publishedAt,
  }))
}

async function fetchPage(query, apiKey, pageToken, videoDuration) {
  const params = new URLSearchParams({
    part: 'snippet',
    q: query,
    type: 'video',
    maxResults: '10',
    order: 'relevance',
    key: apiKey,
    ...(pageToken ? { pageToken } : {}),
    ...(videoDuration ? { videoDuration } : {}),
  })

  const res = await fetch(`${BASE}/search?${params}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err?.error?.message || `HTTP ${res.status}`
    throw new Error(msg)
  }

  return res.json()
}

async function fetchDurations(videoIds, apiKey) {
  const map = {}
  for (let i = 0; i < videoIds.length; i += 50) {
    const chunk = videoIds.slice(i, i + 50)
    const params = new URLSearchParams({
      part: 'contentDetails',
      id: chunk.join(','),
      key: apiKey,
    })
    const res = await fetch(`${BASE}/videos?${params}`)
    if (!res.ok) continue
    const data = await res.json()
    for (const item of data.items || []) {
      const { display, seconds } = parseDurationFull(item.contentDetails?.duration)
      map[item.id] = { display, seconds }
    }
  }
  return map
}

const LEVEL_TERMS = {
  beginner: 'introduction basics tutorial explained',
  intermediate: '',
  advanced: 'advanced lecture technical research in-depth',
}

// topic can be a string or {name, level}
export async function searchByTopic(topic, apiKey, pages = 1, minDurationSeconds = 0) {
  const name = typeof topic === 'string' ? topic : topic.name
  const level = typeof topic === 'string' ? 'intermediate' : (topic.level || 'intermediate')
  const modifier = LEVEL_TERMS[level] || ''
  const query = modifier ? `${name} ${modifier}` : name

  const buckets = durationBuckets(minDurationSeconds)

  // Fetch all required buckets in parallel, then deduplicate
  const bucketResults = await Promise.all(
    buckets.map((bucket) => _fetchAllPages(query, apiKey, pages, bucket))
  )

  const seen = new Set()
  const results = []
  for (const batch of bucketResults) {
    for (const video of batch) {
      if (!seen.has(video.videoId)) {
        seen.add(video.videoId)
        results.push(video)
      }
    }
  }

  const ids = results.map((v) => v.videoId)
  const durations = ids.length > 0 ? await fetchDurations(ids, apiKey) : {}

  return results.map((v) => ({
    ...v,
    duration: durations[v.videoId]?.display ?? null,
    durationSeconds: durations[v.videoId]?.seconds ?? null,
  }))
}

async function _fetchAllPages(query, apiKey, pages, videoDuration) {
  const results = []
  let pageToken = undefined
  for (let i = 0; i < pages; i++) {
    const data = await fetchPage(query, apiKey, pageToken, videoDuration)
    results.push(...mapItems(data.items))
    pageToken = data.nextPageToken
    if (!pageToken) break
  }
  return results
}
