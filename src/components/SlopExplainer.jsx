const HIGH_RULES = [
  { label: 'Reaction / reacting-to content', example: '"My Reaction to…"' },
  { label: 'Vlogs', example: '"Daily Vlog #47"' },
  { label: '"Gone wrong/bad/sexual/weird"', example: '"Cooking Gone Wrong"' },
  { label: 'Pranks', example: '"I Pranked My Sister"' },
  { label: 'Storytime', example: '"Storytime: I Got Fired"' },
  { label: '"24 hours" challenges', example: '"24 Hours in IKEA"' },
  { label: '"Get Ready With Me" / GRWM', example: '"GRWM for School"' },
  { label: 'TikTok / meme / vine compilations', example: '"TikTok Compilation #12"' },
  { label: 'ASMR', example: '"ASMR Tapping"' },
  { label: 'Social experiments', example: '"Social Experiment in NYC"' },
  { label: 'Drama / beef / exposed with context', example: '"Drama Explained: The Beef"' },
  { label: 'Daily/weekly life or routine', example: '"Day in My Life as a Student"' },
  { label: '"How I lost/gained/made/spent"', example: '"How I Made $10,000"' },
  { label: '"I quit / I tried / I bought"', example: '"I Tried Every Fast Food"' },
  { label: 'Facecam / just chatting / IRL streams', example: '"Just Chatting + Q&A"' },
]

const MEDIUM_RULES = [
  { label: '"You won\'t believe…"', example: '"You Won\'t Believe This"' },
  { label: 'Shocking / insane / mind-blowing / unbelievable', example: '"Insane Discovery"' },
  { label: 'Exposed / cancelled / drama / beef', example: '"He Got Exposed"' },
  { label: 'Destroyed / owned / rekt', example: '"Destroyed in Debate"' },
  { label: '"Subscribe" or "like and subscribe" in title', example: '"Subscribe NOW"' },
  { label: 'Challenge / vs / versus', example: '"Me vs. My Brother"' },
  { label: 'Tier lists / power rankings', example: '"Ranking Every Marvel Movie"' },
  { label: 'Giveaways', example: '"FREE iPhone Giveaway"' },
  { label: 'Roasting', example: '"Roasting Your Setups"' },
]

function Row({ label, points, alone, threshold }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-border last:border-0">
      <span className="text-muted text-xs">{label}</span>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs font-mono text-text">+{points}</span>
        {threshold > 0 && (
          <span className={`text-xs ${alone ? 'text-error' : 'text-[#555]'}`}>
            {alone ? 'filters alone' : `need ${Math.ceil(threshold / points)}`}
          </span>
        )}
      </div>
    </div>
  )
}

export function SlopExplainer({ threshold }) {
  if (threshold === 0) {
    return (
      <div className="border border-border p-3 text-xs text-muted">
        Filter is off — all videos are shown regardless of content.
      </div>
    )
  }

  const highAlone = 4 >= threshold
  const mediumAlone = 2 >= threshold
  const mediumNeeded = Math.ceil(threshold / 2)

  // Stylistic signals
  const capsTriggersAlone = 8 >= threshold // max caps score
  const emojiNeeded = Math.ceil(threshold / 1.5)
  const punctNeeded = Math.ceil(threshold / 2)

  return (
    <div className="border border-border p-3 text-xs space-y-4">
      <p className="text-text">
        A video is removed when its slop score reaches{' '}
        <span className="font-mono text-accent">{threshold}</span>. Scores accumulate
        across all signals below.
      </p>

      <div>
        <p className="text-muted uppercase tracking-widest mb-2" style={{ fontSize: '10px' }}>
          High-confidence patterns &nbsp;+4 each
        </p>
        <div>
          {HIGH_RULES.map((r) => (
            <Row key={r.label} label={r.label} points={4} alone={highAlone} threshold={threshold} />
          ))}
        </div>
        {!highAlone && (
          <p className="text-[#555] mt-1">
            Needs {Math.ceil(threshold / 4)} match{Math.ceil(threshold / 4) > 1 ? 'es' : ''} to
            trigger filtering on its own.
          </p>
        )}
      </div>

      <div>
        <p className="text-muted uppercase tracking-widest mb-2" style={{ fontSize: '10px' }}>
          Medium-confidence patterns &nbsp;+2 each
        </p>
        <div>
          {MEDIUM_RULES.map((r) => (
            <Row key={r.label} label={r.label} points={2} alone={mediumAlone} threshold={threshold} />
          ))}
        </div>
        {!mediumAlone && (
          <p className="text-[#555] mt-1">
            Needs {mediumNeeded} match{mediumNeeded > 1 ? 'es' : ''} to trigger filtering on its
            own.
          </p>
        )}
      </div>

      <div>
        <p className="text-muted uppercase tracking-widest mb-2" style={{ fontSize: '10px' }}>
          Stylistic signals
        </p>
        <div>
          <Row
            label={`ALL CAPS words — proportional, up to +8 total${capsTriggersAlone ? '' : ` (need >${Math.round((threshold / 8) * 100)}% of title in caps)`}`}
            points={8}
            alone={capsTriggersAlone}
            threshold={threshold}
          />
          <Row
            label={`Emojis in title — +1.5 per emoji${emojiNeeded > 1 ? ` (need ${emojiNeeded} emojis)` : ''}`}
            points={1.5}
            alone={1.5 >= threshold}
            threshold={threshold}
          />
          <Row
            label={`Repeated !! or ?? — +2 per group${punctNeeded > 1 ? ` (need ${punctNeeded} groups)` : ''}`}
            points={2}
            alone={2 >= threshold}
            threshold={threshold}
          />
          <Row
            label="Missing or very short description — +2"
            points={2}
            alone={2 >= threshold}
            threshold={threshold}
          />
        </div>
      </div>

      <div className="border-t border-border pt-3 text-[#555]">
        Example at this threshold: a title like{' '}
        <span className="text-muted">"INSANE PRANK!! (Gone Wrong)"</span> scores{' '}
        <span className="font-mono">4</span> (gone wrong) +{' '}
        <span className="font-mono">4</span> (prank) +{' '}
        <span className="font-mono">2</span> (insane) +{' '}
        <span className="font-mono">2</span> (!!) ={' '}
        <span className="font-mono text-error">12</span> →{' '}
        {12 >= threshold ? 'filtered ✓' : 'shown (below threshold)'}
      </div>
    </div>
  )
}
