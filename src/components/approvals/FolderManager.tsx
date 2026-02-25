import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FolderPlus,
  Folder,
  FolderOpen,
  Pencil,
  Trash2,
  Palette,
  ArrowLeft,
  GripVertical,
  FolderInput,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface ExamFolder {
  id: string;
  name: string;
  color: string;
  examIds: string[];
}

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

interface FolderManagerProps {
  folders: ExamFolder[];
  setFolders: React.Dispatch<React.SetStateAction<ExamFolder[]>>;
  activeFolderId: string | null;
  setActiveFolderId: (id: string | null) => void;
}

export function FolderManager({
  folders,
  setFolders,
  activeFolderId,
  setActiveFolderId,
}: FolderManagerProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<ExamFolder | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExamFolder | null>(null);
  const [colorTarget, setColorTarget] = useState<ExamFolder | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const handleCreate = () => {
    if (!nameInput.trim()) return;
    const newFolder: ExamFolder = {
      id: `folder-${Date.now()}`,
      name: nameInput.trim(),
      color: FOLDER_COLORS[1].value,
      examIds: [],
    };
    setFolders((prev) => [...prev, newFolder]);
    setNameInput("");
    setCreateOpen(false);
    toast.success(`Pasta "${newFolder.name}" criada.`);
  };

  const handleRename = () => {
    if (!renameTarget || !nameInput.trim()) return;
    setFolders((prev) =>
      prev.map((f) => (f.id === renameTarget.id ? { ...f, name: nameInput.trim() } : f))
    );
    toast.success(`Pasta renomeada para "${nameInput.trim()}".`);
    setRenameTarget(null);
    setNameInput("");
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    setFolders((prev) => prev.filter((f) => f.id !== deleteTarget.id));
    if (activeFolderId === deleteTarget.id) setActiveFolderId(null);
    toast.success(`Pasta "${deleteTarget.name}" excluída.`);
    setDeleteTarget(null);
  };

  const handleColorChange = (color: string) => {
    if (!colorTarget) return;
    setFolders((prev) =>
      prev.map((f) => (f.id === colorTarget.id ? { ...f, color } : f))
    );
    setColorTarget(null);
    toast.success("Cor da pasta alterada.");
  };

  const handleDropOnFolder = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    setDragOverId(null);
    const examId = e.dataTransfer.getData("text/plain");
    if (!examId) return;
    setFolders((prev) =>
      prev.map((f) => {
        const without = f.examIds.filter((id) => id !== examId);
        if (f.id === folderId) {
          if (f.examIds.includes(examId)) return f;
          return { ...f, examIds: [...without, examId] };
        }
        return { ...f, examIds: without };
      })
    );
    const folder = folders.find((f) => f.id === folderId);
    toast.success(`Prova movida para "${folder?.name}".`);
  };

  const activeFolder = folders.find((f) => f.id === activeFolderId);

  return (
    <div className="mb-4">
      {/* Active folder header */}
      {activeFolder ? (
        <div className="flex items-center gap-3 glass-card rounded-xl p-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveFolderId(null)}
            className="gap-1.5 text-xs h-8"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar
          </Button>
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center gap-2.5">
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: activeFolder.color + "20" }}
            >
              <FolderOpen className="h-4 w-4" style={{ color: activeFolder.color }} />
            </div>
            <div>
              <span className="text-sm font-semibold text-foreground">{activeFolder.name}</span>
              <p className="text-[10px] text-muted-foreground">
                {activeFolder.examIds.length} prova{activeFolder.examIds.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Folder grid */
        <div className="flex items-center gap-3 flex-wrap">
          {folders.map((folder) => (
            <ContextMenu key={folder.id}>
              <ContextMenuTrigger asChild>
                <div
                  role="button"
                  tabIndex={0}
                  className={cn(
                    "group relative flex items-center gap-2.5 pl-3 pr-4 py-2.5 rounded-xl border transition-all duration-200",
                    "bg-card hover:bg-accent/40 cursor-pointer",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    "hover:shadow-md hover:-translate-y-0.5",
                    dragOverId === folder.id && "ring-2 ring-primary shadow-lg scale-[1.03] bg-primary/5"
                  )}
                  onClick={() => setActiveFolderId(folder.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setActiveFolderId(folder.id);
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    setDragOverId(folder.id);
                  }}
                  onDragLeave={() => setDragOverId(null)}
                  onDrop={(e) => handleDropOnFolder(e, folder.id)}
                >
                  <div
                    className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                    style={{ backgroundColor: folder.color + "20" }}
                  >
                    <Folder className="h-4.5 w-4.5" style={{ color: folder.color }} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-foreground truncate block max-w-[100px]">
                      {folder.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {folder.examIds.length} {folder.examIds.length === 1 ? "prova" : "provas"}
                    </span>
                  </div>
                  {dragOverId === folder.id && (
                    <div className="absolute inset-0 rounded-xl border-2 border-dashed border-primary/50 pointer-events-none" />
                  )}
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent className="w-48">
                <ContextMenuItem onClick={() => setActiveFolderId(folder.id)}>
                  <FolderOpen className="h-3.5 w-3.5 mr-2" />
                  Abrir pasta
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={() => { setRenameTarget(folder); setNameInput(folder.name); }}>
                  <Pencil className="h-3.5 w-3.5 mr-2" />
                  Renomear
                </ContextMenuItem>
                <ContextMenuItem onClick={() => setColorTarget(folder)}>
                  <Palette className="h-3.5 w-3.5 mr-2" />
                  Alterar cor
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleteTarget(folder)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  Excluir
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          ))}

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs border-dashed h-[58px] px-4 rounded-xl hover:bg-accent/40 hover:border-primary/30 transition-all"
            onClick={() => { setCreateOpen(true); setNameInput(""); }}
          >
            <FolderPlus className="h-4 w-4" />
            Nova pasta
          </Button>
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderPlus className="h-5 w-5 text-primary" />
              Criar nova pasta
            </DialogTitle>
            <DialogDescription>Dê um nome para organizar suas provas.</DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Ex: Provas 1º Bimestre"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!nameInput.trim()}>Criar pasta</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog open={!!renameTarget} onOpenChange={(open) => { if (!open) setRenameTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              Renomear pasta
            </DialogTitle>
            <DialogDescription>Escolha um novo nome para a pasta.</DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Novo nome"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleRename(); }}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>Cancelar</Button>
            <Button onClick={handleRename} disabled={!nameInput.trim()}>Renomear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pasta "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              As provas dentro dela voltarão para a visualização principal. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir pasta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Color picker dialog */}
      <Dialog open={!!colorTarget} onOpenChange={(open) => { if (!open) setColorTarget(null); }}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              Cor da pasta
            </DialogTitle>
            <DialogDescription>Escolha uma cor para "{colorTarget?.name}".</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-4 py-3 justify-items-center">
            {FOLDER_COLORS.map((c) => (
              <button
                key={c.value}
                className={cn(
                  "h-10 w-10 rounded-full border-2 transition-all hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  colorTarget?.color === c.value ? "border-foreground scale-110 shadow-md" : "border-transparent hover:border-muted-foreground/30"
                )}
                style={{ backgroundColor: c.value }}
                title={c.label}
                onClick={() => handleColorChange(c.value)}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
