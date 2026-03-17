import { Extension } from "@tiptap/core";
import { ySyncPlugin, yCursorPlugin, yUndoPlugin } from "y-prosemirror";
import type * as Y from "yjs";
import type { SupabaseYjsProvider } from "./SupabaseYjsProvider";

export interface CollaborationOptions {
  document: Y.Doc;
  provider: SupabaseYjsProvider;
  user: { name: string; color: string };
}

export const YjsCollaboration = Extension.create<CollaborationOptions>({
  name: "yjsCollaboration",

  addProseMirrorPlugins() {
    const fragment = this.options.document.getXmlFragment("prosemirror");
    return [
      ySyncPlugin(fragment),
      yCursorPlugin(this.options.provider.awareness, {
        cursorBuilder: (user: { name: string; color: string }) => {
          const cursor = document.createElement("span");
          cursor.classList.add("collaboration-cursor__caret");
          cursor.style.borderColor = user.color;

          const label = document.createElement("span");
          label.classList.add("collaboration-cursor__label");
          label.style.backgroundColor = user.color;
          label.textContent = user.name;
          cursor.appendChild(label);

          return cursor;
        },
      }),
      yUndoPlugin(),
    ];
  },
});
