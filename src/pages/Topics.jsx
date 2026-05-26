import { useState } from 'react'
import { useTopics } from '../hooks/useTopics'
import { useRefreshFeed } from '../hooks/useFeed'

const LEVELS = ['beginner', 'intermediate', 'advanced']

const LEVEL_STYLE = {
  beginner:     { label: 'Beginner',     color: 'text-emerald-400', border: 'border-emerald-400' },
  intermediate: { label: 'Intermediate', color: 'text-accent',      border: 'border-accent' },
  advanced:     { label: 'Advanced',     color: 'text-violet-400',  border: 'border-violet-400' },
}

function LevelToggle({ value, onChange }) {
  return (
    <div className="flex border border-border">
      {LEVELS.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => onChange(l)}
          className={`px-3 py-1.5 text-xs transition-colors ${
            value === l
              ? `${LEVEL_STYLE[l].color} bg-surface border-x border-border first:border-l-0 last:border-r-0`
              : 'text-muted hover:text-text'
          }`}
        >
          {LEVEL_STYLE[l].label}
        </button>
      ))}
    </div>
  )
}

function TopicRow({ topic, onRemove, onLevelChange }) {
  const style = LEVEL_STYLE[topic.level] || LEVEL_STYLE.intermediate
  return (
    <div className="flex items-center justify-between border border-border bg-surface px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="text-sm text-text">{topic.name}</span>
        <span className={`text-xs ${style.color}`}>{style.label}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex border border-border">
          {LEVELS.map((l) => (
            <button
              key={l}
              onClick={() => onLevelChange(topic.name, l)}
              className={`px-2 py-1 text-xs transition-colors ${
                topic.level === l
                  ? `${LEVEL_STYLE[l].color}`
                  : 'text-[#444] hover:text-muted'
              }`}
              title={LEVEL_STYLE[l].label}
            >
              {l[0].toUpperCase()}
            </button>
          ))}
        </div>
        <button
          onClick={() => onRemove(topic.name)}
          className="text-muted hover:text-text transition-colors text-sm"
          aria-label={`Remove ${topic.name}`}
        >
          ×
        </button>
      </div>
    </div>
  )
}

export function Topics() {
  const { topics, addTopic, removeTopic, updateLevel } = useTopics()
  const refresh = useRefreshFeed()
  const [input, setInput] = useState('')
  const [level, setLevel] = useState('intermediate')

  function handleAdd(e) {
    e.preventDefault()
    if (!input.trim()) return
    addTopic(input.trim(), level)
    setInput('')
    refresh()
  }

  function handleRemove(name) {
    removeTopic(name)
    refresh()
  }

  function handleLevelChange(name, newLevel) {
    updateLevel(name, newLevel)
    refresh()
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-lg font-medium text-text mb-1">Topics</h1>
      <p className="text-sm text-muted mb-8">
        Plato tailors results to your level — beginners get introductory content,
        advanced users get lectures, research, and technical depth.
      </p>

      <form onSubmit={handleAdd} className="space-y-3 mb-10">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. quantum physics, stoicism, transformer architecture"
            className="flex-1 bg-surface border border-border px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:border-border-hover"
          />
          <button
            type="submit"
            className="px-4 py-2 border border-accent text-accent text-sm hover:bg-accent hover:text-bg transition-colors"
          >
            Add
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted">My level:</span>
          <LevelToggle value={level} onChange={setLevel} />
        </div>
      </form>

      {topics.length > 0 ? (
        <div className="space-y-1">
          {topics.map((topic) => (
            <TopicRow
              key={topic.name}
              topic={topic}
              onRemove={handleRemove}
              onLevelChange={handleLevelChange}
            />
          ))}
        </div>
      ) : (
        <p className="text-muted text-sm">No topics yet. Add your first one above.</p>
      )}

      {topics.length > 0 && (
        <div className="mt-8 text-xs text-muted space-y-1 border border-border p-3">
          <p className="text-text mb-1">How levels work:</p>
          <p>· <span className="text-emerald-400">Beginner</span> — search includes "introduction, basics, tutorial" and boosts introductory titles</p>
          <p>· <span className="text-accent">Intermediate</span> — standard search, no level bias</p>
          <p>· <span className="text-violet-400">Advanced</span> — search includes "advanced, lecture, technical, research" and boosts in-depth content</p>
        </div>
      )}
    </div>
  )
}
