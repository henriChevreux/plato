import { useQuery, useQueryClient } from '@tanstack/react-query'
import { searchByTopic } from '../lib/youtube'
import { scoreVideo } from '../lib/scoring'

function topicsHash(topics) {
  return topics
    .map((t) => (typeof t === 'string' ? t : `${t.name}:${t.level}`))
    .slice()
    .sort()
    .join('|')
}

async function fetchFeed(topics, apiKey, minDuration) {
  const cacheKey = `plato_feed_v2_${topicsHash(topics)}_d${minDuration}`
  const cached = sessionStorage.getItem(cacheKey)
  if (cached) {
    try {
      const parsed = JSON.parse(cached)
      // Validate shape: must be array of {topic, videos}
      if (Array.isArray(parsed) && (parsed.length === 0 || ('topic' in parsed[0] && 'videos' in parsed[0]))) {
        return parsed
      }
    } catch { /* fall through */ }
  }

  // Fetch all topics in parallel, keep them grouped
  const batches = await Promise.all(
    topics.map((topic) => searchByTopic(topic, apiKey, 1, minDuration))
  )

  // Deduplicate globally — each video appears in the first topic it was found under
  const seen = new Set()
  const sections = topics.map((topic, i) => {
    const videos = []
    for (const video of batches[i]) {
      if (!seen.has(video.videoId)) {
        seen.add(video.videoId)
        const { score, features } = scoreVideo(video, [topic])
        videos.push({ ...video, score, features, slopScore: features.slopScore })
      }
    }
    videos.sort((a, b) => b.score - a.score)
    return { topic, videos }
  })

  sessionStorage.setItem(cacheKey, JSON.stringify(sections))
  return sections
}

export function useFeed(topics, apiKey, blocklist = [], threshold = 4, minDuration = 0) {
  const query = useQuery({
    queryKey: ['feed', topicsHash(topics), minDuration],
    queryFn: () => fetchFeed(topics, apiKey, minDuration),
    enabled: topics.length > 0 && apiKey.length > 0,
    staleTime: Infinity,
    retry: 1,
  })

  const blockSet = new Set(blocklist)

  let sections = null
  let filteredCount = 0

  if (query.data) {
    sections = query.data.map(({ topic, videos }) => {
      const clean = videos.filter(
        (v) =>
          v.slopScore < threshold &&
          !blockSet.has(v.channelTitle) &&
          (minDuration === 0 || v.durationSeconds === null || v.durationSeconds >= minDuration) // fine-grained trim within bucket
      )
      filteredCount += videos.length - clean.length
      return { topic, videos: clean }
    }).filter((s) => s.videos.length > 0)
  }

  return { ...query, data: sections, filteredCount }
}

export function useRefreshFeed() {
  const client = useQueryClient()
  return () => {
    for (const key of Object.keys(sessionStorage)) {
      if (key.startsWith('plato_feed')) sessionStorage.removeItem(key)
    }
    client.invalidateQueries({ queryKey: ['feed'] })
  }
}
