# SNAGRS — Prompt Playbook
### Pure Next.js · TypeScript · Zustand · 21st.dev Magic · Vercel

---

## Architecture (Read This First)

```
Browser
  │
  ├── GET /          → Next.js Page (UI)
  │
  └── POST /api/download
            │
            ├── youtube.com/shorts  → lib/extractors/youtube.ts  (youtubei.js)
            ├── instagram.com       → lib/extractors/instagram.ts (fetch + parse)
            ├── tiktok.com          → lib/extractors/tiktok.ts   (fetch + parse)
            ├── twitter.com / x.com → lib/extractors/twitter.ts  (fetch + parse)
            └── reddit.com          → lib/extractors/reddit.ts   (Reddit JSON API)
                      │
                      └── returns { downloadUrl, filename }
                                    │
                              Browser downloads
                              directly from CDN ✅
```

**No separate server. No Docker. No binary. 100% Vercel.**

### Platform Support & Limits

| Platform | MP4 | MP3 | Max Quality | Notes |
|---|---|---|---|---|
| YouTube | ✅ | ✅ | 720p | 1080p needs ffmpeg (not on Vercel) |
| YouTube Shorts | ✅ | ✅ | 720p | Same as above |
| Instagram Reels | ✅ | ✅ | Original | Public posts only |
| TikTok | ✅ | ✅ | Original | Watermark-free |
| Twitter / X | ✅ | ✅ | Original | Public tweets only |
| Reddit | ✅ | ✅ | Original | Public posts only |

---

## Project Structure

```
snagr/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   └── api/
│       └── download/
│           └── route.ts          # Master API route
├── components/
│   ├── ui/                       # 21st.dev generated components live here
│   ├── DownloadForm.tsx
│   ├── FormatSelector.tsx
│   ├── ResultCard.tsx
│   ├── LoadingState.tsx
│   └── SupportedPlatforms.tsx
├── lib/
│   ├── extractors/
│   │   ├── youtube.ts
│   │   ├── instagram.ts
│   │   ├── tiktok.ts
│   │   ├── twitter.ts
│   │   └── reddit.ts
│   ├── router.ts                 # Detects platform → calls extractor
│   └── utils.ts
├── store/
│   └── downloadStore.ts
├── types/
│   └── index.ts
├── .env.local
├── vercel.json
└── package.json
```

---

## STEP 0 — Setup 21st.dev Magic MCP in Claude Code

**Do this BEFORE running any prompts below.**

21st.dev Magic is an MCP server that generates premium UI components via
the `/ui` command inside Claude Code. Think of it as v0 living inside
your terminal.

### Install

```bash
npx @21st-dev/cli@latest install --client claude
```

Or manually add to your Claude Code MCP config (`~/.claude/mcp.json`):

```json
{
  "mcpServers": {
    "@21st-dev/magic": {
      "command": "npx",
      "args": ["-y", "@21st-dev/magic@latest", "API_KEY=\"YOUR_KEY\""]
    }
  }
}
```

1. Go to https://21st.dev/magic → sign up → copy your API key
2. Replace `YOUR_KEY` with your actual key
3. Restart Claude Code

Once set up, you can use `/ui describe what you want` anywhere in the
prompts below and Magic will generate and write the component directly
into your project.

---

## Dependencies

```bash
npm install next react react-dom typescript
npm install zustand
npm install youtubei.js          # YouTube InnerTube API (pure JS, Vercel-safe)
npm install tailwindcss @tailwindcss/typography autoprefixer
npm install clsx tailwind-merge
npm install lucide-react
npm install framer-motion
npm install react-hook-form zod @hookform/resolvers
npm install @types/node @types/react @types/react-dom
```

### .env.local

```env
# No API keys needed — all extractors use public endpoints
# Optional: add your own rate limiting or logging keys here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### vercel.json

```json
{
  "functions": {
    "app/api/download/route.ts": {
      "maxDuration": 30
    }
  }
}
```

---

## PROMPT 1 — Project Scaffold

```
Create a new Next.js 14 project called "snagrs" with App Router,
TypeScript strict mode, and Tailwind CSS.

