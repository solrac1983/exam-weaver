import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FolderPlus, Folder, FolderOpen, Pencil, Trash2, ArrowLeft, MoreVertical,
  LayoutGrid, List, Maximize2, Minimize2, Square,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface TemplateFolder {
  id: string;
  name: string;
  color: string;
  itemIds: string[];
}

type FolderSize = "small" | "medium" | "large";
type FolderViewMode = "grid" | "list";

const FOLDER_COLORS = [
  { label: "Cinza", value: "hsl(220 10% 60%)" },
  { label: "Azul", value: "hsl(220 70% 55%)" },
  { label: "Verde", value: "hsl(150 60% 45%)" },
  { label: "Amarelo", value: "hsl(45 90% 50%)" },
  { label: "Vermelho", value: "hsl(0 70% 55%)" },
  { label: "Roxo", value: "hsl(270 60% 55%)" },
  { label: "Laranja", value: "hsl(25 85% 55%)" },
  { label: "Rosa", value: "hsl(330 70% 60%)" },
];

const SIZE_CONFIG: Record<FolderSize, { icon: number; card: string; text: string; countText: string; iconBox: string }> = {
  small: { icon: 20, card: "w-[100px] p-2", text: "text-[10px]", countText: "text-[9px]", iconBox: "h-10 w-10" },
  medium: { icon: 32, card: "w-[140px] p-3", text: "text-xs", countText: "text-[10px]", iconBox: "h-14 w-14" },
  large: { icon: 48, card: "w-[180px] p-4", text: "text-sm", countText: "text-xs", iconBox: "h-20 w-20" },
};

interface TemplateFolderManagerProps {
  folders: TemplateFolder[];
  setFolders: React.Dispatch<React.SetStateAction<TemplateFolder[]>>;
  activeFolderId: string | null;
  setActiveFolderId: (id: string | null) => void;
  itemLabel?: string;
}

