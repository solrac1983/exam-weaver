import { Editor } from "@tiptap/react";
import { cn } from "@/lib/utils";
import { ChartEditorTab, isChartImage, parseChartData, serializeChartData, chartDataToImageSrc, type ChartData } from "./ChartEditorTab";
import type { HeaderFooterConfig } from "./PageHeaderFooterOverlay";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Type, ImagePlus, LayoutTemplate, Eye, ImageIcon, BarChart3, Table,
} from "lucide-react";

// Modular tab components
import { HomeTab } from "./ribbon/HomeTab";
import { InsertTab } from "./ribbon/InsertTab";
import { LayoutTab } from "./ribbon/LayoutTab";
import { ViewTab } from "./ribbon/ViewTab";
import { ImageTab } from "./ribbon/ImageTab";
import { TableTab } from "./ribbon/TableTab";

type TabId = "home" | "insert" | "layout" | "view" | "image" | "chart" | "table";

const tabs: { id: TabId; label: string; icon: React.ElementType; contextual?: boolean }[] = [
  { id: "home", label: "Página Inicial", icon: Type },
  { id: "insert", label: "Inserir", icon: ImagePlus },
  { id: "layout", label: "Layout", icon: LayoutTemplate },
  { id: "view", label: "Exibição", icon: Eye },
  { id: "image", label: "Formato de Imagem", icon: ImageIcon, contextual: true },
  { id: "chart", label: "Editar Gráficos", icon: BarChart3, contextual: true },
  { id: "table", label: "Tabela", icon: Table, contextual: true },
];

interface EditorRibbonProps {
  editor: Editor;
  zoom: number;
  onZoomChange: (z: number) => void;
  showDataPanel?: boolean;
  onToggleDataPanel?: () => void;
  onChartDataChange?: (data: ChartData | null) => void;
  onChartUpdate?: (data: ChartData) => void;
  showComments?: boolean;
  onToggleComments?: () => void;
  headerFooterConfig?: HeaderFooterConfig;
  onHeaderFooterConfigChange?: (config: HeaderFooterConfig) => void;
  headerLeft?: React.ReactNode;
  headerRight?: React.ReactNode;
  onAIReview?: () => void;
  isAIReviewLoading?: boolean;
}

