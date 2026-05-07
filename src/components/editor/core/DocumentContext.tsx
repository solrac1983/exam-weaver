/**
 * DocumentContext — React provider that wraps the DocumentModel reducer.
 *
 * Replaces ad-hoc props drilling, `window.dispatchEvent`s and DOM selector
 * lookups across the editor tree. Components opt-in via the typed hooks:
 *
 *   const { model, dispatch } = useDocument();
 *   const layout = usePageLayout();
 *   const { saveStatus, setSaveStatus } = useSaveStatus();
 */
import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  createDocumentModel,
  documentReducer,
  type DocumentAction,
  type DocumentModel,
} from "./DocumentModel";
import { PageLayoutEngine } from "./PageLayoutEngine";

export type SaveStatus = "saved" | "saving" | "unsaved";

interface DocumentContextValue {
  model: DocumentModel;
  dispatch: React.Dispatch<DocumentAction>;
  saveStatus: SaveStatus;
  setSaveStatus: (s: SaveStatus) => void;
  /** Notify the context that a save attempt is starting/ending. */
  markSaving: () => void;
  markSaved: () => void;
  markUnsaved: () => void;
}

const DocumentCtx = createContext<DocumentContextValue | null>(null);

export interface DocumentProviderProps {
  initialModel?: Partial<DocumentModel>;
  children: ReactNode;
}

export function DocumentProvider({ initialModel, children }: DocumentProviderProps) {
  const [model, dispatch] = useReducer(
    documentReducer,
    initialModel,
    createDocumentModel,
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");

  const markSaving = useCallback(() => setSaveStatus("saving"), []);
  const markSaved = useCallback(() => setSaveStatus("saved"), []);
  const markUnsaved = useCallback(() => setSaveStatus("unsaved"), []);

  const value = useMemo<DocumentContextValue>(
    () => ({ model, dispatch, saveStatus, setSaveStatus, markSaving, markSaved, markUnsaved }),
    [model, saveStatus, markSaving, markSaved, markUnsaved],
  );

  return <DocumentCtx.Provider value={value}>{children}</DocumentCtx.Provider>;
}

export function useDocument(): DocumentContextValue {
  const ctx = useContext(DocumentCtx);
  if (!ctx) throw new Error("useDocument must be used inside <DocumentProvider>");
  return ctx;
}

/** Optional variant that returns null instead of throwing — handy during the
 *  incremental migration while not every editor caller is wrapped. */
export function useDocumentOptional(): DocumentContextValue | null {
  return useContext(DocumentCtx);
}

export function usePageLayout(): PageLayoutEngine {
  const { model } = useDocument();
  return useMemo(() => new PageLayoutEngine(model.pageSetup), [model.pageSetup]);
}

export function useSaveStatus() {
  const { saveStatus, markSaving, markSaved, markUnsaved, setSaveStatus } = useDocument();
  return { saveStatus, setSaveStatus, markSaving, markSaved, markUnsaved };
}
