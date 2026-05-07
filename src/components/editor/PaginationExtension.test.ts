import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  measurePageHeightPx,
  __resetPageHeightCacheForTests,
} from './PaginationExtension'

describe('PaginationExtension — no resize/layout loops while typing', () => {
  beforeEach(() => {
    __resetPageHeightCacheForTests()
    document.body.innerHTML = ''
  })

  it('does not append the probe element inside the editor DOM (would trigger ResizeObserver loops)', () => {
    const editor = document.createElement('div')
    editor.className = 'ProseMirror'
    document.body.appendChild(editor)

    const before = editor.children.length
    measurePageHeightPx('297mm')
    const after = editor.children.length

    expect(after).toBe(before)
  })

  it('caches conversion results so repeated measurements during typing do not touch the DOM', () => {
    const spy = vi.spyOn(document.body, 'appendChild')

    measurePageHeightPx('297mm')
    measurePageHeightPx('297mm')
    measurePageHeightPx('297mm')
    measurePageHeightPx('297mm')

    // Only the very first call inserts a probe; subsequent keystrokes hit
    // the cache and never touch the DOM.
    expect(spy).toHaveBeenCalledTimes(1)

    spy.mockRestore()
  })

  it('returns 0 (no probe insertion) for empty/blank CSS lengths', () => {
    const spy = vi.spyOn(document.body, 'appendChild')
    expect(measurePageHeightPx('')).toBe(0)
    expect(measurePageHeightPx('   ')).toBe(0)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('cleans up the probe element after measuring', () => {
    measurePageHeightPx('210mm')
    // No leftover probe nodes anywhere in the document.
    expect(document.body.children.length).toBe(0)
  })
})
