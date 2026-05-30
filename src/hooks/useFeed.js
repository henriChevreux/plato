import { useState, useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { searchByTopic } from '../lib/youtube'
import { scoreVideo } from '../lib/scoring'
import { rerank } from '../lib/reranker'
import { vaultPermission } from '../lib/vault'
import { summarizeKnown } from '../lib/graph'
import { trainModel, predict } from '../lib/preferences'
import { getPreferences } from '../lib/storage'

// Combine known-concept summaries across topics into one learner-context string
// for the reranker. Returns '' if no vault is connected or nothing is known yet.
async function buildGraphSummary(topics) {
  try {
    if ((await vaultPermission()) !== 'granted') return ''
    const names = topics.map((t) => (typeof t === 'string' ? t : t.name))
    const parts = await Promise.all(names.map((n) => summarizeKnown(n)))
    return parts.filter(Boolean).join(' ')
  } catch {
    return ''
  }
}

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

  // Clear LLM scores when topics change or feed data refreshes
  useEffect(() => {
    setLlmScores({})
    setProgress({ scored: 0, total: 0 })
  }, [hash, query.dataUpdatedAt])

  // Run async re-rank pass when feed data arrives and AI is enabled
  useEffect(() => {
    if (!query.data || !aiEnabled) return
    let cancelled = false

    ;(async () => {
      // Pull what the learner already knows (from the Obsidian graph) so the
      // judge reasons about knowledge fit; '' when no vault is connected.
      const graphSummary = await buildGraphSummary(topics)
      if (cancelled) return

      // Key the LLM cache by graph state too, so scores refresh as the graph grows.
      const gsig = graphSummary ? `_g${graphSummary.length}` : ''
      const cachePrefix = `plato_llm_v2_${hash}_${level}${gsig}`
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

      const results = await rerank(needsScore, {
        topics,
        level,
        graphSummary,
        onProgress: ({ scored, total }) => { if (!cancelled) setProgress({ scored, total }) },
      })
      if (cancelled || !results) return
      const fresh = {}
      for (const r of results) {
        fresh[r.videoId] = r.score
        sessionStorage.setItem(`${cachePrefix}_${r.videoId}`, String(r.score))
      }
      setLlmScores((prev) => ({ ...prev, ...fresh }))
    })()

    return () => { cancelled = true }
  }, [query.data, aiEnabled, hash, level]) // eslint-disable-line react-hooks/exhaustive-deps

  const blockSet = new Set(blocklist)
  const hasLlmScores = aiEnabled && Object.keys(llmScores).length > 0

  // Train the on-device preference model from 👍/👎 feedback. Retrains when the
  // feed reloads/refreshes (dataUpdatedAt) or topics change — so refreshing the
  // feed visibly shifts ranking after new feedback. null when there isn't enough.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- retrain on feed refresh/topic change
  const prefModel = useMemo(() => trainModel(getPreferences()), [hash, query.dataUpdatedAt])

  // Final ranking blends LLM score (or static score as the base) with the
  // preference prediction. A neutral 0.5 prediction (no model) leaves order untouched.
  function rankScore(v) {
    const llm = hasLlmScores ? (llmScores[v.videoId] ?? null) : (v.llmScore ?? null)
    const base = llm != null ? llm : v.score
    const boost = prefModel
      ? (predict(prefModel, v.features, llm) - 0.5) * (llm != null ? 40 : 10)
      : 0
    return base + boost
  }

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

      let sorted = clean
      if (hasLlmScores || prefModel) {
        sorted = clean
          .map((v) => ({ ...v, llmScore: hasLlmScores ? (llmScores[v.videoId] ?? null) : (v.llmScore ?? null) }))
          .sort((a, b) => rankScore(b) - rankScore(a))
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
