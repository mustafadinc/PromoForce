# LaunchFrame AI

Next.js MVP for generating premium Instagram promo images from mobile app screenshots.

## Run

Requirement: Node.js 20.9 or newer.

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Current Behavior

The app has a working MVP flow:

- App info form
- Style selection
- Screenshot upload
- Server-side prompt generation through `POST /api/generate-promo`
- Local canvas fallback image renderer
- Generated image preview
- PNG download

If no external AI provider is configured, the API returns the generated prompt and the frontend renders a local 1080x1080 promo image using the uploaded screenshot.

## AI Provider Setup

Create `.env.local`:

```text
AI_PROVIDER=custom
AI_PROVIDER_ENDPOINT=https://your-provider-endpoint.example/generate
AI_PROVIDER_API_KEY=your_secret_key
MAX_UPLOAD_SIZE_MB=10
```

The custom provider endpoint receives:

- `prompt`
- `screenshot`

It should return JSON with one of these shapes:

```json
{
  "imageUrl": "https://..."
}
```

or:

```json
{
  "dataUrl": "data:image/png;base64,..."
}
```

or:

```json
{
  "b64_json": "..."
}
```

## Project Structure

```text
app/
  api/generate-promo/route.ts
  globals.css
  layout.tsx
  page.tsx
components/
  GeneratedPreview.tsx
  PromoForm.tsx
  PromoGenerator.tsx
lib/
  buildPrompt.ts
  imageGeneration.ts
  types.ts
  validation.ts
```

Legacy static prototype files are still present as reference under `legacy-static-mvp/`:

- `legacy-static-mvp/index.html`
- `legacy-static-mvp/src/app.js`
- `legacy-static-mvp/src/styles.css`