Install these packages:
  zustand, youtubei.js, framer-motion, zod, react-hook-form,
  @hookform/resolvers, clsx, tailwind-merge, lucide-react

Configure tailwind.config.ts:
  - Content paths: app/**, components/**, lib/**
  - Extend theme with custom colors:
      brand: '#FF3B5C'
      dark: '#0A0A0A'
      surface: '#111111'
      muted: '#1A1A1A'
      border: '#222222'
  - Extend fontFamily:
      display: ['Syne', 'sans-serif']
      body: ['DM Sans', 'sans-serif']

In app/globals.css:
  - Import from Google Fonts:
      Syne: weights 700, 800
      DM Sans: weights 400, 500
  - Apply --font-display and --font-body as CSS variables
  - Set html/body background to #0A0A0A, color to #EDEDED
  - Custom scrollbar: 4px width, #222 track, #FF3B5C thumb
  - ::selection: background #FF3B5C, color white

Create these empty files/folders:
  app/api/download/route.ts
  lib/extractors/youtube.ts
  lib/extractors/instagram.ts
  lib/extractors/tiktok.ts
  lib/extractors/twitter.ts
  lib/extractors/reddit.ts
  lib/router.ts
  lib/utils.ts
  store/downloadStore.ts
  types/index.ts

Create .env.local:
  NEXT_PUBLIC_APP_URL=http://localhost:3000

Create vercel.json:
  { "functions": { "app/api/download/route.ts": { "maxDuration": 30 } } }

Confirm dev server runs clean.
```

---

## PROMPT 2 — Types & Utilities

```
Create /types/index.ts with these exact types:

export type Platform =
  | 'youtube'
  | 'instagram'
  | 'tiktok'
  | 'twitter'
  | 'reddit'
  | 'unknown';

export type DownloadFormat = 'mp4' | 'mp3';

export type DownloadStatus = 'idle' | 'loading' | 'success' | 'error';

export interface DownloadRequest {
  url: string;
  format: DownloadFormat;
}

export interface DownloadResult {
  downloadUrl: string;
  filename: string;
  format: DownloadFormat;
  platform: Platform;
}

export interface SnagError {
  message: string;
  code?: string;
}

export interface HistoryItem {
  id: string;
  url: string;
  format: DownloadFormat;
  platform: Platform;
  filename: string;
  downloadUrl: string;
  timestamp: number;
}

---

Create /lib/utils.ts with:

1. cn(...inputs): string
   Combines clsx + tailwind-merge for className merging.

2. detectPlatform(url: string): Platform
   Check url string for these substrings (case insensitive):
   - 'youtube.com' or 'youtu.be' → 'youtube'
   - 'instagram.com' → 'instagram'
   - 'tiktok.com' → 'tiktok'
   - 'twitter.com' or 'x.com' → 'twitter'
   - 'reddit.com' or 'redd.it' → 'reddit'
   - default → 'unknown'

3. getPlatformLabel(platform: Platform): string
   Returns display name: 'YouTube' | 'Instagram' | 'TikTok' |
   'Twitter / X' | 'Reddit' | 'Unknown'

4. isValidUrl(url: string): boolean
   Use URL constructor, return false if it throws.

5. generateFilename(platform: Platform, format: DownloadFormat): string
   Returns: `snagr-${platform}-${Date.now()}.${format}`

6. generateId(): string
   Returns: Math.random().toString(36).slice(2)
```

---

## PROMPT 3 — Extractors (Core Backend Logic)

```
Create all 5 extractor files. Each extractor exports a single async
function that receives (url: string, format: DownloadFormat) and
returns Promise<DownloadResult>. Throw a SnagError on failure.

Import types from @/types and generateFilename, detectPlatform
from @/lib/utils.

---

### lib/extractors/youtube.ts

Use the `youtubei.js` package (import { Innertube } from 'youtubei.js').

Logic:
1. Create an Innertube instance: const yt = await Innertube.create({
     retrieve_player: false
   })
2. Extract the video ID from the URL:
   - For youtube.com/watch?v=ID → use URLSearchParams
   - For youtu.be/ID → pathname split
   - For youtube.com/shorts/ID → pathname split
3. Call: const info = await yt.getInfo(videoId)
4. For MP3 (audio only):
   - Get audio-only formats: info.streaming_data?.adaptive_formats
   - Filter where mime_type starts with 'audio/'
   - Sort by bitrate descending, take the first one
   - Return its url field as downloadUrl
5. For MP4 (video):
   - Get formats from info.streaming_data?.formats
   - These are pre-muxed (audio+video in one stream, max ~720p)
   - Filter where mime_type starts with 'video/mp4'
   - Sort by quality_label (prefer '720p' over '360p'), take best
   - Return its url as downloadUrl
6. If no format found, throw SnagError: 'No downloadable format found'
7. Use generateFilename('youtube', format) as filename

Error handling:
- Catch and rethrow as SnagError with message:
  'Could not fetch this YouTube video. It may be private or
   age-restricted.'

---

### lib/extractors/instagram.ts

Instagram embeds video data in a public oEmbed endpoint.

Logic:
1. Fetch: https://www.instagram.com/oembed/?url={encodeURIComponent(url)}
   with headers: { 'User-Agent': 'Mozilla/5.0' }
2. If that fails or doesn't have video, try fetching the post page
   URL + '?__a=1&__d=dis' with headers:
   { 'User-Agent': 'Mozilla/5.0',
     'Accept': 'application/json' }
3. Parse the response JSON and look for video_url in the nested
   graphql.shortcode_media object
4. If video_url found:
   - For MP4: return video_url directly
   - For MP3: return the same video_url (browser can extract audio)
5. If not found, throw SnagError:
   'Could not extract Instagram video. Make sure the post is public.'
6. filename: generateFilename('instagram', format)

---

### lib/extractors/tiktok.ts

TikTok exposes video data via their oEmbed endpoint.

Logic:
1. First fetch oEmbed to validate:
   https://www.tiktok.com/oembed?url={encodeURIComponent(url)}
2. Then fetch the actual video page with these headers:
   {
     'User-Agent': 'TikTok 26.2.0 rv:262018 (iPhone; iOS 14.4.2;
       en_US) Cronet',
     'Accept': 'application/json'
   }
3. The page HTML contains a JSON blob in a <script id="SIGI_STATE">
   tag. Parse the HTML to find this script tag content.
4. Parse the JSON and navigate to the videoObject or ItemModule
   to find the video download URL (look for downloadAddr or
   playAddr fields)
5. The download URL often needs the Referer header. Return it with
   a note that the client should set Referer: https://www.tiktok.com
6. For MP3: return the same video URL
7. If extraction fails: throw SnagError:
   'Could not extract TikTok video. The video may be private.'
8. filename: generateFilename('tiktok', format)

---

### lib/extractors/twitter.ts

Twitter/X videos are embedded in their public syndication API.

Logic:
1. Extract tweet ID from URL:
   - twitter.com/user/status/TWEET_ID
   - x.com/user/status/TWEET_ID
   Use URL pathname split, last segment is the ID.
2. Fetch: https://cdn.syndication.twimg.com/tweet-result
   ?id={tweetId}&lang=en&features=...
   with header: { 'User-Agent': 'Mozilla/5.0' }
3. Parse JSON response. Look for mediaDetails array.
4. Find entries where type === 'video' or type === 'animated_gif'
5. From video_info.variants, find the mp4 variant with highest
   bitrate (sort by bitrate descending)
6. Return that url as downloadUrl
7. For MP3: return the same video URL
8. If no video found: throw SnagError:
   'No video found in this tweet. Text-only tweets cannot be
    downloaded.'
9. filename: generateFilename('twitter', format)

---

### lib/extractors/reddit.ts

Reddit has a clean JSON API — just add .json to any post URL.

Logic:
1. Clean the URL: remove query params, ensure it ends without
   trailing slash
2. Fetch: {cleanUrl}.json
   with header: { 'User-Agent': 'snagr/1.0' }
3. Parse response: it's an array, first element has data.children[0]
   .data — this is the post object
4. Check post.is_video — if false, throw SnagError:
   'This Reddit post does not contain a video.'
5. Get the HLS/DASH url from post.media.reddit_video.fallback_url
   (this is a direct mp4 URL)
6. Also get post.media.reddit_video.scrubber_media_url as backup
7. For MP4: return fallback_url
8. For MP3: Reddit separates audio — try fetching
   the video URL with DASH_audio.mp4 at the end instead of
   DASH_{resolution}.mp4. If found, return that as downloadUrl.
9. filename: generateFilename('reddit', format)
```

---

## PROMPT 4 — Router & API Route

```
Create /lib/router.ts:

Import all 5 extractors and detectPlatform, isValidUrl.
Import types from @/types.

Export async function resolveDownload(
  request: DownloadRequest
): Promise<DownloadResult>

Logic:
1. Validate URL with isValidUrl — throw SnagError 'Invalid URL' if bad
2. Detect platform with detectPlatform
3. If platform === 'unknown', throw SnagError:
   'This platform is not supported yet. Supported: YouTube,
    Instagram, TikTok, Twitter/X, Reddit'
4. Call the matching extractor based on platform
5. Return the DownloadResult

---

Create /app/api/download/route.ts:

This is the Next.js API route (Edge runtime NOT supported — use
default Node.js runtime).

Export async function POST(request: Request):

1. Parse body as JSON, expect { url: string, format: string }
2. Validate:
   - url must be a non-empty string
   - format must be 'mp4' or 'mp3'
   If invalid, return Response with status 400 and
   { error: 'Invalid request' }
3. Call resolveDownload({ url, format })
4. Return Response with status 200 and the DownloadResult as JSON
5. Error handling:
   - If error is SnagError: return status 422, { error: error.message }
   - For any other error: return status 500,
     { error: 'Something went wrong. Please try again.' }
   - Log unexpected errors with console.error
6. Add CORS headers to all responses:
   'Access-Control-Allow-Origin': '*'
   'Content-Type': 'application/json'

Also export async function OPTIONS() that returns 200 with
CORS headers (preflight support).
```

---

## PROMPT 5 — Zustand Store

```
Create /store/downloadStore.ts using Zustand with persist middleware.

State shape:
  url: string                         // current input value
  format: DownloadFormat              // 'mp4' | 'mp3', default 'mp4'
  status: DownloadStatus              // default 'idle'
  result: DownloadResult | null       // null by default
  error: SnagError | null             // null by default
  history: HistoryItem[]              // last 10 downloads

Actions:
  setUrl(url: string): void
  setFormat(format: DownloadFormat): void
  reset(): void
    → sets status back to 'idle', clears result and error, keeps url
  clearHistory(): void

  startDownload(): Promise<void>
    1. Set status to 'loading', clear error and result
    2. POST to /api/download with { url, format }
    3. On success:
       - Set status to 'success'
       - Set result to the response data
       - Add to history (prepend, keep max 10):
           { id: generateId(), url, format,
             platform: result.platform,
             filename: result.filename,
             downloadUrl: result.downloadUrl,
             timestamp: Date.now() }
    4. On error:
       - Set status to 'error'
       - Set error.message from response JSON or fallback message

Persist config:
  name: 'snagr-store'
  partialize: only persist { format, history }
  Do NOT persist: url, status, result, error

Import all types from @/types and generateId from @/lib/utils.
```

---

## PROMPT 6 — UI Components via 21st.dev Magic

```
We are using 21st.dev Magic MCP to generate our UI components.
Run each /ui command below one at a time. Wait for the component
to be generated and saved before running the next one.

The design system:
  Background: #0A0A0A
  Surface/cards: #111111
  Muted areas: #1A1A1A
  Borders: #222222
  Accent/brand: #FF3B5C
  Text primary: #EDEDED
  Text muted: #666666
  Font display: Syne (headings, bold)
  Font body: DM Sans (body text)

---

/ui Create a dark-themed URL input component for a video downloader
app. Full width, tall (py-4 px-5). Background #111111, border
#222222. On focus the border glows #FF3B5C with a soft box-shadow.
Right side shows a small floating badge with the detected platform
name (passed as a prop: platformLabel string, empty if not detected).
Left side has a link icon (lucide Link2). Right side also has an X
button to clear (only visible when value is not empty). Accepts
standard input props plus onClear callback and platformLabel prop.
TypeScript, uses cn utility from @/lib/utils. Dark mode only.

---

/ui Create a format selector component with two pill toggle buttons:
"MP4  Video" and "MP3  Audio". Use Video and Music2 icons from
lucide-react. Active pill: bg #FF3B5C, white text. Inactive: bg
#1A1A1A, #666 text, hover brightens to white. Smooth transition.
Uses framer-motion layout animation for the active indicator sliding
between pills. Props: format ('mp4'|'mp3'), onChange callback.
Dark mode, TypeScript.

---

/ui Create a loading state component for a video downloader. Centered
vertically and horizontally. Shows an animated waveform with 5 bars
that pulse up and down in sequence using framer-motion. Below it,
text: "Fetching your {format}..." in muted #666 color, DM Sans font.
Props: format string. Dark background #0A0A0A. Premium, minimal feel.

---

/ui Create a result card component for a video downloader called
ResultCard. Shows a successful download result. Contains:
- Animated green checkmark icon (scale in + fade with framer-motion)
  using CheckCircle2 from lucide-react in #22c55e color
- Heading "Ready to Download" in Syne font, white, large
- A badge showing the format (MP4 or MP3) styled in #FF3B5C
- A large full-width download button: bold, bg #FF3B5C, white text,
  Download icon from lucide. Has a subtle glow (box-shadow #FF3B5C44).
  onClick: opens downloadUrl in new tab with download attribute set
- A smaller text link below: "↩ Download another" that calls onReset
Props: result { downloadUrl, filename, format }, onReset callback.
Subtle card background #111111 with border #222222 and border-radius.
framer-motion scale-in entrance animation. Dark mode TypeScript.

---

/ui Create a supported platforms strip component. Shows small text
badges in a horizontal scrollable row: YouTube · Instagram · TikTok ·
Twitter/X · Reddit. Each badge has a tiny platform color dot before
it (YouTube red #FF0000, Instagram pink #E1306C, TikTok cyan #69C9D0,
Twitter blue #1D9BF0, Reddit orange #FF4500). Prefixed with a small
label: "Works with". All very small text (text-xs), muted #555 color.
No scroll bar visible. Dark mode, TypeScript.
```

---

## PROMPT 7 — Main Download Form

```
Create /components/DownloadForm.tsx — the heart of the app.

This component connects to the Zustand store and orchestrates
the full download flow.

Import from store: url, format, status, result, error,
setUrl, setFormat, startDownload, reset from useDownloadStore.

Import components:
  - UrlInput (generated by 21st.dev)
  - FormatSelector (generated by 21st.dev)
  - LoadingState (generated by 21st.dev)
  - ResultCard (generated by 21st.dev)

Import { detectPlatform, getPlatformLabel, isValidUrl } from @/lib/utils

Use react-hook-form + zod for validation:
  schema: z.object({ url: z.string().url('Please enter a valid URL') })

Layout when status === 'idle' or 'error':
  1. UrlInput:
     - value: url from store
     - onChange: calls setUrl
     - platformLabel: getPlatformLabel(detectPlatform(url)) if url
       is valid, else ''
     - onClear: calls setUrl('')
  2. FormatSelector below the input
  3. A "Snag It →" button:
     - Full width, bg #FF3B5C, white text, bold
     - Font: Syne, tracking-wide
     - Disabled + opacity-50 when url is empty or invalid URL
     - Loading state: spinner (Loader2 from lucide with animate-spin),
       text changes to "Fetching..."
     - onClick: calls startDownload()
  4. Error display (only if status === 'error'):
     - Red text with AlertCircle icon from lucide
     - Shows error.message from store
     - Fade in with framer-motion

When status === 'loading':
  - Show LoadingState component with format prop

When status === 'success':
  - Show ResultCard component with result and onReset={reset}

Wrap all state transitions with framer-motion AnimatePresence
for smooth fade transitions between states.

The button hover: brightness(1.1) + scale(1.01) transition.
```

---

## PROMPT 8 — Page & Layout

```
Create /app/layout.tsx:
- Import Syne and DM Sans from next/font/google
  Syne: subsets ['latin'], weight ['700','800'], variable '--font-display'
  DM Sans: subsets ['latin'], weight ['400','500'], variable '--font-body'
- Apply both CSS variables to <html> element
- className: bg-[#0A0A0A] min-h-screen font-body antialiased
- Metadata:
    title: 'Snagr — Download Anything'
    description: 'Download videos and audio from YouTube,
      Instagram, TikTok, Twitter and Reddit. Free, instant,
      no sign-up.'
    themeColor: '#FF3B5C'

---

Create /app/page.tsx — the full single-page UI:

Section 1 — Hero (center-aligned):
  - App wordmark: "SNAGR" in Syne 800 weight, ~96px on desktop,
    48px mobile. Pure white. Letter-spacing tight.
  - A small red accent dot or spark icon next to the name (⚡ or ↯)
    in #FF3B5C
  - Tagline below: "Download anything. Instantly."
    Syne 700, ~32px desktop, muted off-white #AAAAAA
  - Sub-line: "YouTube · Instagram · TikTok · Twitter · Reddit"
    DM Sans, text-sm, #555555, letter-spacing wide

  Entrance animations (framer-motion, staggered fade-up on mount):
    - SNAGR: delay 0ms
    - Tagline: delay 100ms
    - Sub-line: delay 200ms

Section 2 — Download Form:
  - max-w-lg mx-auto, generous vertical padding
  - Subtle radial gradient behind it:
    background: radial-gradient(ellipse at 50% 50%,
      rgba(255,59,92,0.06) 0%, transparent 70%)
  - Mount with framer-motion: delay 300ms, fade-up

Section 3 — How it works (3 steps, horizontal):
  Step 1: Copy the link — Link2 icon
  Step 2: Choose MP4 or MP3 — SplitSquare icon
  Step 3: Hit Snag It — Zap icon
  Each step: icon in #FF3B5C, small label in #555,
  connected by a dashed line on desktop.
  On mobile: stack vertically.

Section 4 — SupportedPlatforms component

Footer:
  "No data stored · No sign-up · Open source spirit"
  text-xs, #333333, center

Background detail:
  Very subtle grid pattern overlay on the page (CSS background-image
  with 1px lines, opacity 0.03) to give depth without distraction.
```

---

## PROMPT 9 — History Panel

```
Create /components/HistoryPanel.tsx:

Reads history array from useDownloadStore.

If history is empty, render nothing (return null).

Otherwise render a collapsible section below the main form:
  - Toggle button: "Recent Downloads (N)" with a ChevronDown/Up icon
  - When expanded (framer-motion AnimatePresence height animation):
    Show a list of up to 5 most recent history items
    Each row:
      - Platform color dot (same colors as SupportedPlatforms)
      - URL truncated to 40 chars with ellipsis
      - Format badge: small pill 'MP4' or 'MP3' in #FF3B5C
      - Re-download button: small Download icon, clicking opens
        item.downloadUrl in new tab
    At the bottom of the list: a "Clear history" text button
    that calls clearHistory() from the store. Styled in #555,
    small, hover → #FF3B5C.

Styling: surface #111111, border #222222, rounded-xl, text-sm.
Dark mode, TypeScript, full imports from @/types and store.

Add this component to page.tsx below the DownloadForm section.
```

---

## PROMPT 10 — Final Polish & Vercel Deploy Prep

```
Final polish pass — implement all of these:

1. /public/favicon.svg:
   Create an SVG favicon: black background (#0A0A0A), bold red "S"
   letter in #FF3B5C, Syne-style geometric weight, centered.
   Size: 32×32 viewBox.

2. /public/manifest.json:
   {
     "name": "Snagr",
     "short_name": "Snagr",
     "description": "Download videos and audio instantly",
     "start_url": "/",
     "display": "standalone",
     "background_color": "#0A0A0A",
     "theme_color": "#FF3B5C",
     "icons": [{ "src": "/favicon.svg", "sizes": "any", "type": "image/svg+xml" }]
   }
   Add <link rel="manifest"> in layout.tsx head.

3. Error code mapping in /lib/errors.ts:
   Export function getErrorMessage(error: unknown): string
   Map these cases:
   - URL contains 'private' → 'This content is private or unavailable.'
   - URL contains 'age' → 'Age-restricted content cannot be downloaded.'
   - Network errors → 'Network error. Check your connection and try again.'
   - Default → 'Something went wrong. Please try again.'

4. Rate limiting awareness in /app/api/download/route.ts:
   Add a simple in-memory request counter.
   If more than 10 requests in 1 minute from same IP:
   Return 429 with { error: 'Too many requests. Please slow down.' }
   (Use request.headers.get('x-forwarded-for') for IP.)

5. Mobile UX:
   On mobile (< 640px): the hero "SNAGR" should be 56px.
   Ensure the URL input is large enough for comfortable thumb use.
   The "Snag It" button should be at least 56px tall on mobile.

6. README.md:
   # Snagr 🎬
   Download videos & audio from YouTube, Instagram, TikTok,
   Twitter, and Reddit. Paste a link, pick MP4 or MP3, done.

   ## Stack
   Next.js 14 · TypeScript · Zustand · 21st.dev · Vercel

   ## Supported Platforms
   YouTube (up to 720p), Instagram Reels, TikTok, Twitter/X, Reddit

   ## Run Locally
   npm install
   cp .env.local.example .env.local
   npm run dev

   ## Deploy
   Push to GitHub → Import to Vercel → Deploy.
   No environment variables required for basic usage.

   ## Architecture
   All download logic runs in Next.js API routes.
   No external servers or binaries required.
   The browser downloads directly from platform CDNs.

   ## Legal
   For personal use only. Respect copyright and platform ToS.

7. Final build check:
   Run npm run build and fix all TypeScript errors.
   Ensure no 'any' types without explicit annotation.
   Remove all console.log (keep console.error for API route).
   Verify mobile layout at 375px.
   Test the full flow: paste YouTube URL → MP4 → Snag It →
   download button appears → clicking it works.
```

---

## Quick Reference — youtubei.js

```typescript
import { Innertube } from 'youtubei.js';

const yt = await Innertube.create({ retrieve_player: false });
const info = await yt.getInfo(videoId);

// Pre-muxed formats (audio+video, up to ~720p) — use for MP4
const formats = info.streaming_data?.formats ?? [];
const mp4 = formats
  .filter(f => f.mime_type?.startsWith('video/mp4'))
  .sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0))[0];

// Audio-only formats — use for MP3
const adaptive = info.streaming_data?.adaptive_formats ?? [];
const audio = adaptive
  .filter(f => f.mime_type?.startsWith('audio/'))
  .sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0))[0];

const downloadUrl = mp4?.url ?? audio?.url;
```

---

## Common Issues & Fixes

| Issue | Fix |
|---|---|
| youtubei.js URL expires | YouTube stream URLs expire in ~6h — this is fine, users download immediately |
| Instagram returns 401 | Add User-Agent header: `'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)'` |
| TikTok returns empty | Try appending `?is_copy_url=1&is_from_webapp=v1` to the request URL |
| Reddit video has no audio | Reddit separates audio stream — fetch DASH_audio.mp4 separately |
| Vercel timeout | vercel.json maxDuration:30 handles this. If still timing out, the platform CDN is slow |
| TypeScript errors in youtubei.js | Add `"skipLibCheck": true` to tsconfig.json |

---

## Post-MVP Ideas (Run After Core App Works)

**Add quality picker for YouTube:**
```
Add a quality selector that appears only when YouTube is detected
and MP4 format is selected. Options: Auto (default), 720p, 480p,
360p. Use a compact dropdown matching the dark theme. Pass the
selected quality to the youtube extractor to filter formats.
```

**Paste detection shortcut:**
```
Add a keyboard shortcut detector: when user presses Cmd+V or Ctrl+V
anywhere on the page (not inside an input), paste from clipboard
into the URL input and auto-focus it. Show a small toast:
"URL pasted ✓" using framer-motion AnimatePresence. This makes the
app feel like a native tool.
```

**Share sheet for mobile:**
```
Add a Web Share Target manifest entry so mobile users can share
a video URL directly to Snagr from their browser share sheet.
Add share_target to manifest.json with the correct URL pattern.
```

---

*Playbook v2.0 · Pure Next.js · 21st.dev Magic · Vercel · No servers needed*