import { useEffect } from 'react'
import { driver, type DriveStep } from 'driver.js'
import 'driver.js/dist/driver.css'
import './walkthrough.css'
import { SUBTASKS } from '../tracker/trackerConfig'
import { GLOBAL_TOUR, MASTERS_TOUR, OUTPUTS_TOUR, screenTour } from './screenTours'

// Walkthrough engine. The opening tour runs once per browser on the Upload screen; every screen (and the
// Upload Outputs pane, and Masters) has its own short tour that auto-starts the first time it appears and
// replays from the "?" button in the top bar. Seen flags live in localStorage; closing a tour counts as seen.

const SEEN_KEY = 'bam.walkthrough.seen'
// v2 of the seen keys: the expanded control-level tours auto-fire once more for people who saw the short ones.
const SEEN_PREFIX = 'bam.walkthrough.seen2.'

/** An anchor counts only when it is actually on screen: Upload hides the side panes until the goal is sent,
    locked screens draw no action bar, and panes can be collapsed - hidden steps are skipped, not errors. */
const visible = (selector: string) => {
  const el = document.querySelector(selector)
  if (!el) return false
  const r = el.getBoundingClientRect()
  return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'
}

const seen = (key: string) => { try { return !!localStorage.getItem(key) } catch { return false } }
const mark = (key: string) => { try { localStorage.setItem(key, '1') } catch { /* private mode: tour simply shows again */ } }

// One tour at a time: starting a tour dismisses whatever is open (dismissing counts as seen, same as closing).
let current: { destroy(): void } | null = null
// Fired when any tour closes, so screen tours waiting on the opening tour can re-check.
const TOUR_CLOSED = 'bam-tour-closed'

function drive(steps: DriveStep[], seenKey?: string) {
  const avail = steps.filter(s => !s.element || visible(s.element as string))
  if (!avail.length) return false
  current?.destroy()
  document.documentElement.classList.add('bam-touring')
  const d = driver({
    showProgress: true,
    animate: true,
    smoothScroll: true,
    overlayOpacity: 0.55,
    stagePadding: 6,
    stageRadius: 8,
    popoverClass: 'bam-tour',
    progressText: '{{current}} of {{total}}',
    nextBtnText: 'Next',
    prevBtnText: 'Back',
    doneBtnText: 'Done',
    steps: avail,
    onDestroyed: () => {
      current = null
      document.documentElement.classList.remove('bam-touring')
      if (seenKey) mark(seenKey)
      window.dispatchEvent(new Event(TOUR_CLOSED))
    },
  })
  current = d
  d.drive()
  return true
}

/** The opening tour (first sign-in). Upload's own control-level tour stays unseen and still fires after it. */
export function startWalkthrough() {
  drive(GLOBAL_TOUR, SEEN_KEY)
}

/** Replay the tour of one screen (? button). Running it also marks its auto-start as seen. */
export function startScreenTour(id: string) {
  const item = SUBTASKS.find(s => s.id === id)
  if (!item) { startWalkthrough(); return }
  drive(screenTour(id, item.label, item.description), SEEN_PREFIX + id)
}

export function startMastersTour() {
  drive(MASTERS_TOUR, SEEN_PREFIX + 'masters')
}

/** First-run hook: starts the opening tour once, the first time the Upload screen is ready. */
export function useAutoWalkthrough(ready: boolean) {
  useEffect(() => {
    if (!ready || seen(SEEN_KEY)) return
    const t = window.setTimeout(() => startWalkthrough(), 700)
    return () => window.clearTimeout(t)
  }, [ready])
}

/** Per-screen tours: auto-start the first time a screen (or Masters) opens, after the opening tour has run once. */
export function useScreenWalkthrough(ready: boolean, screenId: string | undefined, isMasters: boolean) {
  useEffect(() => {
    if (!ready) return
    let t: number | undefined
    const tryStart = () => {
      if (!seen(SEEN_KEY)) return
      const key = isMasters ? SEEN_PREFIX + 'masters' : screenId ? SEEN_PREFIX + screenId : undefined
      if (!key || seen(key)) return
      t = window.setTimeout(() => {
        if (isMasters) drive(MASTERS_TOUR, key)
        else if (screenId) {
          const item = SUBTASKS.find(s => s.id === screenId)
          if (item) drive(screenTour(screenId, item.label, item.description), key)
        }
      }, 800)
    }
    // The opening tour may still be running on first sign-in: re-check when it (or any tour) closes.
    tryStart()
    window.addEventListener(TOUR_CLOSED, tryStart)
    return () => { window.clearTimeout(t); window.removeEventListener(TOUR_CLOSED, tryStart) }
  }, [ready, screenId, isMasters])
}

/** Upload's third pane: Outputs is hidden until the first files land, then this tour explains it once.
    The opening-tour flag is checked inside the watcher: on the first sign-in the watcher is installed
    before that tour has finished, and it must still fire when the pane opens later. */
export function useOutputsWalkthrough(ready: boolean, onUpload: boolean) {
  useEffect(() => {
    if (!ready || !onUpload) return
    const key = SEEN_PREFIX + 'upload-outputs'
    if (seen(key)) return
    // Pane already open (files from an earlier visit) and the opening tour has run: nothing new to explain.
    if (seen(SEEN_KEY) && visible('[data-tour="workspace"]')) { mark(key); return }
    const iv = window.setInterval(() => {
      if (!seen(SEEN_KEY) || seen(key)) return
      if (!visible('[data-tour="workspace"]')) return
      window.clearInterval(iv)
      // Let the pane settle into its final size before highlighting it.
      window.setTimeout(() => drive(OUTPUTS_TOUR, key), 700)
    }, 600)
    return () => window.clearInterval(iv)
  }, [ready, onUpload])
}
