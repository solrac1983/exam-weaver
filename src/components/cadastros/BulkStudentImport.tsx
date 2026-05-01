import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Upload, Download, Loader2, FileSpreadsheet, CheckCircle2, AlertCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { readSpreadsheetFile, downloadCSVTemplate } from "@/lib/spreadsheetUtils";
import { showInvokeError, showInvokeSuccess } from "@/lib/invokeFunction";

interface Props {
  companyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
  classGroups?: string[];
}

interface StudentRow {
  nome: string;
  matricula: string;
  turma: string;
  email: string;
}

export default function BulkStudentImport({ companyId, open, onOpenChange, onImported, classGroups = [] }: Props) {
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<StudentRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [skippedCount, setSkippedCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    downloadCSVTemplate(
      [
        ["Nome", "Matrícula", "Turma", "E-mail"],
        ["João da Silva", "001", classGroups[0] || "9A", "joao@email.com"],
        ["Maria Santos", "002", classGroups[1] || "9B", "maria@email.com"],
      ],
      "modelo_importacao_alunos.csv"
    );
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const rows = await readSpreadsheetFile(file);

      const headerRow = rows[0]?.map((h) => String(h).toLowerCase().trim()) || [];
      const nameIdx = headerRow.findIndex((h) => h.includes("nome"));
      const rollIdx = headerRow.findIndex((h) => h.includes("matr") || h.includes("número") || h.includes("numero"));
      const classIdx = headerRow.findIndex((h) => h.includes("turma"));
      const emailIdx = headerRow.findIndex((h) => h.includes("mail"));

      if (nameIdx === -1) {
        setErrors(["Coluna 'Nome' não encontrada na planilha."]);
        setPreview([]);
        return;
      }

      const parsed: StudentRow[] = [];
      const errs: string[] = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.every((c) => !c)) continue;

        const nome = String(row[nameIdx] || "").trim();
        if (!nome) { errs.push(`Linha ${i + 1}: Nome vazio, ignorada.`); continue; }

        parsed.push({
          nome,
          matricula: rollIdx >= 0 ? String(row[rollIdx] || "").trim() : "",
          turma: classIdx >= 0 ? String(row[classIdx] || "").trim() : "",
          email: emailIdx >= 0 ? String(row[emailIdx] || "").trim() : "",
        });
      }

      const fileWarnings: string[] = [];
      const uniqueParsed: StudentRow[] = [];
      const seenEmailSet = new Set<string>();
      const seenRollSet = new Set<string>();

      for (let i = 0; i < parsed.length; i++) {
        const row = parsed[i];
        let isDuplicate = false;

        if (row.email) {
          const key = row.email.toLowerCase();
          if (seenEmailSet.has(key)) {
            fileWarnings.push(`Linha ${i + 2}: E-mail "${row.email}" duplicado — será ignorado.`);
            isDuplicate = true;
          } else { seenEmailSet.add(key); }
        }
        if (row.matricula && !isDuplicate) {
          const key = row.matricula.toLowerCase();
          if (seenRollSet.has(key)) {
            fileWarnings.push(`Linha ${i + 2}: Matrícula "${row.matricula}" duplicada — será ignorada.`);
            isDuplicate = true;
          } else { seenRollSet.add(key); }
        }

        if (!isDuplicate) uniqueParsed.push(row);
      }

      if (uniqueParsed.length === 0) errs.push("Nenhum aluno válido encontrado na planilha.");

      setPreview(uniqueParsed);
      setErrors(errs);
      setWarnings(fileWarnings);
      setSkippedCount(parsed.length - uniqueParsed.length);
    } catch (err: any) {
      setErrors([err.message || "Erro ao ler o arquivo."]); setPreview([]); setWarnings([]);
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleImport = async () => {
    if (preview.length === 0) return;
    setImporting(true);

    const { data: existing } = await (supabase as any)
      .from("students").select("email, roll_number").eq("company_id", companyId);

    let toImport = [...preview];
    const dbSkipped: string[] = [];

    if (existing && existing.length > 0) {
      const dbEmails = new Set((existing as any[]).filter((e: any) => e.email).map((e: any) => e.email.toLowerCase()));
      const dbRolls = new Set((existing as any[]).filter((e: any) => e.roll_number).map((e: any) => e.roll_number.toLowerCase()));

      toImport = preview.filter((s) => {
        if (s.email && dbEmails.has(s.email.toLowerCase())) { dbSkipped.push(`"${s.nome}" — e-mail já cadastrado`); return false; }
        if (s.matricula && dbRolls.has(s.matricula.toLowerCase())) { dbSkipped.push(`"${s.nome}" — matrícula já cadastrada`); return false; }
        return true;
      });
    }

    if (toImport.length === 0) {
      toast.info("Todos os alunos da planilha já estão cadastrados.");
      setWarnings(dbSkipped);
      setImporting(false);
      return;
    }

    const payload = toImport.map((s) => ({
      name: s.nome, roll_number: s.matricula, class_group: s.turma, email: s.email, company_id: companyId,
    }));

    const { error } = await (supabase as any).from("students").insert(payload);

    if (error) {
      showInvokeError("Erro ao importar: " + error.message);
    } else {
      const skippedMsg = dbSkipped.length > 0 ? ` (${dbSkipped.length} duplicado(s) ignorado(s))` : "";
      showInvokeSuccess(`${toImport.length} aluno(s) importados com sucesso!${skippedMsg}`);
      onImported();
      setPreview([]); setErrors([]); setWarnings([]); setSkippedCount(0);
      onOpenChange(false);
    }
    setImporting(false);
  };

  const handleClose = (v: boolean) => {
    if (!v) { setPreview([]); setErrors([]); setWarnings([]); setSkippedCount(0); }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Importar Alunos em Lote
          </DialogTitle>
          <DialogDescription>Importe alunos a partir de um arquivo CSV. Baixe o modelo para seguir o formato correto.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-primary/30 bg-primary/5">
            <Download className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Modelo de Planilha</p>
              <p className="text-xs text-muted-foreground">Colunas: Nome, Matrícula, Turma, E-mail</p>
            </div>
            <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-1.5 shrink-0">
              <Download className="h-3.5 w-3.5" />Baixar Modelo
            </Button>
          </div>

          <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} className="hidden" id="bulk-student-file" />
          <Button variant="outline" className="w-full gap-2 h-20 border-dashed" onClick={() => fileRef.current?.click()}>
            <Upload className="h-5 w-5" /><span>Selecionar arquivo CSV</span>
          </Button>

          {errors.length > 0 && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 space-y-1">
              {errors.map((e, i) => (
                <p key={i} className="text-xs text-destructive flex items-start gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />{e}
                </p>
              ))}
            </div>
          )}
          {warnings.length > 0 && (
            <div className="p-3 rounded-lg bg-accent/50 border border-accent space-y-1">
              <p className="text-xs font-medium text-foreground flex items-center gap-1.5 mb-1">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                {skippedCount} duplicado(s) serão ignorados:
              </p>
              {warnings.map((w, i) => <p key={i} className="text-xs text-muted-foreground ml-5">{w}</p>)}
            </div>
          )}

          {preview.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <p className="text-sm font-medium text-foreground">{preview.length} aluno(s) prontos para importar</p>
              </div>
              <div className="rounded-lg border overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left px-3 py-2 font-semibold">#</th>
                      <th className="text-left px-3 py-2 font-semibold">Nome</th>
                      <th className="text-left px-3 py-2 font-semibold">Matrícula</th>
                      <th className="text-left px-3 py-2 font-semibold">Turma</th>
                      <th className="text-left px-3 py-2 font-semibold">E-mail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((s, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                        <td className="px-3 py-1.5">{s.nome}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{s.matricula || "—"}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{s.turma || "—"}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{s.email || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>Cancelar</Button>
          <Button onClick={handleImport} disabled={importing || preview.length === 0} className="gap-1.5">
            {importing && <Loader2 className="h-4 w-4 animate-spin" />}
            Importar {preview.length > 0 ? `${preview.length} aluno(s)` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}