import Anthropic from '@anthropic-ai/sdk'
import { SYSTEM_PROMPT, USER_INSTRUCTION, RESPONSE_SCHEMA, MOCK_RESULT } from './_prompt.js'

// Vercel caps a serverless request body at 4.5 MB, and base64 inflates a file by
// about a third. The client resizes photos to ~300 KB before sending, so this
// ceiling is only ever hit by large PDFs.
const MAX_BYTES = 3.5 * 1024 * 1024

const ALLOWED = {
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
  'application/pdf': 'document',
}

// Per million tokens, used only to log what each scan actually cost.
const PRICES = {
  'claude-sonnet-5': { input: 2, output: 10 },
  'claude-opus-5': { input: 5, output: 25 },
}

// Shown for every misconfiguration. The reader needs two things from it: that
// nothing is wrong with their document, and that retrying is pointless.
const NOT_SET_UP = "This isn't set up properly yet. Nothing is wrong with your document — try again later."

// Two different internal failures (no text block, unparseable JSON) that mean the
// same thing to a reader: the answer didn't arrive whole, and retrying may work.
const INCOMPLETE = "The answer didn't come back complete. Try again."

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return send(res, 405, { error: 'Use POST.' })
  }

  let body
  try {
    body = await readJson(req)
  } catch {
    return send(res, 400, { error: "That upload didn't arrive properly. Try again.", retry: true })
  }

  const { data, mimeType, deep } = body ?? {}

  if (typeof data !== 'string' || !data) {
    return send(res, 400, { error: 'No document was attached.', retry: false })
  }

  const kind = ALLOWED[mimeType]
  if (!kind) {
    return send(res, 415, {
      error: 'That file type is not supported. Send a photo (JPG, PNG or WebP) or a PDF.',
      retry: false,
    })
  }

  // base64 is 4 characters per 3 bytes.
  const bytes = Math.floor((data.length * 3) / 4)
  if (bytes > MAX_BYTES) {
    return send(res, 413, {
      error: 'That file is too large. Try a photo of one page instead of the whole document.',
      retry: false,
    })
  }

  if (process.env.MOCK_MODE === '1') {
    await new Promise((r) => setTimeout(r, 1600)) // so loading states get exercised
    return send(res, 200, { result: MOCK_RESULT, model: 'mock', mock: true })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is not set')
    // retry: false — no amount of retrying fixes a missing key, so the UI must
    // not offer a button that cannot work.
    return send(res, 500, { error: NOT_SET_UP, retry: false })
  }

  // Sonnet 5 handles the common case at roughly a third of the cost. Opus 5 runs
  // only when the reader explicitly asks for a close read of an agreement, where
  // a missed clause costs real money.
  const model = deep ? 'claude-opus-5' : 'claude-sonnet-5'
  const effort = deep ? 'high' : 'low'

  const client = new Anthropic()

  try {
    const response = await client.messages.create({
      model,
      max_tokens: 4000,
      thinking: { type: 'adaptive' },
      output_config: { effort, format: RESPONSE_SCHEMA },
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          // The prompt is byte-identical on every request, so it can be cached.
          // Verify with cache_read_input_tokens in the log line below — if that
          // stays at 0 across repeated scans, the prompt is under this model's
          // minimum cacheable length and this block should be removed.
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: [
            kind === 'document'
              ? {
                  type: 'document',
                  source: { type: 'base64', media_type: mimeType, data },
                }
              : {
                  type: 'image',
                  source: { type: 'base64', media_type: mimeType, data },
                },
            { type: 'text', text: USER_INSTRUCTION },
          ],
        },
      ],
    })

    logUsage(model, response.usage)

    if (response.stop_reason === 'refusal') {
      console.error('refused', response.stop_details)
      return send(res, 422, {
        error: "This document couldn't be read. Try a different page, or a clearer photo.",
        retry: false,
      })
    }

    const text = response.content.find((b) => b.type === 'text')?.text
    if (!text) {
      console.error('no text block in response')
      return send(res, 502, { error: INCOMPLETE, retry: true })
    }

    let result
    try {
      result = JSON.parse(text)
    } catch {
      console.error('unparseable response', text.slice(0, 400))
      return send(res, 502, { error: INCOMPLETE, retry: true })
    }

    return send(res, 200, { result, model })
  } catch (err) {
    return send(res, ...mapError(err))
  }
}

// Most specific first — collapsing these into one broad catch would lose the
// difference between "retry works" and "retrying will never work".
function mapError(err) {
  if (err instanceof Anthropic.AuthenticationError) {
    console.error('auth failed — check ANTHROPIC_API_KEY', err.message)
    return [500, { error: NOT_SET_UP, retry: false }]
  }
  if (err instanceof Anthropic.NotFoundError) {
    console.error('model not found — check the model id', err.message)
    return [500, { error: NOT_SET_UP, retry: false }]
  }
  if (err instanceof Anthropic.RateLimitError) {
    return [429, { error: 'Too many scans at once. Wait a moment and try again.', retry: true }]
  }
  if (err instanceof Anthropic.BadRequestError) {
    console.error('bad request', err.message)
    return [400, { error: 'That document could not be processed. Try a clearer photo.', retry: false }]
  }
  if (err instanceof Anthropic.APIConnectionError) {
    console.error('connection failed', err.message)
    return [503, { error: "Couldn't reach the service. Check your connection and try again.", retry: true }]
  }
  if (err instanceof Anthropic.APIStatusError) {
    console.error('api error', err.status, err.message)
    return [502, { error: 'Something went wrong on our side. Try again.', retry: true }]
  }
  console.error('unexpected', err)
  return [500, { error: 'Something went wrong. Try again.' }]
}

// The point of this line is that you never have to trust an estimate of what a
// scan costs — read it off your own logs.
function logUsage(model, usage) {
  if (!usage) return
  const p = PRICES[model]
  const cost = p
    ? ((usage.input_tokens ?? 0) * p.input + (usage.output_tokens ?? 0) * p.output) / 1e6
    : 0
  console.log(
    `scan model=${model} in=${usage.input_tokens} out=${usage.output_tokens} ` +
      `cache_read=${usage.cache_read_input_tokens ?? 0} ` +
      `cache_write=${usage.cache_creation_input_tokens ?? 0} ` +
      `cost=$${cost.toFixed(4)}`
  )
}

// Vercel parses JSON bodies for us; the Vite dev middleware does not. Reading
// both shapes keeps this the only handler, identical in dev and production.
async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body
  if (typeof req.body === 'string') return JSON.parse(req.body)

  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_BYTES * 1.4) throw new Error('body too large')
    chunks.push(chunk)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

function send(res, status, payload) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}
