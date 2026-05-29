import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { searchByTopic } from '../lib/youtube'
import { scoreVideo } from '../lib/scoring'
import { rerank } from '../lib/reranker'

function topicsHash(topics) {
  return topics
    .map((t) => (typeof t === 'string' ? t : `${t.name}:${t.level}`))
    .slice()
    .sort()
    .join('|')
}

async function fetchFeed(topics, apiKey, minDuration) {
  const cacheKey = `plato_feed_v3_${topicsHash(topics)}_d${minDuration}`
  const cached = sessionStorage.getItem(cacheKey)
  if (cached) {
    try {
      const parsed = JSON.parse(cached)
      if (Array.isArray(parsed) && (parsed.length === 0 || ('topic' in parsed[0] && 'videos' in parsed[0]))) {
        return parsed
      }
    } catch { /* fall through */ }
  }

  const batches = await Promise.all(
    topics.map((topic) => searchByTopic(topic, apiKey, 1, minDuration))
  )

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

export function useFeed(topics, apiKey, blocklist = [], threshold = 4, minDuration = 0, aiEnabled = false) {
  const query = useQuery({
    queryKey: ['feed', topicsHash(topics), minDuration],
    queryFn: () => fetchFeed(topics, apiKey, minDuration),
    enabled: topics.length > 0 && apiKey.length > 0,
    staleTime: Infinity,
    retry: 1,
  })

  const [llmScores, setLlmScores] = useState({})
  const [progress, setProgress] = useState({ scored: 0, total: 0 })
  const hash = topicsHash(topics)
  const level = topics.find((t) => t?.level && t.level !== 'intermediate')?.level || 'intermediate'

  // Clear cached LLM scores when topics change
  useEffect(() => {
    setLlmScores({})
  }, [hash])

  // Run async re-rank pass when feed data arrives and AI is enabled
  useEffect(() => {
    if (!query.data || !aiEnabled) return

    const cachePrefix = `plato_llm_${hash}_${level}`
    const fromCache = {}
    const needsScore = []

    for (const { videos } of query.data) {
      for (const v of videos) {
        const cached = sessionStorage.getItem(`${cachePrefix}_${v.videoId}`)
        if (cached !== null) {
          fromCache[v.videoId] = Number(cached)
        } else {
          needsScore.push(v)
        }
      }
    }

    if (Object.keys(fromCache).length > 0) {
      setLlmScores((prev) => ({ ...prev, ...fromCache }))
    }

    if (needsScore.length === 0) return

    setProgress({ scored: 0, total: needsScore.length })

    rerank(needsScore, {
      topics,
      level,
      onProgress: ({ scored, total, result }) => {
        setProgress({ scored, total })
        if (result) {
          sessionStorage.setItem(`${cachePrefix}_${result.videoId}`, String(result.score))
          setLlmScores((prev) => ({ ...prev, [result.videoId]: result.score }))
        }
      },
    })
  }, [query.data, aiEnabled, hash, level]) // eslint-disable-line react-hooks/exhaustive-deps

  const blockSet = new Set(blocklist)
  const hasLlmScores = aiEnabled && Object.keys(llmScores).length > 0

  let sections = null
  let filteredCount = 0

  if (query.data) {
    sections = query.data.map(({ topic, videos }) => {
      const clean = videos.filter(
        (v) =>
          v.slopScore < threshold &&
          !blockSet.has(v.channelTitle) &&
          (minDuration === 0 || v.durationSeconds === null || v.durationSeconds >= minDuration)
      )
      filteredCount += videos.length - clean.length

      let sorted
      if (hasLlmScores) {
        const maxStatic = Math.max(...clean.map((v) => v.score), 1)
        sorted = clean
          .map((v) => {
            const llm = llmScores[v.videoId] ?? null
            const normalized = (v.score / maxStatic) * 100
            return {
              ...v,
              llmScore: llm,
              blendedScore: llm !== null ? 0.4 * normalized + 0.6 * llm : normalized,
            }
          })
          .sort((a, b) => b.blendedScore - a.blendedScore)
      } else {
        sorted = clean
      }

      return { topic, videos: sorted }
    }).filter((s) => s.videos.length > 0)
  }

  let aiStatus = 'idle'
  if (aiEnabled && query.data) {
    aiStatus = hasLlmScores ? 'done' : 'scoring'
  }

  return { ...query, data: sections, filteredCount, aiStatus, progress }
}

export function useRefreshFeed() {
  const client = useQueryClient()
  return () => {
    for (const key of Object.keys(sessionStorage)) {
      if (key.startsWith('plato_feed') || key.startsWith('plato_llm')) {
        sessionStorage.removeItem(key)
      }
    }
    client.invalidateQueries({ queryKey: ['feed'] })
  }
}
