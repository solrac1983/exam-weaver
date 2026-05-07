/**
 * Asserts the pagination layer doesn't trigger excessive layout work during
 * continuous typing. Fails if the number of DOM probes / layout-triggering
 * calls exceeds a configurable budget.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  measurePageHeightPx,
  __resetPageHeightCacheForTests,
} from './PaginationExtension'

const KEYSTROKES = 1000
// Budget: at most 1 probe per unique CSS length used during the session.
// Anything more means we've regressed to the "shake while typing" bug.
const MAX_LAYOUT_PROBES_PER_LENGTH = 1

describe('PaginationExtension — layout-update budget', () => {
  beforeEach(() => {
    __resetPageHeightCacheForTests()
    document.body.innerHTML = ''
  })

  it('continuous typing with stable page size stays within the layout-probe budget', () => {
    const spy = vi.spyOn(document.body, 'appendChild')
    for (let i = 0; i < KEYSTROKES; i++) {
      measurePageHeightPx('297mm')
    }
    expect(spy).toHaveBeenCalledTimes(MAX_LAYOUT_PROBES_PER_LENGTH)
    spy.mockRestore()
  })

  it('switching between portrait and landscape during typing stays within budget', () => {
    const spy = vi.spyOn(document.body, 'appendChild')
    // Simulate the user toggling orientation 5 times while typing
    const lengths = ['297mm', '210mm']
    for (let i = 0; i < KEYSTROKES; i++) {
      measurePageHeightPx(lengths[Math.floor(i / 200) % lengths.length])
    }
    // Budget = unique lengths × 1 probe each
    expect(spy.mock.calls.length).toBeLessThanOrEqual(
      lengths.length * MAX_LAYOUT_PROBES_PER_LENGTH,
    )
    spy.mockRestore()
  })

  it('explicit safety net: never exceeds 5 layout probes for a 1000-keystroke session', () => {
    const spy = vi.spyOn(document.body, 'appendChild')
    for (let i = 0; i < KEYSTROKES; i++) {
      measurePageHeightPx('297mm')
    }
    const HARD_LIMIT = 5
    expect(spy.mock.calls.length).toBeLessThanOrEqual(HARD_LIMIT)
    spy.mockRestore()
  })
})
