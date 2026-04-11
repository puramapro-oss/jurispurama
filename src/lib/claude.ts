import Anthropic from '@anthropic-ai/sdk'

// Lazy init — Vercel Turbopack evaluates modules at build time, before env vars
// are injected. A module-level `new Anthropic()` crashes the build with
// "Neither apiKey nor config.authenticator provided".
let _client: Anthropic | null = null
export function getAnthropic(): Anthropic {
  if (_client) return _client
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY manquante côté serveur')
  }
  _client = new Anthropic({ apiKey })
  return _client
}

export const DEFAULT_MODEL = 'claude-sonnet-4-20250514'
export const FAST_MODEL = 'claude-haiku-4-5-20251001'

export type ChatRole = 'user' | 'assistant'

export interface ImageAttachment {
  media_type: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'
  data: string // base64 (no data: prefix)
}

export interface ChatMessage {
  role: ChatRole
  content: string
  images?: ImageAttachment[]
}

type AnthropicContentBlock =
  | { type: 'text'; text: string }
  | {
      type: 'image'
      source: {
        type: 'base64'
        media_type: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'
        data: string
      }
    }

type AnthropicMessage = {
  role: ChatRole
  content: string | AnthropicContentBlock[]
}

function toAnthropicMessages(messages: ChatMessage[]): AnthropicMessage[] {
  return messages.map((m) => {
    if (m.images && m.images.length > 0) {
      const blocks: AnthropicContentBlock[] = [
        ...m.images.map(
          (img): AnthropicContentBlock => ({
            type: 'image',
            source: {
              type: 'base64',
              media_type: img.media_type,
              data: img.data,
            },
          })
        ),
        { type: 'text', text: m.content },
      ]
      return { role: m.role, content: blocks }
    }
    return { role: m.role, content: m.content }
  })
}

export interface ClaudeCallOptions {
  messages: ChatMessage[]
  system: string
  max_tokens?: number
  model?: string
  temperature?: number
}

/**
 * Non-streaming call. Returns the full text response.
 * Use for short / structured calls (e.g. title generation).
 */
export async function askClaude(opts: ClaudeCallOptions): Promise<string> {
  const client = getAnthropic()
  const res = await client.messages.create({
    model: opts.model ?? DEFAULT_MODEL,
    max_tokens: opts.max_tokens ?? 2048,
    temperature: opts.temperature ?? 0.4,
    system: opts.system,
    messages: toAnthropicMessages(opts.messages),
  })
  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
  return text
}

/**
 * Streaming call. Async generator yielding text chunks.
 *
 *   for await (const chunk of streamClaude({ messages, system })) {
 *     enqueue(chunk)
 *   }
 */
export async function* streamClaude(
  opts: ClaudeCallOptions
): AsyncGenerator<string, void, unknown> {
  const client = getAnthropic()
  const stream = client.messages.stream({
    model: opts.model ?? DEFAULT_MODEL,
    max_tokens: opts.max_tokens ?? 4096,
    temperature: opts.temperature ?? 0.5,
    system: opts.system,
    messages: toAnthropicMessages(opts.messages),
  })
  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      yield event.delta.text
    }
  }
}

/**
 * Retry wrapper — backoff 1/2/4s, 3 tentatives.
 * Suit le pattern PATTERNS.md fetchWithRetry.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  attempts = 3
): Promise<T> {
  let lastErr: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      if (i === attempts - 1) break
      const wait = 1000 * Math.pow(2, i)
      await new Promise((r) => setTimeout(r, wait))
    }
  }
  throw lastErr
}
