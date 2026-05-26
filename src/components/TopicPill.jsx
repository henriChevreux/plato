const LEVEL_COLOR = {
  beginner:     'text-emerald-400',
  intermediate: 'text-accent',
  advanced:     'text-violet-400',
}

// topic can be {name, level} or a plain string
export function TopicPill({ topic, onRemove }) {
  const name  = typeof topic === 'string' ? topic : topic.name
  const level = typeof topic === 'string' ? null  : topic.level
  const dot   = level ? LEVEL_COLOR[level] : ''

  return (
    <span className="inline-flex items-center gap-2 px-3 py-1 border border-border text-sm text-text bg-surface hover:border-border-hover transition-colors">
      {level && <span className={`w-1.5 h-1.5 rounded-full bg-current ${dot} shrink-0`} />}
      {name}
      {onRemove && (
        <button
          onClick={() => onRemove(name)}
          className="text-muted hover:text-text transition-colors leading-none"
          aria-label={`Remove ${name}`}
        >
          ×
        </button>
      )}
    </span>
  )
}
