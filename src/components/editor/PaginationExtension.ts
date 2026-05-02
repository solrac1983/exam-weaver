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
      const contentHeightPx = options.pageHeightPx - padTop - padBottom

      const widgets: Decoration[] = []
      let usedHeight = 0

      const blocks = (Array.from(pm.children) as HTMLElement[]).filter(
        (el) => !el.classList.contains('page-break-widget'),
      )

      const isHardBreak = (el: HTMLElement) => el.hasAttribute('data-page-break')

      /** Calculate gap: remaining content area + paddings + visible desk gap between sheets */
      const calcGap = (used: number): number => {
        const remaining = contentHeightPx - used
        return remaining + padBottom + options.pageGapPx + padTop
      }

      const makeBreakWidget = (pos: number, gapHeight: number) =>
        Decoration.widget(
          pos,
          () => {
            const el = document.createElement('div')
            el.className = 'page-break-widget'
            el.style.height = `${gapHeight}px`
            const sep = document.createElement('div')
            sep.className = 'page-separator-line'
            el.appendChild(sep)
            return el
          },
          { side: -1, key: `page-break-${pos}` },
        )

      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i]

        // ── Hard (manual) page break ──
        if (isHardBreak(block)) {
          try {
            const pos = view.posAtDOM(block, 0)
            widgets.push(makeBreakWidget(pos, calcGap(usedHeight)))
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
                widgets.push(makeBreakWidget(pos, calcGap(usedHeight)))
              } catch { /* skip */ }
              usedHeight = blockHeight
              continue
            }
          }
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
              widgets.push(makeBreakWidget(pos, calcGap(usedHeight)))
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
            widgets.push(makeBreakWidget(pos, calcGap(usedHeight)))
          } catch { /* skip */ }
          usedHeight = blockHeight
          continue
        }

        usedHeight += blockHeight
      }

      // ── Trailing spacer: fill the remainder of the last page so it looks full A4 ──
      if (usedHeight > 0 && usedHeight < contentHeightPx && blocks.length > 0) {
        const lastBlock = blocks[blocks.length - 1]
        const remaining = contentHeightPx - usedHeight + options.pagePaddingBottomPx
        if (remaining > 4) {
          try {
            const pos = view.posAtDOM(lastBlock, 0) + lastBlock.textContent!.length
            widgets.push(
              Decoration.widget(
                view.state.doc.content.size - 1,
                () => {
                  const el = document.createElement('div')
                  el.className = 'page-trailing-spacer'
                  el.style.height = `${remaining}px`
                  el.style.pointerEvents = 'none'
                  el.style.userSelect = 'none'
                  return el
                },
                { side: 1, key: 'page-trailing-spacer' },
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

          return {
            update() {
              scheduleUpdate()
            },
            destroy() {
              window.cancelAnimationFrame(raf)
              clearTimeout(debounceTimer)
            },
          }
        },
      }),
    ]
  },
})
