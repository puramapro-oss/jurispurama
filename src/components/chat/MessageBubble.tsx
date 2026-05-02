'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'
import { formatRelativeDate } from '@/lib/case-helpers'

interface MessageBubbleProps {
  role: 'user' | 'assistant'
  content: string
  createdAt?: string
  streaming?: boolean
  children?: React.ReactNode
}

export default function MessageBubble({
  role,
  content,
  createdAt,
  streaming,
  children,
}: MessageBubbleProps) {
  const isAssistant = role === 'assistant'

  return (
    <div
      className={cn(
        'flex w-full gap-3',
        isAssistant ? 'justify-start' : 'justify-end'
      )}
    >
      {isAssistant && (
        <div
          aria-hidden="true"
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--justice)] to-[var(--justice-light)] text-lg text-white shadow-sm"
        >
          ⚖️
        </div>
      )}

      <div
        className={cn(
          'max-w-[88%] md:max-w-[78%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed shadow-sm',
          isAssistant
            ? 'bg-white/85 border border-[var(--border)] text-[var(--text-primary)]'
            : 'bg-[var(--justice)] text-white'
        )}
      >
        {isAssistant ? (
          <div className="prose-juris">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => (
                  <h3 className="mt-1 mb-2 font-serif text-xl font-semibold text-[var(--justice)]">
                    {children}
                  </h3>
                ),
                h2: ({ children }) => (
                  <h4 className="mt-3 mb-1.5 font-serif text-lg font-semibold text-[var(--justice)]">
                    {children}
                  </h4>
                ),
                h3: ({ children }) => (
                  <h5 className="mt-2 mb-1 text-sm font-semibold uppercase tracking-wide text-[var(--gold-dark)]">
                    {children}
                  </h5>
                ),
                p: ({ children }) => (
                  <p className="mb-2 last:mb-0">{children}</p>
                ),
                ul: ({ children }) => (
                  <ul className="mb-2 ml-4 list-disc space-y-1">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="mb-2 ml-4 list-decimal space-y-1">{children}</ol>
                ),
                li: ({ children }) => <li className="pl-1">{children}</li>,
                strong: ({ children }) => (
                  <strong className="font-semibold text-[var(--justice)]">
                    {children}
                  </strong>
                ),
                code: ({ children }) => (
                  <code className="rounded border border-[var(--gold)]/40 bg-[var(--gold)]/10 px-1.5 py-0.5 font-mono text-[12.5px] font-semibold text-[var(--gold-dark)]">
                    {children}
                  </code>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="my-2 border-l-4 border-[var(--gold)]/50 bg-[var(--gold)]/5 pl-3 italic text-[var(--text-secondary)]">
                    {children}
                  </blockquote>
                ),
                a: ({ children, href }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--justice)] underline decoration-[var(--gold)]/50 underline-offset-2 hover:decoration-[var(--gold)]"
                  >
                    {children}
                  </a>
                ),
                table: ({ children }) => (
                  <div className="my-2 overflow-x-auto rounded-lg border border-[var(--border)]">
                    <table className="w-full text-sm">{children}</table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="bg-[var(--justice)]/10 px-2 py-1 text-left font-semibold text-[var(--justice)]">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="border-t border-[var(--border)] px-2 py-1">
                    {children}
                  </td>
                ),
              }}
            >
              {content || ''}
            </ReactMarkdown>
            {streaming && (
              <span className="cursor-blink" aria-hidden="true" />
            )}
          </div>
        ) : (
          <div className="whitespace-pre-wrap break-words">{content}</div>
        )}

        {createdAt && !streaming && (
          <div
            className={cn(
              'mt-1 text-[11px]',
              isAssistant
                ? 'text-[var(--text-muted)]'
                : 'text-white/60 text-right'
            )}
          >
            {formatRelativeDate(createdAt)}
          </div>
        )}

        {children}
      </div>

      {!isAssistant && (
        <div
          aria-hidden="true"
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--gold-dark)] via-[var(--gold)] to-[var(--gold-light)] text-[13px] font-semibold text-[var(--justice-dark)] shadow-sm"
        >
          {/* user initial fallback — handled by parent if needed */}
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4" />
            <path d="M5 21v-1a7 7 0 0 1 14 0v1" />
          </svg>
        </div>
      )}
    </div>
  )
}
