import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { EditorView } from '@tiptap/pm/view'

const CM_TO_PX = 37.7952755906

/** Minimum lines to keep at the bottom of a page (orphan control) */
const MIN_ORPHAN_LINES = 2
/** Minimum lines to keep at the top of the next page (widow control) */
const MIN_WIDOW_LINES = 2

export type PaginationOptions = {
  pageHeightPx: number
  pagePaddingTopPx: number
  pagePaddingBottomPx: number
  pageGapPx: number
}

const paginationKey = new PluginKey<DecorationSet>('pagination')

function sameDecorationSet(a: DecorationSet, b: DecorationSet): boolean {
  const serialize = (ds: DecorationSet) =>
    ds
      .find()
      .map((d) => `${d.from}:${d.to}:${(d.spec as any)?.key ?? ''}`)
      .join('|')
  return serialize(a) === serialize(b)
}

function estimateLineCount(el: HTMLElement): number {
  const style = window.getComputedStyle(el)
  const fontSize = parseFloat(style.fontSize || '16') || 16
  const lh = parseFloat(style.lineHeight || '') || fontSize * 1.5
  return Math.max(1, Math.round(el.offsetHeight / lh))
}

function linesInHeight(el: HTMLElement, heightPx: number): number {
  const style = window.getComputedStyle(el)
  const fontSize = parseFloat(style.fontSize || '16') || 16
  const lh = parseFloat(style.lineHeight || '') || fontSize * 1.5
  return Math.max(0, Math.floor(heightPx / lh))
}

function isTextFlowElement(el: HTMLElement): boolean {
  return ['P', 'BLOCKQUOTE', 'LI'].includes(el.tagName)
}

function isHeading(el: HTMLElement): boolean {
  return /^H[1-6]$/.test(el.tagName)
}

function isShortLabel(el: HTMLElement): boolean {
  if (el.tagName !== 'P' || !el.textContent) return false
  if (el.textContent.trim().length >= 40) return false
  const style = window.getComputedStyle(el)
  return style.fontWeight >= '600' || style.fontWeight === 'bold'
}

function getBlockHeight(block: HTMLElement): number {
  const style = window.getComputedStyle(block)
  const marginTop = parseFloat(style.marginTop || '0')
  const marginBottom = parseFloat(style.marginBottom || '0')
  return block.offsetHeight + marginTop + marginBottom
}

