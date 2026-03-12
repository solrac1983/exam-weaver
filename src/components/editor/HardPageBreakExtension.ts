import { Node, mergeAttributes } from '@tiptap/core'

export interface HardPageBreakOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    hardPageBreak: {
      setHardPageBreak: () => ReturnType
    }
  }
}

export const HardPageBreak = Node.create<HardPageBreakOptions>({
  name: 'hardPageBreak',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: false,

  addOptions() {
    return { HTMLAttributes: {} }
  },

  parseHTML() {
    return [{ tag: 'div[data-page-break]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-page-break': 'true',
        class: 'hard-page-break',
      }),
    ]
  },

  addCommands() {
    return {
      setHardPageBreak:
        () =>
        ({ chain }) => {
          return chain().insertContent({ type: this.name }).run()
        },
    }
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Enter': () => this.editor.commands.setHardPageBreak(),
    }
  },
})
