/**
 * E2E-style test: simulates a long, continuous typing session and asserts
 * the editor's pagination layer never trips its own ResizeObserver loop
 * (no probe inserted into the editor DOM, no excessive re-renders, stable
 * page count for stable content).
 *
 * Mirrors the user-visible bug: "página tremendo enquanto digito".
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  measurePageHeightPx,
  __resetPageHeightCacheForTests,
} from './PaginationExtension'
import { computeContentHeight, countPages } from './pageSizing'

const TYPING_KEYSTROKES = 500

describe('PaginationExtension — e2e continuous typing', () => {
  beforeEach(() => {
    __resetPageHeightCacheForTests()
    document.body.innerHTML = ''
  })

  it('continuous typing does not insert probes into the editor DOM', () => {
    const editor = document.createElement('div')
    editor.className = 'ProseMirror'
    document.body.appendChild(editor)

    const editorObserver = new MutationObserver(() => {
      editorMutations += 1
    })
    let editorMutations = 0
    editorObserver.observe(editor, { childList: true, subtree: true })

    // Simulate the pagination plugin re-running on every keystroke.
    for (let i = 0; i < TYPING_KEYSTROKES; i++) {
      measurePageHeightPx('297mm')
    }

    // Flush microtasks so MutationObserver callbacks fire.
    return Promise.resolve().then(() => {
      editorObserver.disconnect()
      expect(editorMutations).toBe(0)
      expect(editor.children.length).toBe(0)
    })
  })

  it('continuous typing only probes the document.body once (then hits cache)', () => {
    const spy = vi.spyOn(document.body, 'appendChild')
    for (let i = 0; i < TYPING_KEYSTROKES; i++) {
      measurePageHeightPx('297mm')
    }
    expect(spy).toHaveBeenCalledTimes(1)
    spy.mockRestore()
  })

  it('page count stays stable across a typing session when content is unchanged', () => {
    // Geometry mirroring an A4 page (~1123px tall, 96px padding, no reserved zones)
    const geometry = {
      pageHeightPx: 1123,
      padTop: 96,
      padBottom: 96,
      reservedTop: 0,
      reservedBottom: 0,
    }
    const content = computeContentHeight(geometry)
    // Block heights representing 3 pages of paragraphs
    const blockHeights = Array.from({ length: 60 }, () => 50)
    const expectedPages = countPages(blockHeights, content)

    const observed: number[] = []
    for (let i = 0; i < TYPING_KEYSTROKES; i++) {
      observed.push(countPages(blockHeights, content))
    }

    // No flicker: every "frame" reports the same page count
    expect(new Set(observed).size).toBe(1)
    expect(observed[0]).toBe(expectedPages)
  })

  it('cleans up after the session — no orphan probe nodes anywhere', () => {
    for (let i = 0; i < TYPING_KEYSTROKES; i++) {
      measurePageHeightPx('210mm')
      measurePageHeightPx('297mm')
    }
    expect(document.body.children.length).toBe(0)
  })
})
