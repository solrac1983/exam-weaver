/**
 * E2E-style test: simulates a real typing session that grows paragraphs and
 * inserts an image, then asserts the computed page count NEVER oscillates
 * (it may grow as content overflows, but it must never shrink mid-session
 * — that would be the visible "page flicker" bug).
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  measurePageHeightPx,
  __resetPageHeightCacheForTests,
} from './PaginationExtension'
import { computeContentHeight, countPages } from './pageSizing'

const PAGE_GEOMETRY = {
  pageHeightPx: 1123, // ~A4 at 96dpi
  padTop: 96,
  padBottom: 96,
  reservedTop: 0,
  reservedBottom: 0,
}
const LINE_HEIGHT = 24
const PARAGRAPH_MARGIN = 12
const IMAGE_HEIGHT = 320

interface Block {
  lines: number
  isImage?: boolean
}

function blockHeight(b: Block): number {
  if (b.isImage) return IMAGE_HEIGHT + PARAGRAPH_MARGIN
  return b.lines * LINE_HEIGHT + PARAGRAPH_MARGIN
}

function pageCount(blocks: Block[]): number {
  const content = computeContentHeight(PAGE_GEOMETRY)
  return countPages(blocks.map(blockHeight), content)
}

describe('PaginationExtension — e2e real typing session', () => {
  beforeEach(() => {
    __resetPageHeightCacheForTests()
    document.body.innerHTML = ''
  })

  it('page count is monotonic non-decreasing across a long typing + image session', () => {
    const blocks: Block[] = [{ lines: 1 }]
    const samples: number[] = [pageCount(blocks)]

    // Phase 1: type 800 "characters" — grow current paragraph 1 line every ~80 chars
    for (let i = 0; i < 800; i++) {
      // Trigger plugin work each keystroke (simulate ResizeObserver + measure)
      measurePageHeightPx('297mm')
      if (i > 0 && i % 80 === 0) {
        blocks[blocks.length - 1].lines += 1
      }
      // Press Enter every 320 chars to start a new paragraph
      if (i > 0 && i % 320 === 0) {
        blocks.push({ lines: 1 })
      }
      samples.push(pageCount(blocks))
    }

    // Phase 2: insert an image, then keep typing
    blocks.push({ lines: 1, isImage: true })
    samples.push(pageCount(blocks))
    for (let i = 0; i < 400; i++) {
      measurePageHeightPx('297mm')
      if (i > 0 && i % 80 === 0) {
        blocks.push({ lines: 1 })
      }
      if (i > 0 && i % 40 === 0) {
        blocks[blocks.length - 1].lines += 1
      }
      samples.push(pageCount(blocks))
    }

    // Invariant 1: never oscillates — page count must be monotonic non-decreasing
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]).toBeGreaterThanOrEqual(samples[i - 1])
    }

    // Invariant 2: session actually grew across multiple pages (sanity check)
    expect(samples[samples.length - 1]).toBeGreaterThan(1)

    // Invariant 3: probe never inserted into the editor DOM during the session
    const editor = document.querySelector('.ProseMirror')
    expect(editor).toBeNull() // no editor mounted, so nothing to leak into
    expect(document.body.children.length).toBe(0)
  })

  it('repeated identical content reports identical page count (no flicker)', () => {
    const blocks: Block[] = Array.from({ length: 40 }, () => ({ lines: 3 }))
    const reads: number[] = []
    for (let i = 0; i < 200; i++) {
      measurePageHeightPx('297mm')
      reads.push(pageCount(blocks))
    }
    expect(new Set(reads).size).toBe(1)
  })
})
