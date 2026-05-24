import { useSyncExternalStore } from 'react'

// Below Tailwind's `md` breakpoint (768px) — i.e. phones.
const QUERY = '(max-width: 767px)'

function subscribe(callback: () => void) {
  const mql = window.matchMedia(QUERY)
  mql.addEventListener('change', callback)
  return () => mql.removeEventListener('change', callback)
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches
}

/**
 * True on phone-sized viewports. Recording relies on MediaRecorder /
 * getUserMedia, which is unreliable in mobile browsers, so the Snimi feature is
 * hidden on mobile and users are pointed at the native app instead.
 */
export function useIsMobile() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
