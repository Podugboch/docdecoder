# Document Decoder

Photograph a bill, contract or letter. Get back what it says in plain words, what it
means for your money, and what's worth questioning — with every claim tied to a
verbatim quote from your own document so you can check it.

Nothing is stored. The document is held in memory for one API call and discarded.

## Run it locally

```bash
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:3000.

`npm run dev` serves the React app and mounts `api/scan.js` at `/api/scan` through a
Vite middleware, so the same handler runs in development and in production. No Vercel
CLI needed.

### Build the whole UI without spending anything

Set `MOCK_MODE=1` in `.env`. Every scan returns a canned electricity bill after a
1.6s delay — real loading states, real result screen, zero API calls. Leave it on
while you iterate on design.

To go live against Claude, set `MOCK_MODE=0` and put a real key in
`ANTHROPIC_API_KEY`.

## Deploy

```bash
npx vercel
```

Then in the Vercel dashboard, under Settings → Environment Variables, add
`ANTHROPIC_API_KEY`. Do not add `MOCK_MODE` (absent means off).

Optionally add `VITE_CONTACT_URL` — a `https://wa.me/234...` link. It becomes the
"Ask for more scans" button someone sees after using their three scans, which is how
you hear from the people who want this most.

The link will mostly travel by WhatsApp forward, so `index.html` carries Open Graph
tags for the preview card. Once you have a domain, add `og:url` and an `og:image`
(1200×630, absolute URL) — there's a comment in `index.html` marking the spot.
Without an image the card still shows the title and description.

> Vercel's Hobby tier prohibits commercial use. Fine while this is free. The day you
> charge, move to Pro ($20/mo) or migrate to Cloudflare.

## What a scan costs

One Claude call per scan. `api/scan.js` logs the real numbers on every call:

```
scan model=claude-sonnet-5 in=1834 out=612 cache_read=0 cache_write=0 cost=$0.0098
```

Read your own logs rather than trusting an estimate. Roughly:

| Pass | Model | Effort | Ballpark |
|---|---|---|---|
| Every scan | `claude-sonnet-5` | low | ~$0.012 |
| "Read the fine print closely" | `claude-opus-5` | high | ~$0.03–0.065 |

$10 of credit is roughly 800 normal scans. The close read only runs when the reader
taps it, and the button only appears when the document reported itself as an
agreement *and* the reader still has a scan to spend. It consumes one, and the button
says so.

### Four things keep the bill down

1. **`src/lib/prepareFile.js` resizes photos to 1568px** on the long edge before
   upload. This is the single biggest lever — a raw 12MP photo costs several times
   more in image tokens for no extra accuracy.
2. **Usage is logged on every call** (above), so cost per scan is measured, not
   assumed.
3. **`src/lib/scanCount.js` caps free scans at 3/month** per device in
   localStorage. Friction for honest users, trivially bypassed, and that's fine.
4. **The actual backstop is a monthly spend limit in the Anthropic console.** Free,
   hard, and no client can get around it. Set this before you share the link.

If `cache_read` stays at `0` across repeated scans, the system prompt is under this
model's minimum cacheable length — delete the `cache_control` block in
`api/scan.js` rather than leave dead config in place.

## Layout

```
api/
  scan.js        The only place ANTHROPIC_API_KEY exists. Validates, calls Claude,
                 logs usage, maps typed SDK errors to messages a reader can act on.
  _prompt.js     System prompt + JSON schema + the mock result. The leading
                 underscore keeps Vercel from routing to it; living outside src/
                 keeps the prompt out of the browser bundle.
src/
  App.jsx        idle → scanning → result | error
  components/    Uploader, Loading, Result
  lib/           prepareFile (resize + base64), scanCount (free-scan cap)
```

The prompt is the product. Two rules in it carry most of the weight: never invent a
number, name, date or clause; and quote the document character-for-character, never
paraphrased — that verbatim quote is what lets a reader find the line on their own
paper and check the explanation against it.

## Notes on the design

Two typefaces, doing two different jobs. Hanken Grotesk is the app talking to you.
Tinos is the document talking — it only ever sets text copied from your page. The
violet left rule means the same thing everywhere it appears: what follows is your
document's own words.

## Before a live test

- **Confirm Anthropic serves Nigeria.** If not, the same code runs against Amazon
  Bedrock or Google Vertex through a different client class — contained, but worth
  knowing before launch.
- **A card that works for USD.** Naira cards commonly fail; a dollar card (Grey,
  Geegpay, Chipper) or a domiciliary account resolves it.

## Known behaviour worth knowing about

Every error response carries a `retry` flag, and the UI only offers "Try again" when
retrying could actually work. A missing key, an unsupported file type or an oversized
upload all set `retry: false` — a button that can never succeed is worse than no
button.

The close-read pass has no automatic model fallback. If Claude declines a document,
`api/scan.js` returns a 422 and the reader is told, rather than being silently
downgraded to a different model — on a contract, quietly changing which model read it
is worse than saying so.
