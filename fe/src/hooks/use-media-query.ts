import * as React from "react"

// Reads the query synchronously on the first client render (via useSyncExternalStore),
// so layout pieces gated on it (e.g. the sidebar header) don't pop in a frame later.
// On the server it reports `false`, matching the previous behavior.
export function useMediaQuery(query: string) {
  const subscribe = React.useCallback(
    (onChange: () => void) => {
      const result = matchMedia(query)
      result.addEventListener("change", onChange)
      return () => result.removeEventListener("change", onChange)
    },
    [query]
  )

  return React.useSyncExternalStore(
    subscribe,
    () => matchMedia(query).matches,
    () => false
  )
}
