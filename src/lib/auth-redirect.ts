const DEFAULT_DESTINATION = '/dashboard'
const INTERNAL_ORIGIN = 'https://auth-redirect.invalid'

function hasControlCharacter(value: string): boolean {
  return Array.from(value).some(character => {
    const code = character.charCodeAt(0)
    return code < 32 || code === 127
  })
}

/** Return a normalized internal path, including its query/hash, or the dashboard. */
export function safeAuthRedirect(next: string | null): string {
  if (typeof next !== 'string' || !next.startsWith('/') || next.startsWith('//') || hasControlCharacter(next)) {
    return DEFAULT_DESTINATION
  }

  try {
    const target = new URL(next, INTERNAL_ORIGIN)
    if (target.origin !== INTERNAL_ORIGIN) return DEFAULT_DESTINATION

    // Validate the path at every decoding level. Reinterpreting encoded slashes,
    // backslashes or dot segments must never turn it into a network-path URL.
    let path = next.split(/[?#]/, 1)[0]
    for (let depth = 0; depth < 6; depth++) {
      if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\') || hasControlCharacter(path)) {
        return DEFAULT_DESTINATION
      }
      const normalized = new URL(path, INTERNAL_ORIGIN)
      if (normalized.origin !== INTERNAL_ORIGIN || normalized.pathname.startsWith('//')) {
        return DEFAULT_DESTINATION
      }
      const decoded = decodeURIComponent(path)
      if (decoded === path) return `${target.pathname}${target.search}${target.hash}`
      path = decoded
    }
  } catch {
    // Malformed escapes and invalid URLs are not valid return destinations.
  }
  return DEFAULT_DESTINATION
}
