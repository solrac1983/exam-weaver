import { Node, mergeAttributes } from "@tiptap/core";

export type DynamicFieldKind =
  | "page_number"
  | "page_count"
  | "date"
  | "time"
  | "datetime"
  | "doc_title"
  | "author"
  | "student_name"
  | "class_group";

export const DYNAMIC_FIELD_LABELS: Record<DynamicFieldKind, string> = {
  page_number: "Nº da página",
  page_count: "Total de páginas",
  date: "Data atual",
  time: "Hora atual",
  datetime: "Data/Hora",
  doc_title: "Título do documento",
  author: "Autor",
  student_name: "Nome do aluno",
  class_group: "Turma",
};

function resolveValue(kind: DynamicFieldKind, ctx: Record<string, string>): string {
  const now = new Date();
  switch (kind) {
    case "page_number":
      return ctx.page_number ?? "1";
    case "page_count":
      return ctx.page_count ?? "1";
    case "date":
      return now.toLocaleDateString("pt-BR");
    case "time":
      return now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    case "datetime":
      return now.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
    case "doc_title":
      return ctx.doc_title ?? "—";
    case "author":
      return ctx.author ?? "—";
    case "student_name":
      return ctx.student_name ?? "_______________________";
    case "class_group":
      return ctx.class_group ?? "_______________________";
  }
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    dynamicField: {
      insertDynamicField: (kind: DynamicFieldKind) => ReturnType;
    };
  }
}

export const DynamicField = Node.create({
  name: "dynamicField",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      kind: {
        default: "date" as DynamicFieldKind,
        parseHTML: (el) => (el.getAttribute("data-kind") as DynamicFieldKind) || "date",
        renderHTML: (attrs) => ({ "data-kind": attrs.kind }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-dynamic-field]" }];
  },

  renderHTML({ HTMLAttributes }) {
    const kind = (HTMLAttributes["data-kind"] as DynamicFieldKind) || "date";
    const label = DYNAMIC_FIELD_LABELS[kind] ?? kind;
    // Render the resolved value at export time. For live editor, the NodeView updates it.
    const value = resolveValue(kind, {});
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-dynamic-field": "true",
        "data-kind": kind,
        title: label,
        class: "dynamic-field",
      }),
      value,
    ];
  },

  addNodeView() {
    return ({ node }) => {
      const kind = (node.attrs.kind as DynamicFieldKind) || "date";
      const dom = document.createElement("span");
      dom.className = "dynamic-field";
      dom.setAttribute("data-dynamic-field", "true");
      dom.setAttribute("data-kind", kind);
      dom.setAttribute("title", DYNAMIC_FIELD_LABELS[kind] ?? kind);
      dom.contentEditable = "false";
      dom.textContent = resolveValue(kind, {});
      // Light styling so the user notices it's a field
      dom.style.background = "hsl(var(--primary) / 0.10)";
      dom.style.borderRadius = "3px";
      dom.style.padding = "0 4px";
      dom.style.fontVariantNumeric = "tabular-nums";
      return { dom };
    };
  },

  addCommands() {
    return {
      insertDynamicField:
        (kind) =>
        ({ chain }) =>
          chain().insertContent({ type: this.name, attrs: { kind } }).run(),
    };
  },
});
