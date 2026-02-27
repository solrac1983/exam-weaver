import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FileEdit, Save, Send, RotateCcw, Eye, CheckCircle2, MessageSquare, Loader2 } from "lucide-react";
import { SimuladoSubject } from "@/hooks/useSimulados";

interface ProfessorEditDialogProps {
  subject: SimuladoSubject | null;
  onClose: () => void;
  onSaveDraft: (id: string, content: string, answerKey: string) => Promise<void>;
  onSubmit: (id: string, content: string, answerKey: string) => Promise<void>;
}

export function ProfessorEditDialog({ subject, onClose, onSaveDraft, onSubmit }: ProfessorEditDialogProps) {
  const [content, setContent] = useState(subject?.content || "");
  const [answerKey, setAnswerKey] = useState(subject?.answer_key || "");
  const [saving, setSaving] = useState(false);

  // Sync state when subject changes
  if (subject && content === "" && subject.content) {
    setContent(subject.content);
    setAnswerKey(subject.answer_key);
  }

  const handleSave = async () => {
    if (!subject) return;
    setSaving(true);
    await onSaveDraft(subject.id, content, answerKey);
    setSaving(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (!subject || !content.trim()) return;
    setSaving(true);
    await onSubmit(subject.id, content, answerKey);
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={!!subject} onOpenChange={(open) => { if (!open) { onClose(); setContent(""); setAnswerKey(""); } }}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileEdit className="h-5 w-5 text-primary" />
            {subject?.subject_name} — {subject?.question_count} questão(ões)
          </DialogTitle>
        </DialogHeader>
        {subject?.revision_notes && subject.status === "revision_requested" && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
            <p className="text-xs font-semibold text-destructive flex items-center gap-1">
              <RotateCcw className="h-3.5 w-3.5" /> Nota da coordenação:
            </p>
            <p className="text-sm text-destructive mt-1">{subject.revision_notes}</p>
          </div>
        )}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Questões (HTML)</Label>
            <Textarea rows={12} placeholder="Cole ou escreva as questões aqui..." value={content} onChange={(e) => setContent(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Gabarito</Label>
            <Textarea rows={4} placeholder="1-A, 2-B, 3-C..." value={answerKey} onChange={(e) => setAnswerKey(e.target.value)} />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar Rascunho
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !content.trim()} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Enviar para Revisão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface RevisionDialogProps {
  subject: SimuladoSubject | null;
  onClose: () => void;
  onRequestRevision: (id: string, notes: string) => Promise<void>;
  onApprove: (id: string) => Promise<void>;
}

export function RevisionDialog({ subject, onClose, onRequestRevision, onApprove }: RevisionDialogProps) {
  const [notes, setNotes] = useState("");

  return (
    <Dialog open={!!subject} onOpenChange={(open) => { if (!open) { onClose(); setNotes(""); } }}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" /> Revisar: {subject?.subject_name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Questões enviadas</Label>
            <div className="mt-1 p-4 rounded-lg border border-border bg-muted/20 prose prose-sm max-w-none text-foreground" dangerouslySetInnerHTML={{ __html: subject?.content || "<p>Sem conteúdo</p>" }} />
          </div>
          {subject?.answer_key && (
            <div>
              <Label className="text-xs text-muted-foreground">Gabarito</Label>
              <p className="mt-1 p-3 rounded-lg border border-border bg-muted/20 text-sm">{subject.answer_key}</p>
            </div>
          )}
          <Separator />
          <div className="space-y-2">
            <Label>Nota de revisão (para devolver ao professor)</Label>
            <Textarea rows={3} placeholder="Descreva o que precisa ser ajustado..." value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => { onRequestRevision(subject!.id, notes); onClose(); setNotes(""); }} className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10">
            <RotateCcw className="h-4 w-4" /> Devolver para Revisão
          </Button>
          <Button className="gap-2 bg-green-600 hover:bg-green-700" onClick={() => { onApprove(subject!.id); onClose(); }}>
            <CheckCircle2 className="h-4 w-4" /> Aprovar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface AnnouncementDialogProps {
  simId: string | null;
  initialText: string;
  onClose: () => void;
  onSave: (simId: string, text: string) => Promise<void>;
}

export function AnnouncementDialog({ simId, initialText, onClose, onSave }: AnnouncementDialogProps) {
  const [text, setText] = useState(initialText);

  // Sync when dialog opens with new text
  if (simId && text === "" && initialText) {
    setText(initialText);
  }

  const handleSave = async () => {
    if (!simId) return;
    await onSave(simId, text);
  };

  const handleSend = async () => {
    await handleSave();
    onClose();
    setText("");
  };

  return (
    <Dialog open={!!simId} onOpenChange={(open) => { if (!open) { onClose(); setText(""); } }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" /> Comunicado aos Professores
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Label>Mensagem</Label>
          <Textarea rows={6} placeholder="Escreva o comunicado..." value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleSave} className="gap-2"><Save className="h-4 w-4" /> Salvar</Button>
          <Button onClick={handleSend} className="gap-2"><Send className="h-4 w-4" /> Enviar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
