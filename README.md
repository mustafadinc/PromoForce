# PromoForce

AI marketing pipeline for mobile app promo content — App Store sets, social launch packs, and autopilot content calendars.

## Run

Requirement: Node.js 20.9 or newer.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Campaign Types

| Mode | Output |
|------|--------|
| **App Store Set** | 5 portrait slides — export **1290×2796** (iPhone 6.7") |
| **Social Launch Pack** | Instagram Feed, Story, X posts + captions |
| **Marketing Autopilot** | 7 or 30-day content calendar |

Flow: **Setup → Strategy (editable) → Gallery (download / export)**

## OpenAI Setup

Copy `.env.example` to `.env.local` and add your API key:

```env
AI_PROVIDER=openai
OPENAI_API_KEY=your_key

OPENAI_IMAGE_MODEL=gpt-image-2
OPENAI_IMAGE_QUALITY=low
OPENAI_IMAGE_PARTIALS=0
OPENAI_REVISE_PROMPTS=0
OPENAI_CHAT_MODEL=gpt-4o-mini
```

### Image pipeline

- **Primary:** `gpt-image-2` via Image API (`/images/generations`, non-stream when `PARTIALS=0`)
- **Screenshots:** composited pixel-perfect — AI never redraws uploaded app UI
- **Copy on image:** SVG overlay (exact headline/subheadline from strategy)
- **Optional:** set `OPENAI_REVISE_PROMPTS=1` to refine each background prompt via chat (adds ~5 chat calls per App Store set)

### Cost tips

| Variable | Recommendation |
|----------|----------------|
| `OPENAI_IMAGE_QUALITY` | `low` — sufficient for marketing backgrounds |
| `OPENAI_IMAGE_PARTIALS` | `0` — no extra stream frames |
| `OPENAI_REVISE_PROMPTS` | `0` — skip per-slide chat revision (biggest chat token saver) |
| Strategy vision | Screenshots auto-resized to 512px and capped at 4 for strategy analysis |

### Quality settings

| Variable | Values | Default |
|----------|--------|---------|
| `OPENAI_IMAGE_MODEL` | `gpt-image-2`, `gpt-image-1.5`, `gpt-image-1` | `gpt-image-2` |
| `OPENAI_IMAGE_QUALITY` | `low`, `medium`, `high` | `low` |
| `OPENAI_IMAGE_PARTIALS` | `0`–`3` stream preview frames | `0` |
| `OPENAI_REVISE_PROMPTS` | `0` / `1` — chat prompt revision | `0` |
| `OPENAI_CHAT_MODEL` | Strategy + optional revision | `gpt-4o-mini` |

## Custom AI Provider

```env
AI_PROVIDER=custom
AI_PROVIDER_ENDPOINT=https://your-provider-endpoint.example/generate
AI_PROVIDER_API_KEY=your_secret_key
```

Endpoint receives `prompt` + `screenshot` (multipart). Returns `imageUrl`, `dataUrl`, or `b64_json`.

## Project Structure

```text
app/
  api/strategy/          — AI strategy generation
  api/assets/            — Slide & social asset generation
  page.tsx
components/
  CampaignPipeline.tsx   — Main UI
  GrowthToolbar.tsx      — Workspace, usage limits
hooks/
  useCampaignPipeline.ts
lib/
  imageGeneration.ts     — OpenAI gpt-image-2 + compositing
  compositeMarketingSlide.ts
  agents/                — Strategy agents
```

## Build

```bash
npm run build
npm start
```
