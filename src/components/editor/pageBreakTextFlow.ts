import type { Editor } from "@tiptap/react";

export interface TextSplitCandidate {
  node: Text;
  offset: number;
}

const TEXT_FLOW_TAGS = new Set(["P", "BLOCKQUOTE"]);

export function isTextFlowElement(el: HTMLElement): boolean {
  return TEXT_FLOW_TAGS.has(el.tagName);
}

function getEditorView(editor: Editor | null) {
  if (!editor) return null;

  try {
    return editor.view;
  } catch {
    return null;
  }
}

function getCaretBottomRelativeToRoot(root: HTMLElement, node: Text, offset: number): number | null {
  const rootRect = root.getBoundingClientRect();
  const range = document.createRange();
  range.setStart(node, offset);
  range.setEnd(node, offset);

  const rect = range.getClientRects()[0] ?? range.getBoundingClientRect();
  if (!rect || (rect.top === 0 && rect.bottom === 0 && rect.height === 0)) {
    return null;
  }

  return rect.bottom - rootRect.top;
}

function normalizeSplitOffset(text: string, offset: number): number {
  const maxLookback = 64;
  const start = Math.max(1, offset - maxLookback);

  for (let i = offset; i >= start; i--) {
    if (/[\s,.;:!?)]/.test(text[i - 1] ?? "")) {
      offset = i;
      break;
    }
  }

  if (offset > 0 && offset < text.length) {
    const prev = text.charCodeAt(offset - 1);
    const curr = text.charCodeAt(offset);
    const prevIsHighSurrogate = prev >= 0xd800 && prev <= 0xdbff;
    const currIsLowSurrogate = curr >= 0xdc00 && curr <= 0xdfff;

    if (prevIsHighSurrogate && currIsLowSurrogate) {
      offset -= 1;
    }
  }

  while (offset > 1 && /\s/.test(text[offset - 1] ?? "")) {
    offset -= 1;
  }

  return offset;
}

function findLastFittingOffset(root: HTMLElement, node: Text, safeBottom: number): number | null {
  const text = node.textContent ?? "";
  if (text.trim().length < 8) return null;

  let low = 1;
  let high = text.length;
  let best: number | null = null;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const bottom = getCaretBottomRelativeToRoot(root, node, mid);

    if (bottom !== null && bottom <= safeBottom) {
      best = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  if (best === null) return null;

  const normalized = normalizeSplitOffset(text, best);
  if (normalized <= 0 || normalized >= text.length) return null;

  return normalized;
}

export function findTextSplitCandidate(
  el: HTMLElement,
  root: HTMLElement,
  safeBottom: number,
): TextSplitCandidate | null {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return node.textContent?.trim()
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    },
  });

  let candidate: TextSplitCandidate | null = null;
  let current = walker.nextNode();

  while (current) {
    const textNode = current as Text;
    const offset = findLastFittingOffset(root, textNode, safeBottom);

    if (offset !== null) {
      candidate = { node: textNode, offset };
    }

    current = walker.nextNode();
  }

  return candidate;
}

export function splitTextElementAtDomPosition(
  editor: Editor | null,
  candidate: TextSplitCandidate | null,
): boolean {
  const view = getEditorView(editor);
  if (!view || !candidate) return false;

  try {
    const text = candidate.node.textContent ?? "";
    const candidateOffsets = [
      candidate.offset,
      candidate.offset - 1,
      candidate.offset + 1,
      candidate.offset - 2,
      candidate.offset + 2,
      candidate.offset - 3,
      candidate.offset + 3,
    ].filter((offset, index, arr) => (
      offset > 0 &&
      offset < text.length &&
      arr.indexOf(offset) === index
    ));

    for (const offset of candidateOffsets) {
      try {
        const pos = view.posAtDOM(candidate.node, offset);
        const $pos = view.state.doc.resolve(pos);

        if (!$pos.parent.isTextblock) continue;
        if (pos <= $pos.start() || pos >= $pos.end()) continue;

        const tr = view.state.tr.split(pos);
        if (!tr.docChanged) continue;

        view.dispatch(tr.scrollIntoView());
        return true;
      } catch {
        continue;
      }
    }

    return false;
  } catch {
    return false;
  }
}
