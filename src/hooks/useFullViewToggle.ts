import { useCallback, useEffect, useRef, useState } from "react"

interface FullViewToggleOptions {
  shouldHandleShortcut?: () => boolean
}

export function useFullViewToggle(
  storageKey: string,
  defaultValue = false,
  options?: FullViewToggleOptions
) {
  const [isFullView, setIsFullView] = useState(defaultValue)
  const shouldHandleRef = useRef(options?.shouldHandleShortcut)

  useEffect(() => {
    shouldHandleRef.current = options?.shouldHandleShortcut
  }, [options?.shouldHandleShortcut])

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const stored = window.localStorage.getItem(storageKey)
      if (stored !== null) {
        setIsFullView(stored === "true")
      }
    } catch (error) {
      console.warn("[useFullViewToggle] Failed to read storage", error)
    }
  }, [storageKey])

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      window.localStorage.setItem(storageKey, String(isFullView))
    } catch (error) {
      console.warn("[useFullViewToggle] Failed to write storage", error)
    }
  }, [isFullView, storageKey])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return
      if (event.key !== "`") return

      if (shouldHandleRef.current && !shouldHandleRef.current()) {
        return
      }

      event.preventDefault()
      setIsFullView((prev) => !prev)
    }

    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  const toggle = useCallback(() => {
    setIsFullView((prev) => !prev)
  }, [])

  return {
    isFullView,
    toggleFullView: toggle,
    setFullView: setIsFullView,
  }
}
