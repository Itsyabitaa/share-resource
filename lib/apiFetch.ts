/** Same-origin API calls with session cookies (required for Better Auth on mobile). */
export function apiFetch(input: RequestInfo | URL, init?: RequestInit) {
  return fetch(input, {
    ...init,
    credentials: init?.credentials ?? 'include',
  })
}