export const Pagination = Extension.create<PaginationOptions>({
  name: 'pagination',

  addOptions() {
    return {
      pageHeightPx: 29.7 * CM_TO_PX,
      pagePaddingTopPx: 1 * CM_TO_PX,
      pagePaddingBottomPx: 1 * CM_TO_PX,
      pageGapPx: 0.5 * CM_TO_PX,
    }
  },

  addProseMirrorPlugins() {
    const options = this.options

    const buildDecorations = (view: EditorView): DecorationSet => {
      const pm = view.dom as HTMLElement | null
      if (!pm) return DecorationSet.empty

      // Skip pagination in multi-column mode — CSS columns handle layout
      const wrapper = pm.closest('.exam-wrapper')
      if (wrapper && wrapper.getAttribute('data-columns') !== '1') {
        return DecorationSet.empty
      }

      // Read padding from the actual DOM so margin changes are respected
      const cs = window.getComputedStyle(pm)
      const padTop = parseFloat(cs.paddingTop || '0') || options.pagePaddingTopPx
      const padBottom = parseFloat(cs.paddingBottom || '0') || options.pagePaddingBottomPx
      const pageGap = parseFloat(cs.getPropertyValue('--page-gap') || '') || options.pageGapPx
      // Read A4 page height from CSS variable so visual sheet & pagination math
      // stay perfectly in sync (var resolves to px after browser conversion).
      const pageHVar = cs.getPropertyValue('--page-h').trim()
      let pageHeightPx = options.pageHeightPx
      if (pageHVar) {
        // Use a probe element to convert the CSS length (e.g. "297mm") to px
        const probe = document.createElement('div')
        probe.style.position = 'absolute'
        probe.style.visibility = 'hidden'
        probe.style.height = pageHVar
        pm.appendChild(probe)
        const measured = probe.offsetHeight
        pm.removeChild(probe)
        if (measured > 0) pageHeightPx = measured
      }
      // Reserve space for header/footer overlays via CSS vars (set by RichEditor)
      const reservedTop = parseFloat(cs.getPropertyValue('--page-reserved-top') || '0') || 0
      const reservedBottom = parseFloat(cs.getPropertyValue('--page-reserved-bottom') || '0') || 0
      const contentHeightPx = Math.max(
        80,
        pageHeightPx - padTop - padBottom - reservedTop - reservedBottom,
      )

      const widgets: Decoration[] = []
      let usedHeight = 0

      const blocks = (Array.from(pm.children) as HTMLElement[]).filter(
        (el) =>
          !el.classList.contains('page-break-widget') &&
          !el.classList.contains('page-trailing-spacer'),
      )

      const isHardBreak = (el: HTMLElement) => el.hasAttribute('data-page-break')

      /**
       * Calculate the exact visual segments of an automatic page break.
       * The first segment must stay white until the current A4 page is complete;
       * only then do we show the gray desk gap and the top margin of the next page.
       */
      const calcBreakMetrics = (used: number) => {
        const remaining = Math.max(0, contentHeightPx - used)
        const fillHeight = remaining + reservedBottom + padBottom
        const nextTopHeight = padTop + reservedTop
        return {
          fillHeight,
          gapHeight: pageGap,
          nextTopHeight,
          separatorTop: fillHeight + pageGap / 2,
          totalHeight: fillHeight + pageGap + nextTopHeight,
        }
      }

      const metricsKey = (metrics: ReturnType<typeof calcBreakMetrics>) =>
        [metrics.totalHeight, metrics.fillHeight, metrics.gapHeight, metrics.nextTopHeight]
          .map((value) => Math.round(value))
          .join('-')

      const makeBreakWidget = (pos: number, metrics: ReturnType<typeof calcBreakMetrics>) =>
        Decoration.widget(
          pos,
          () => {
            const el = document.createElement('div')
            el.className = 'page-break-widget'
            el.style.height = `${metrics.totalHeight}px`
            el.style.setProperty('--page-break-fill', `${metrics.fillHeight}px`)
            el.style.setProperty('--page-break-gap', `${metrics.gapHeight}px`)
            el.style.setProperty('--page-break-next-top', `${metrics.nextTopHeight}px`)
            el.style.setProperty('--page-break-separator-top', `${metrics.separatorTop}px`)
            const sep = document.createElement('div')
            sep.className = 'page-separator-line'
            el.appendChild(sep)
            return el
          },
          { side: -1, key: `page-break-${pos}-${metricsKey(metrics)}` },
        )

      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i]

        // ── Hard (manual) page break ──
        if (isHardBreak(block)) {
          try {
            const pos = view.posAtDOM(block, 0)
            widgets.push(makeBreakWidget(pos, calcBreakMetrics(usedHeight)))
          } catch { /* skip */ }
          usedHeight = 0
          continue
        }

        const blockHeight = getBlockHeight(block)
        const remaining = contentHeightPx - usedHeight

        // ── Keep-with-next: headings and short bold labels ──
        if (usedHeight > 0 && blockHeight <= remaining) {
          if ((isHeading(block) || isShortLabel(block)) && i + 1 < blocks.length) {
            const nextHeight = getBlockHeight(blocks[i + 1])
            if (blockHeight + nextHeight > remaining) {
              try {
                const pos = view.posAtDOM(block, 0)
                widgets.push(makeBreakWidget(pos, calcBreakMetrics(usedHeight)))
              } catch { /* skip */ }
              usedHeight = blockHeight
              continue
            }
          }
        }

        // ── Oversized text block: paragraph itself exceeds full page height ──
        // (e.g. a massive run-on paragraph). Walk it in page-sized chunks so
        // the user actually sees A4 page breaks inside the paragraph.
        if (isTextFlowElement(block) && blockHeight > contentHeightPx) {
          // First, if there's already content on the current page, push this
          // oversized block to the next page so it starts cleanly.
          if (usedHeight > 0) {
            try {
              const pos = view.posAtDOM(block, 0)
              widgets.push(makeBreakWidget(pos, calcBreakMetrics(usedHeight)))
            } catch { /* skip */ }
            usedHeight = 0
          }

          // Now insert intra-paragraph breaks every `contentHeightPx` of vertical
          // distance, anchored at text positions inside the block.
          let consumed = 0
          while (consumed + contentHeightPx < blockHeight) {
            consumed += contentHeightPx
            try {
              const pmPosStart = view.posAtDOM(block, 0)
              const blockRect = block.getBoundingClientRect()
              const targetY = blockRect.top + consumed
              // Find a ProseMirror position near targetY inside the block
              const found = view.posAtCoords({
                left: blockRect.left + 8,
                top: targetY,
              })
              const insertPos = found && found.pos > pmPosStart
                ? found.pos
                : pmPosStart
              widgets.push(makeBreakWidget(insertPos, calcBreakMetrics(contentHeightPx)))
            } catch { /* skip */ }
          }
          // Whatever is left of the block sits on the final page it spills onto.
          usedHeight = blockHeight - consumed
          continue
        }

        // ── Widow/orphan control for text-flow elements ──
        if (usedHeight > 0 && blockHeight > remaining && isTextFlowElement(block)) {
          const totalLines = estimateLineCount(block)
          const linesBeforeBreak = linesInHeight(block, remaining)
          const linesAfterBreak = totalLines - linesBeforeBreak

          const tooFewOrphans = linesBeforeBreak < MIN_ORPHAN_LINES
          const tooFewWidows = linesAfterBreak < MIN_WIDOW_LINES
          const tooShortToSplit = totalLines <= MIN_ORPHAN_LINES + MIN_WIDOW_LINES

          if (tooFewOrphans || tooFewWidows || tooShortToSplit) {
            try {
              const pos = view.posAtDOM(block, 0)
              widgets.push(makeBreakWidget(pos, calcBreakMetrics(usedHeight)))
            } catch { /* skip */ }
            usedHeight = blockHeight
            continue
          }

          usedHeight += blockHeight
          continue
        }

        // ── Standard break: block doesn't fit ──
        if (usedHeight > 0 && usedHeight + blockHeight > contentHeightPx) {
          try {
            const pos = view.posAtDOM(block, 0)
            widgets.push(makeBreakWidget(pos, calcBreakMetrics(usedHeight)))
          } catch { /* skip */ }
          usedHeight = blockHeight
          continue
        }

        usedHeight += blockHeight
      }

      // ── Trailing spacer: fill the remainder of the last page so it is exactly A4 ──
      // We pad whenever the editor has rendered any page-break (i.e. multi-page
      // document) OR when the last page has content. This guarantees every page
      // — including the last — measures exactly one A4 sheet tall.
      const hasPageBreaks = widgets.length > 0
      const shouldPadLast =
        blocks.length > 0 && (usedHeight > 0 || hasPageBreaks)
      if (shouldPadLast) {
        // Clamp usedHeight into the content area (paragraphs slightly taller than
        // the content area should still leave a non-negative spacer).
        const lastUsed = Math.min(Math.max(usedHeight, 0), contentHeightPx)
        // Add reservedTop + reservedBottom so the box height ends up exactly
        // N * pageHeight + (N-1) * pageGap, regardless of header/footer overlays.
        const remaining = (contentHeightPx - lastUsed) + reservedTop + reservedBottom
        if (remaining > 1) {
          try {
            widgets.push(
              Decoration.widget(
                view.state.doc.content.size,
                () => {
                  const el = document.createElement('div')
                  el.className = 'page-trailing-spacer'
                  el.style.height = `${remaining}px`
                  el.style.pointerEvents = 'none'
                  el.style.userSelect = 'none'
                  return el
                },
                { side: 1, key: `page-trailing-spacer-${Math.round(remaining)}` },
              ),
            )
          } catch { /* skip */ }
        }
      }

      return DecorationSet.create(view.state.doc, widgets)
    }

    return [
      new Plugin<DecorationSet>({
        key: paginationKey,

        state: {
          init: () => DecorationSet.empty,
          apply(tr, old) {
            const meta = tr.getMeta(paginationKey)
            if (meta) return meta
            return old.map(tr.mapping, tr.doc)
          },
        },

        props: {
          decorations(state) {
            return paginationKey.getState(state) || DecorationSet.empty
          },
        },

        view(view) {
          let raf = 0
          let debounceTimer = 0
          let isUpdating = false
          let lastSerialised = ''

          const updatePagination = () => {
            if (isUpdating) return
            isUpdating = true
            try {
              const next = buildDecorations(view)
              const nextSer = next
                .find()
                .map((d) => `${d.from}:${d.to}:${(d.spec as any)?.key ?? ''}`)
                .join('|')

              if (nextSer !== lastSerialised) {
                lastSerialised = nextSer
                view.dispatch(view.state.tr.setMeta(paginationKey, next))
              }
            } finally {
              isUpdating = false
            }
          }

          const scheduleUpdate = () => {
            if (isUpdating) return
            window.cancelAnimationFrame(raf)
            clearTimeout(debounceTimer)
            debounceTimer = window.setTimeout(() => {
              raf = window.requestAnimationFrame(updatePagination)
            }, 150)
          }

          scheduleUpdate()

          const ro = new ResizeObserver(() => scheduleUpdate())
          ro.observe(view.dom)
          window.addEventListener('resize', scheduleUpdate)
          window.addEventListener('editor-margins-change', scheduleUpdate as EventListener)

          return {
            update() {
              scheduleUpdate()
            },
            destroy() {
              window.cancelAnimationFrame(raf)
              clearTimeout(debounceTimer)
              ro.disconnect()
              window.removeEventListener('resize', scheduleUpdate)
              window.removeEventListener('editor-margins-change', scheduleUpdate as EventListener)
            },
          }
        },
      }),
    ]
  },
})
