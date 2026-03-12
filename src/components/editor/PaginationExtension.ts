import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { EditorView } from '@tiptap/pm/view'

const CM_TO_PX = 37.7952755906

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

export const Pagination = Extension.create<PaginationOptions>({
  name: 'pagination',

  addOptions() {
    return {
      pageHeightPx: 29.7 * CM_TO_PX,
      pagePaddingTopPx: 1 * CM_TO_PX,
      pagePaddingBottomPx: 1 * CM_TO_PX,
      pageGapPx: 2 * CM_TO_PX,
    }
  },

  addProseMirrorPlugins() {
    const options = this.options
    const contentHeightPx =
      options.pageHeightPx - options.pagePaddingTopPx - options.pagePaddingBottomPx

    const buildDecorations = (view: EditorView): DecorationSet => {
      const pm = view.dom as HTMLElement | null
      if (!pm) return DecorationSet.empty

      const widgets: Decoration[] = []
      let usedHeight = 0

      // Collect direct block children, skipping our own widgets
      const blocks = (Array.from(pm.children) as HTMLElement[]).filter(
        (el) => !el.classList.contains('page-break-widget'),
      )

      for (const block of blocks) {
        const style = window.getComputedStyle(block)
        const marginTop = parseFloat(style.marginTop || '0')
        const marginBottom = parseFloat(style.marginBottom || '0')
        const blockHeight = block.offsetHeight + marginTop + marginBottom

        // If the next block doesn't fit on the current page, break before it
        if (usedHeight > 0 && usedHeight + blockHeight > contentHeightPx) {
          try {
            const pos = view.posAtDOM(block, 0)
            const gapPx = options.pageGapPx

            widgets.push(
              Decoration.widget(
                pos,
                () => {
                  const el = document.createElement('div')
                  el.className = 'page-break-widget'
                  el.style.height = `${gapPx}px`
                  return el
                },
                {
                  side: -1,
                  key: `page-break-${pos}`,
                },
              ),
            )
          } catch {
            // posAtDOM can throw for edge cases — skip
          }

          usedHeight = 0
        }

        usedHeight += blockHeight
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

          const updatePagination = () => {
            const next = buildDecorations(view)
            const current =
              paginationKey.getState(view.state) || DecorationSet.empty

            if (!sameDecorationSet(current, next)) {
              view.dispatch(view.state.tr.setMeta(paginationKey, next))
            }
          }

          raf = window.requestAnimationFrame(updatePagination)

          return {
            update() {
              window.cancelAnimationFrame(raf)
              raf = window.requestAnimationFrame(updatePagination)
            },
            destroy() {
              window.cancelAnimationFrame(raf)
            },
          }
        },
      }),
    ]
  },
})
