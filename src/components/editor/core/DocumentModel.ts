/**
 * DocumentModel — single source of truth for the editor.
 *
 * Holds Tiptap content alongside page setup, styles, header/footer,
 * metadata, comments, revisions and assets so every consumer
 * (editor, preview, print, PDF/DOCX export) reads the same state.
 */
import type { JSONContent } from "@tiptap/core";
import type { StyleRegistry } from "./StyleManager";
import { defaultStyleRegistry } from "./StyleManager";

export type PageSize = "A4" | "Letter" | "Legal";
export type PageOrientation = "portrait" | "landscape";

export interface PageMargins {
  top: number;    // mm
  right: number;
  bottom: number;
  left: number;
}

export interface PageSetup {
  size: PageSize;
  orientation: PageOrientation;
  margins: PageMargins;
  columns: number;
  columnGap: number; // mm
}

export interface HeaderFooterSlot {
  left?: string;
  center?: string;
  right?: string;
  /** Optional rich HTML for full WYSIWYG mode */
  html?: string;
}

export interface HeaderFooterConfig {
  default: { header: HeaderFooterSlot; footer: HeaderFooterSlot };
  firstPage?: { header: HeaderFooterSlot; footer: HeaderFooterSlot } | null;
  even?: { header: HeaderFooterSlot; footer: HeaderFooterSlot } | null;
  odd?: { header: HeaderFooterSlot; footer: HeaderFooterSlot } | null;
  enableFirstPageDifferent: boolean;
  enableEvenOddDifferent: boolean;
}

export interface DocumentMetadata {
  title: string;
  author: string;
  subject: string;
  keywords: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DocumentComment {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  range: { from: number; to: number };
  resolved: boolean;
  createdAt: string;
  replies?: DocumentComment[];
}

export interface DocumentRevision {
  id: string;
  authorId: string;
  authorName: string;
  type: "insert" | "delete" | "format";
  range: { from: number; to: number };
  payload?: unknown;
  createdAt: string;
}

export interface DocumentAsset {
  id: string;
  kind: "image" | "chart" | "equation";
  url?: string;
  data?: unknown;
}

export interface DocumentModel {
  /** Tiptap JSON document — fully backwards compatible. */
  content: JSONContent | null;
  styles: StyleRegistry;
  pageSetup: PageSetup;
  headerFooter: HeaderFooterConfig;
  metadata: DocumentMetadata;
  comments: DocumentComment[];
  revisions: DocumentRevision[];
  assets: DocumentAsset[];
}

export const defaultPageSetup: PageSetup = {
  size: "A4",
  orientation: "portrait",
  margins: { top: 25, right: 20, bottom: 25, left: 20 },
  columns: 1,
  columnGap: 10,
};

export const defaultHeaderFooter: HeaderFooterConfig = {
  default: { header: {}, footer: {} },
  firstPage: null,
  even: null,
  odd: null,
  enableFirstPageDifferent: false,
  enableEvenOddDifferent: false,
};

export function createDocumentModel(
  partial?: Partial<DocumentModel>,
): DocumentModel {
  const now = new Date().toISOString();
  return {
    content: partial?.content ?? null,
    styles: partial?.styles ?? defaultStyleRegistry(),
    pageSetup: partial?.pageSetup ?? { ...defaultPageSetup },
    headerFooter: partial?.headerFooter ?? { ...defaultHeaderFooter },
    metadata: partial?.metadata ?? {
      title: "",
      author: "",
      subject: "",
      keywords: [],
      createdAt: now,
      updatedAt: now,
    },
    comments: partial?.comments ?? [],
    revisions: partial?.revisions ?? [],
    assets: partial?.assets ?? [],
  };
}

// ─── Reducer ────────────────────────────────────────────────────────────────

export type DocumentAction =
  | { type: "SET_CONTENT"; content: JSONContent }
  | { type: "PATCH_PAGE_SETUP"; patch: Partial<PageSetup> }
  | { type: "PATCH_HEADER_FOOTER"; patch: Partial<HeaderFooterConfig> }
  | { type: "PATCH_METADATA"; patch: Partial<DocumentMetadata> }
  | { type: "SET_STYLES"; styles: StyleRegistry }
  | { type: "ADD_COMMENT"; comment: DocumentComment }
  | { type: "RESOLVE_COMMENT"; id: string }
  | { type: "ADD_REVISION"; revision: DocumentRevision }
  | { type: "ADD_ASSET"; asset: DocumentAsset }
  | { type: "REPLACE"; model: DocumentModel };

export function documentReducer(
  state: DocumentModel,
  action: DocumentAction,
): DocumentModel {
  switch (action.type) {
    case "SET_CONTENT":
      return { ...state, content: action.content, metadata: { ...state.metadata, updatedAt: new Date().toISOString() } };
    case "PATCH_PAGE_SETUP":
      return { ...state, pageSetup: { ...state.pageSetup, ...action.patch } };
    case "PATCH_HEADER_FOOTER":
      return { ...state, headerFooter: { ...state.headerFooter, ...action.patch } };
    case "PATCH_METADATA":
      return { ...state, metadata: { ...state.metadata, ...action.patch } };
    case "SET_STYLES":
      return { ...state, styles: action.styles };
    case "ADD_COMMENT":
      return { ...state, comments: [...state.comments, action.comment] };
    case "RESOLVE_COMMENT":
      return {
        ...state,
        comments: state.comments.map((c) => (c.id === action.id ? { ...c, resolved: true } : c)),
      };
    case "ADD_REVISION":
      return { ...state, revisions: [...state.revisions, action.revision] };
    case "ADD_ASSET":
      return { ...state, assets: [...state.assets, action.asset] };
    case "REPLACE":
      return action.model;
    default:
      return state;
  }
}
