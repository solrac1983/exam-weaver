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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  FolderPlus,
  Folder,
  FolderOpen,
  Pencil,
  Trash2,
  Palette,
  ArrowLeft,
  FileText,
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
  { label: "Cinza", value: "hsl(var(--muted))" , tw: "bg-muted" },
  { label: "Azul", value: "hsl(220 70% 55%)", tw: "bg-blue-500" },
  { label: "Verde", value: "hsl(150 60% 45%)", tw: "bg-emerald-500" },
  { label: "Amarelo", value: "hsl(45 90% 55%)", tw: "bg-yellow-400" },
  { label: "Vermelho", value: "hsl(0 70% 55%)", tw: "bg-red-500" },
  { label: "Roxo", value: "hsl(270 60% 55%)", tw: "bg-purple-500" },
  { label: "Laranja", value: "hsl(25 85% 55%)", tw: "bg-orange-500" },
  { label: "Rosa", value: "hsl(330 70% 60%)", tw: "bg-pink-500" },
];

interface FolderManagerProps {
  folders: ExamFolder[];
  setFolders: React.Dispatch<React.SetStateAction<ExamFolder[]>>;
  activeFolderId: string | null;
  setActiveFolderId: (id: string | null) => void;
  /** Called when user drops an exam into a folder */
  onMoveExam?: (examId: string, folderId: string) => void;
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

  const handleCreate = () => {
    if (!nameInput.trim()) return;
    const newFolder: ExamFolder = {
      id: `folder-${Date.now()}`,
      name: nameInput.trim(),
      color: FOLDER_COLORS[0].value,
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
  };

  const handleDropOnFolder = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    const examId = e.dataTransfer.getData("text/plain");
    if (!examId) return;
    setFolders((prev) =>
      prev.map((f) => {
        // Remove from other folders first
        const without = f.examIds.filter((id) => id !== examId);
        if (f.id === folderId) return { ...f, examIds: [...without, examId] };
        return { ...f, examIds: without };
      })
    );
    toast.success("Prova movida para a pasta.");
  };

  const activeFolder = folders.find((f) => f.id === activeFolderId);

  return (
    <div className="mb-4">
      {/* Folder bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {activeFolderId ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveFolderId(null)}
            className="gap-1.5 text-xs"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar
          </Button>
        ) : null}

        {!activeFolderId && (
          <>
            {folders.map((folder) => (
              <ContextMenu key={folder.id}>
                <ContextMenuTrigger asChild>
                  <div
                    role="button"
                    tabIndex={0}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all hover:shadow-md",
                      "bg-card hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    )}
                    onClick={() => setActiveFolderId(folder.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setActiveFolderId(folder.id);
                      }
                    }}
                    onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                    onDrop={(e) => handleDropOnFolder(e, folder.id)}
                  >
                    <Folder className="h-4 w-4 flex-shrink-0" style={{ color: folder.color }} />
                    <span className="text-xs font-medium text-foreground truncate max-w-[120px]">
                      {folder.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">
                      {folder.examIds.length}
                    </span>
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem onClick={() => { setRenameTarget(folder); setNameInput(folder.name); }}>
                    <Pencil className="h-3.5 w-3.5 mr-2" />
                    Renomear
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => setColorTarget(folder)}>
                    <Palette className="h-3.5 w-3.5 mr-2" />
                    Alterar cor
                  </ContextMenuItem>
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
              className="gap-1.5 text-xs border-dashed"
              onClick={() => { setCreateOpen(true); setNameInput(""); }}
            >
              <FolderPlus className="h-3.5 w-3.5" />
              Nova pasta
            </Button>
          </>
        )}

        {activeFolder && (
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" style={{ color: activeFolder.color }} />
            <span className="text-sm font-semibold text-foreground">{activeFolder.name}</span>
            <span className="text-xs text-muted-foreground">
              ({activeFolder.examIds.length} prova{activeFolder.examIds.length !== 1 ? "s" : ""})
            </span>
          </div>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Criar nova pasta</DialogTitle>
            <DialogDescription>Dê um nome para a nova pasta de provas.</DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Nome da pasta"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!nameInput.trim()}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog open={!!renameTarget} onOpenChange={(open) => { if (!open) setRenameTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Renomear pasta</DialogTitle>
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
            <AlertDialogTitle>Excluir pasta</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a pasta "{deleteTarget?.name}"?
              As provas dentro dela não serão excluídas, apenas a organização será removida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Color picker dialog */}
      <Dialog open={!!colorTarget} onOpenChange={(open) => { if (!open) setColorTarget(null); }}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Cor da pasta</DialogTitle>
            <DialogDescription>Escolha uma cor para identificar a pasta "{colorTarget?.name}".</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-3 py-2">
            {FOLDER_COLORS.map((c) => (
              <button
                key={c.value}
                className={cn(
                  "h-10 w-10 rounded-full border-2 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary mx-auto",
                  colorTarget?.color === c.value ? "border-foreground scale-110" : "border-transparent"
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
