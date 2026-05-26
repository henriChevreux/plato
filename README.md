# Plato

> *"The unexamined feed is not worth scrolling."*

Plato is a minimalist YouTube frontend that replaces the algorithmic homepage with a curated feed — filtered by topics you define, stripped of clickbait and low-effort content, and tailored to your level of expertise.

![Plato — The Death of Socrates](public/banner.jpg)

---

## Why

YouTube's recommendation algorithm is optimised for engagement, not value. Reaction videos, vlogs, "you won't believe" clickbait, and 30-second Shorts crowd out the lectures, essays, and deep-dives that are actually worth your time.

Plato inverts this. You define what you want to learn. Plato fetches it, scores it, and surfaces only the content that clears the bar.

---

## Features

- **Curated feed** — one horizontal section per topic, sorted by relevance
- **Slop filter** — pattern-based scoring removes reaction content, vlogs, clickbait phrases, excessive ALL CAPS, emoji-heavy titles, and more
- **Filtered search** — search YouTube with slop stripped out; toggle to see exactly what was filtered and why
- **Proficiency levels** — mark each topic as Beginner, Intermediate, or Advanced; the search query and relevance scoring adapt accordingly
- **Minimum video length** — filtered at the YouTube API level using `videoDuration`; in-memory trim handles the exact threshold within a bucket
- **Video actions** — save videos for later; block channels directly from any card
- **Saved videos** — your personal watchlist, persisted in the browser
- **Custom banner** — upload any image; defaults to *The Death of Socrates* by Jacques-Louis David
- **Adjustable slop threshold** — live-updating explainer in Settings shows exactly which patterns fire at your current level
- **Zero backend** — everything runs in the browser; your API key and preferences live in `localStorage` and never leave your machine

---

## Stack

| Layer | Choice |
|---|---|
| Framework | React 18 + Vite 5 |
| Styling | Tailwind CSS v3 |
| Data fetching | TanStack Query v5 |
| Routing | React Router v7 |
| State | `localStorage` via custom hooks |
| API | YouTube Data API v3 |

---

## Getting started

### 1. Clone and install

```bash
git clone https://github.com/henriChevreux/plato.git
cd plato
npm install
```

### 2. Get a free YouTube Data API v3 key

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/library/youtube.googleapis.com)
2. Create a project (or select an existing one)
3. Enable **YouTube Data API v3**
4. Go to **Credentials → Create credentials → API key**
5. Copy the key — no billing setup required

> **Quota**: the free tier gives 10,000 units/day. Each topic search costs ~101 units (100 for `search.list` + 1 for `videos.list`). With 5 topics that's roughly 19 full refreshes per day. Results are cached per browser session so repeat visits don't cost quota.

### 3. Run

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173), paste your API key in **Settings**, add topics in **Topics**, and you're ready.

---

## How the slop filter works

Each video title is scored against two tiers of patterns:

| Signal | Points |
|---|---|
| High-confidence match (reaction, vlog, prank, storytime, ASMR, social experiment…) | +4 each |
| Medium-confidence match (shocking, exposed, challenge, tier list, giveaway…) | +2 each |
| ALL CAPS word ratio × 8 | up to +8 |
| Emoji count × 1.5 | per emoji |
| Repeated `!!` or `??` | +2 per group |
| Missing or very short description | +2 |

Videos scoring ≥ your threshold are removed. The default is **4** — a single high-confidence pattern triggers filtering on its own. The Settings page shows a live breakdown of which patterns are active at your current threshold, and which combinations would be needed to trigger filtering.

---

## Project structure

```
src/
├── components/
│   ├── Banner.jsx          # Top-of-page image banner
│   ├── EmptyState.jsx      # Zero-state UI
│   ├── Layout.jsx          # Sidebar + main shell
│   ├── SlopExplainer.jsx   # Dynamic filter explainer in Settings
│   ├── TopicPill.jsx       # Topic tag with proficiency colour
│   └── VideoCard.jsx       # Thumbnail, duration badge, save/block actions
├── hooks/
│   ├── useApiKey.js
│   ├── useBanner.js
│   ├── useBlocklist.js
│   ├── useFeed.js          # Orchestrates search, dedup, scoring, slop filter, cache
│   ├── useMinDuration.js
│   ├── useSaved.js
│   ├── useSlopThreshold.js
│   └── useTopics.js
├── lib/
│   ├── scoring.js          # Keyword relevance + proficiency level bonus/penalty
│   ├── slop.js             # Slop scorer
│   ├── storage.js          # localStorage helpers (all keys in one place)
│   └── youtube.js          # YouTube Data API v3 client with duration fetching
└── pages/
    ├── Feed.jsx            # Curated feed — horizontal sections per topic
    ├── Saved.jsx           # Saved videos
    ├── Search.jsx          # Filtered search with "show filtered" toggle
    ├── Settings.jsx        # API key, slop threshold, duration filter, banner, blocklist
    └── Topics.jsx          # Topic + proficiency management
```

---

## Extending Plato

The codebase is structured for incremental upgrades:

- **Browser extension** — `scoring.js` and `youtube.js` are plain ES modules. They can be imported directly into a content script to filter YouTube's own DOM in real time.
- **LLM classification** — `scoreVideo()` in `scoring.js` has a clean interface. Swap or augment it with an OpenAI/Anthropic call for semantic understanding without touching the rest of the stack.
- **OAuth / subscriptions** — add a "My Subscriptions" tab using `activities.list`. The filtering layer is already in place.
- **Multi-browser** — the app runs in any browser as-is. A Chrome extension wrapper (Manifest V3) can be added later using the same core logic.

---

## Privacy

- Your YouTube API key is stored only in your browser's `localStorage`
- Saved videos, blocked channels, and all preferences are local only
- No analytics, no tracking, no server

---

## License

MIT