export function TemplateFolderManager({
  folders, setFolders, activeFolderId, setActiveFolderId, itemLabel = "modelo",
}: TemplateFolderManagerProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TemplateFolder | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TemplateFolder | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [editColor, setEditColor] = useState(FOLDER_COLORS[1].value);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [folderSize, setFolderSize] = useState<FolderSize>("medium");
  const [folderViewMode, setFolderViewMode] = useState<FolderViewMode>("grid");

  const pluralLabel = itemLabel + "s";

  const handleCreate = () => {
    if (!nameInput.trim()) return;
    const newFolder: TemplateFolder = {
      id: `folder-${Date.now()}`,
      name: nameInput.trim(),
      color: editColor,
      itemIds: [],
    };
    setFolders((prev) => [...prev, newFolder]);
    setNameInput("");
    setEditColor(FOLDER_COLORS[1].value);
    setCreateOpen(false);
    toast.success(`Pasta "${newFolder.name}" criada.`);
  };

  const handleEdit = () => {
    if (!editTarget || !nameInput.trim()) return;
    setFolders((prev) =>
      prev.map((f) => (f.id === editTarget.id ? { ...f, name: nameInput.trim(), color: editColor } : f))
    );
    toast.success(`Pasta "${nameInput.trim()}" atualizada.`);
    setEditTarget(null);
    setNameInput("");
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    setFolders((prev) => prev.filter((f) => f.id !== deleteTarget.id));
    if (activeFolderId === deleteTarget.id) setActiveFolderId(null);
    toast.success(`Pasta "${deleteTarget.name}" excluída.`);
    setDeleteTarget(null);
  };

  const handleDropOnFolder = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    setDragOverId(null);
    const itemId = e.dataTransfer.getData("text/plain");
    if (!itemId) return;
    setFolders((prev) =>
      prev.map((f) => {
        const without = f.itemIds.filter((id) => id !== itemId);
        if (f.id === folderId) {
          if (f.itemIds.includes(itemId)) return f;
          return { ...f, itemIds: [...without, itemId] };
        }
        return { ...f, itemIds: without };
      })
    );
    const folder = folders.find((f) => f.id === folderId);
    toast.success(`Item movido para "${folder?.name}".`);
  };

  const openEditDialog = (folder: TemplateFolder) => {
    setEditTarget(folder);
    setNameInput(folder.name);
    setEditColor(folder.color);
  };

  const activeFolder = folders.find((f) => f.id === activeFolderId);
  const cfg = SIZE_CONFIG[folderSize];

  return (
    <div className="mb-4">
      {activeFolder ? (
        <div className="flex items-center gap-3 glass-card rounded-xl p-3">
          <Button variant="ghost" size="sm" onClick={() => setActiveFolderId(null)} className="gap-1.5 text-xs h-8">
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar
          </Button>
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: activeFolder.color + "20" }}>
              <FolderOpen className="h-5 w-5" style={{ color: activeFolder.color }} />
            </div>
            <div>
              <span className="text-sm font-semibold text-foreground">{activeFolder.name}</span>
              <p className="text-[10px] text-muted-foreground">
                {activeFolder.itemIds.length} {activeFolder.itemIds.length !== 1 ? pluralLabel : itemLabel}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {folders.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Pastas ({folders.length})</span>
              <div className="flex items-center gap-1">
                <Button variant={folderSize === "small" ? "secondary" : "ghost"} size="icon" className="h-7 w-7" title="Pequeno" onClick={() => setFolderSize("small")}>
                  <Minimize2 className="h-3.5 w-3.5" />
                </Button>
                <Button variant={folderSize === "medium" ? "secondary" : "ghost"} size="icon" className="h-7 w-7" title="Médio" onClick={() => setFolderSize("medium")}>
                  <Square className="h-3.5 w-3.5" />
                </Button>
                <Button variant={folderSize === "large" ? "secondary" : "ghost"} size="icon" className="h-7 w-7" title="Grande" onClick={() => setFolderSize("large")}>
                  <Maximize2 className="h-3.5 w-3.5" />
                </Button>
                <div className="h-4 w-px bg-border mx-1" />
                <Button variant={folderViewMode === "grid" ? "secondary" : "ghost"} size="icon" className="h-7 w-7" title="Grade" onClick={() => setFolderViewMode("grid")}>
                  <LayoutGrid className="h-3.5 w-3.5" />
                </Button>
                <Button variant={folderViewMode === "list" ? "secondary" : "ghost"} size="icon" className="h-7 w-7" title="Lista" onClick={() => setFolderViewMode("list")}>
                  <List className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          {folderViewMode === "grid" ? (
            <div className="flex items-start gap-3 flex-wrap">
              {folders.map((folder) => (
                <div
                  key={folder.id}
                  className={cn(
                    "group relative flex flex-col items-center gap-1 rounded-xl border transition-all duration-200",
                    "bg-card hover:bg-accent/40 cursor-pointer select-none",
                    "hover:shadow-lg hover:-translate-y-1",
                    cfg.card,
                    dragOverId === folder.id && "ring-2 ring-primary shadow-xl scale-105 bg-primary/5"
                  )}
                  onClick={() => setActiveFolderId(folder.id)}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverId(folder.id); }}
                  onDragLeave={() => setDragOverId(null)}
                  onDrop={(e) => handleDropOnFolder(e, folder.id)}
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-accent" onClick={(e) => e.stopPropagation()}>
                        <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onClick={() => setActiveFolderId(folder.id)}>
                        <FolderOpen className="h-3.5 w-3.5 mr-2" />Abrir
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => openEditDialog(folder)}>
                        <Pencil className="h-3.5 w-3.5 mr-2" />Editar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteTarget(folder)}>
                        <Trash2 className="h-3.5 w-3.5 mr-2" />Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <div className={cn("rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110", cfg.iconBox)} style={{ backgroundColor: folder.color + "30" }}>
                    <Folder style={{ color: folder.color, width: cfg.icon, height: cfg.icon, fill: folder.color, fillOpacity: 0.25 }} />
                  </div>
                  <span className={cn("font-semibold text-foreground truncate w-full text-center", cfg.text)}>{folder.name}</span>
                  <span className={cn("text-muted-foreground", cfg.countText)}>
                    {folder.itemIds.length} {folder.itemIds.length === 1 ? itemLabel : pluralLabel}
                  </span>
                  {dragOverId === folder.id && <div className="absolute inset-0 rounded-xl border-2 border-dashed border-primary/50 pointer-events-none" />}
                </div>
              ))}

              <div
                className={cn("flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed transition-all cursor-pointer hover:bg-accent/40 hover:border-primary/30 text-muted-foreground hover:text-foreground", cfg.card)}
                onClick={() => { setCreateOpen(true); setNameInput(""); setEditColor(FOLDER_COLORS[1].value); }}
              >
                <div className={cn("flex items-center justify-center", cfg.iconBox)}>
                  <FolderPlus style={{ width: cfg.icon * 0.7, height: cfg.icon * 0.7 }} />
                </div>
                <span className={cn("font-medium", cfg.countText)}>Nova pasta</span>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {folders.map((folder) => (
                <div
                  key={folder.id}
                  className={cn(
                    "group flex items-center gap-3 p-2.5 rounded-lg border transition-all duration-150 cursor-pointer",
                    "bg-card hover:bg-accent/40 hover:shadow-sm",
                    dragOverId === folder.id && "ring-2 ring-primary bg-primary/5"
                  )}
                  onClick={() => setActiveFolderId(folder.id)}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverId(folder.id); }}
                  onDragLeave={() => setDragOverId(null)}
                  onDrop={(e) => handleDropOnFolder(e, folder.id)}
                >
                  <Folder className="h-5 w-5 flex-shrink-0" style={{ color: folder.color, fill: folder.color, fillOpacity: 0.25 }} />
                  <span className="text-sm font-medium text-foreground flex-1 truncate">{folder.name}</span>
                  <span className="text-xs text-muted-foreground mr-2">
                    {folder.itemIds.length} {folder.itemIds.length === 1 ? itemLabel : pluralLabel}
                  </span>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEditDialog(folder); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteTarget(folder); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
              <div
                className="flex items-center gap-3 p-2.5 rounded-lg border border-dashed cursor-pointer hover:bg-accent/40 hover:border-primary/30 text-muted-foreground hover:text-foreground transition-all"
                onClick={() => { setCreateOpen(true); setNameInput(""); setEditColor(FOLDER_COLORS[1].value); }}
              >
                <FolderPlus className="h-5 w-5" />
                <span className="text-sm font-medium">Nova pasta</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FolderPlus className="h-5 w-5 text-primary" />Criar nova pasta</DialogTitle>
            <DialogDescription>Dê um nome e escolha uma cor para a pasta.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Ex: Modelos 1º Bimestre" value={nameInput} onChange={(e) => setNameInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }} autoFocus />
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Cor da pasta</label>
              <div className="flex gap-2 flex-wrap">
                {FOLDER_COLORS.map((c) => (
                  <button key={c.value} className={cn("h-8 w-8 rounded-full border-2 transition-all hover:scale-110", editColor === c.value ? "border-foreground scale-110 shadow-md" : "border-transparent hover:border-muted-foreground/30")} style={{ backgroundColor: c.value }} title={c.label} onClick={() => setEditColor(c.value)} />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!nameInput.trim()}>Criar pasta</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Pencil className="h-5 w-5 text-primary" />Editar pasta</DialogTitle>
            <DialogDescription>Altere o nome e a cor da pasta.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Nome da pasta" value={nameInput} onChange={(e) => setNameInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleEdit(); }} autoFocus />
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Cor da pasta</label>
              <div className="flex gap-2 flex-wrap">
                {FOLDER_COLORS.map((c) => (
                  <button key={c.value} className={cn("h-8 w-8 rounded-full border-2 transition-all hover:scale-110", editColor === c.value ? "border-foreground scale-110 shadow-md" : "border-transparent hover:border-muted-foreground/30")} style={{ backgroundColor: c.value }} title={c.label} onClick={() => setEditColor(c.value)} />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Cancelar</Button>
            <Button onClick={handleEdit} disabled={!nameInput.trim()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pasta "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>Os itens dentro dela voltarão para a visualização principal. Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir pasta</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