export function EditorRibbon({ editor, zoom, onZoomChange, showDataPanel, onToggleDataPanel, onChartDataChange, onChartUpdate, showComments, onToggleComments, headerFooterConfig, onHeaderFooterConfigChange, headerLeft, headerRight }: EditorRibbonProps) {
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hasImageSelected, setHasImageSelected] = useState(false);
  const [hasChartSelected, setHasChartSelected] = useState(false);
  const [hasTableSelected, setHasTableSelected] = useState(false);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [imageAttrs, setImageAttrs] = useState<any>(null);
  const [widthInput, setWidthInput] = useState("");
  const [heightInput, setHeightInput] = useState("");

  // Image selection detection
  const getSelectedImageNode = useCallback(() => {
    const { selection } = editor.state;
    if (selection && (selection as any).node?.type?.name === "image") return (selection as any).node;
    return null;
  }, [editor]);

  const updateImageAttr = useCallback((attrs: Record<string, any>) => {
    const { state } = editor;
    const { selection } = state;
    if (selection && (selection as any).node?.type?.name === "image") {
      const pos = (selection as any).from;
      const tr = state.tr.setNodeMarkup(pos, undefined, { ...(selection as any).node.attrs, ...attrs });
      editor.view.dispatch(tr);
    }
  }, [editor]);

  useEffect(() => {
    const handler = () => {
      const node = getSelectedImageNode();
      const isInTable = editor.isActive("table");

      if (node) {
        setHasImageSelected(true);
        setHasTableSelected(false);
        setImageAttrs(node.attrs);
        setWidthInput(String(node.attrs.customWidth || ""));
        setHeightInput(String(node.attrs.customHeight || ""));
        const cd = isChartImage(node.attrs.alt) ? parseChartData(node.attrs.alt) : null;
        if (cd) {
          setHasChartSelected(true); setChartData(cd); onChartDataChange?.(cd); setActiveTab("chart");
        } else {
          setHasChartSelected(false); setChartData(null); onChartDataChange?.(null); setActiveTab("image");
        }
      } else if (isInTable) {
        setHasImageSelected(false); setHasChartSelected(false); setChartData(null); onChartDataChange?.(null); setImageAttrs(null);
        setHasTableSelected(true);
        if (activeTab === "image" || activeTab === "chart") setActiveTab("table");
        if (activeTab !== "table" && activeTab !== "home" && activeTab !== "insert" && activeTab !== "layout" && activeTab !== "view") setActiveTab("table");
      } else {
        setHasImageSelected(false); setHasChartSelected(false); setHasTableSelected(false); setChartData(null); onChartDataChange?.(null); setImageAttrs(null);
        if (activeTab === "image" || activeTab === "chart" || activeTab === "table") setActiveTab("home");
      }
    };
    editor.on("selectionUpdate", handler);
    editor.on("transaction", handler);
    handler();
    return () => { editor.off("selectionUpdate", handler); editor.off("transaction", handler); };
  }, [editor, getSelectedImageNode, activeTab]);

  // Actions
  const addImage = () => fileInputRef.current?.click();
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { if (reader.result) (editor.commands as any).setImage({ src: reader.result as string }); };
    reader.readAsDataURL(file);
    e.target.value = "";
  };
  const addImageFromUrl = () => {
    const url = prompt("Cole a URL da imagem:");
    if (url) (editor.commands as any).setImage({ src: url });
  };
  const insertFormula = () => { (editor.commands as any).insertFormula({ formula: "x^2 + y^2 = z^2" }); };
  const addTable = () => { editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); };

  // Image helpers
  const applyPreset = (w: number) => {
    const imgEl = document.querySelector(`.ProseMirror img[src="${imageAttrs?.src}"]`) as HTMLImageElement;
    const ratio = imgEl ? imgEl.naturalWidth / imgEl.naturalHeight : 1;
    const h = Math.round(w / ratio);
    setWidthInput(String(w)); setHeightInput(String(h));
    updateImageAttr({ customWidth: w, customHeight: h });
  };
  const handleWidthChange = (val: string) => {
    setWidthInput(val);
    const w = parseInt(val);
    if (w > 0) {
      const imgEl = document.querySelector(`.ProseMirror img[src="${imageAttrs?.src}"]`) as HTMLImageElement;
      const ratio = imgEl ? imgEl.naturalWidth / imgEl.naturalHeight : 1;
      const h = Math.round(w / ratio);
      setHeightInput(String(h));
      updateImageAttr({ customWidth: w, customHeight: h });
    }
  };
  const handleHeightChange = (val: string) => {
    setHeightInput(val);
    const h = parseInt(val);
    if (h > 0) {
      const imgEl = document.querySelector(`.ProseMirror img[src="${imageAttrs?.src}"]`) as HTMLImageElement;
      const ratio = imgEl ? imgEl.naturalWidth / imgEl.naturalHeight : 1;
      const w = Math.round(h * ratio);
      setWidthInput(String(w));
      updateImageAttr({ customWidth: w, customHeight: h });
    }
  };

  const handleChartUpdate = useCallback((newData: ChartData) => {
    setChartData(newData); onChartDataChange?.(newData); onChartUpdate?.(newData);
    const src = chartDataToImageSrc(newData, imageAttrs?.customWidth || 400, imageAttrs?.customHeight || 260);
    const alt = serializeChartData(newData);
    updateImageAttr({ src, alt });
  }, [imageAttrs, updateImageAttr, onChartDataChange, onChartUpdate]);

  useEffect(() => {
    const handler = (e: Event) => {
      const data = (e as CustomEvent<ChartData>).detail;
      if (data) handleChartUpdate(data);
    };
    window.addEventListener('chart-data-update', handler);
    return () => window.removeEventListener('chart-data-update', handler);
  }, [handleChartUpdate]);

  const visibleTabs = tabs.filter((t) => !t.contextual || (t.id === "image" && hasImageSelected && !hasChartSelected) || (t.id === "chart" && hasChartSelected) || (t.id === "table" && hasTableSelected));

  return (
    <div className="word-ribbon overflow-visible relative">
      {/* ─── Tab bar with optional header content ─── */}
      <div className="word-ribbon-tabs flex items-center gap-0 px-1 pt-0.5">
        {headerLeft && <div className="flex items-center mr-2">{headerLeft}</div>}
        {visibleTabs.map((tab) => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "word-ribbon-tab flex items-center gap-1 rounded-t -mb-px",
                activeTab === tab.id && "active",
                tab.contextual && activeTab === tab.id && "!text-accent !border-accent",
              )}
            >
              <TabIcon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
        {headerRight && <div className="flex items-center ml-auto gap-1.5">{headerRight}</div>}
      </div>

      {/* ─── Tab content ─── */}
      <div className="word-ribbon-content flex items-end gap-0 px-1.5 py-1.5 relative overflow-visible flex-wrap">
        {activeTab === "home" && <HomeTab editor={editor} />}
        {activeTab === "insert" && (
          <InsertTab editor={editor} addImage={addImage} addImageFromUrl={addImageFromUrl} addTable={addTable} insertFormula={insertFormula} showComments={showComments} onToggleComments={onToggleComments} headerFooterConfig={headerFooterConfig} onHeaderFooterConfigChange={onHeaderFooterConfigChange} />
        )}
        {activeTab === "layout" && <LayoutTab editor={editor} />}
        {activeTab === "view" && <ViewTab zoom={zoom} onZoomChange={onZoomChange} editor={editor} />}
        {activeTab === "image" && imageAttrs && (
          <ImageTab
            editor={editor} imageAttrs={imageAttrs} updateImageAttr={updateImageAttr}
            widthInput={widthInput} heightInput={heightInput}
            handleWidthChange={handleWidthChange} handleHeightChange={handleHeightChange}
            applyPreset={applyPreset}
          />
        )}
        {activeTab === "chart" && chartData && (
          <ChartEditorTab chartData={chartData} onUpdate={handleChartUpdate} showDataPanel={showDataPanel} onToggleDataPanel={onToggleDataPanel} />
        )}
        {activeTab === "table" && <TableTab editor={editor} />}
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
    </div>
  );
}
