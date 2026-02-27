import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Upload, Download, Loader2, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";

interface Props {
  companyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

interface StudentRow {
  nome: string;
  matricula: string;
  turma: string;
  email: string;
}

export default function BulkStudentImport({ companyId, open, onOpenChange, onImported }: Props) {
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<StudentRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Nome", "Matrícula", "Turma", "E-mail"],
      ["João da Silva", "001", "9A", "joao@email.com"],
      ["Maria Santos", "002", "9B", "maria@email.com"],
    ]);
    ws["!cols"] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 30 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Alunos");
    XLSX.writeFile(wb, "modelo_importacao_alunos.xlsx");
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        // Skip header row
        const headerRow = rows[0]?.map((h: any) => String(h).toLowerCase().trim()) || [];
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
          if (!row || row.every((c: any) => !c)) continue;

          const nome = String(row[nameIdx] || "").trim();
          if (!nome) {
            errs.push(`Linha ${i + 1}: Nome vazio, ignorada.`);
            continue;
          }

          parsed.push({
            nome,
            matricula: rollIdx >= 0 ? String(row[rollIdx] || "").trim() : "",
            turma: classIdx >= 0 ? String(row[classIdx] || "").trim() : "",
            email: emailIdx >= 0 ? String(row[emailIdx] || "").trim() : "",
          });
        }

        // Check duplicates within the file
        const emailsSeen = new Map<string, number>();
        const matriculasSeen = new Map<string, number>();
        for (let i = 0; i < parsed.length; i++) {
          const row = parsed[i];
          if (row.email) {
            const key = row.email.toLowerCase();
            if (emailsSeen.has(key)) {
              errs.push(`E-mail "${row.email}" duplicado nas linhas ${emailsSeen.get(key)! + 2} e ${i + 2}.`);
            } else {
              emailsSeen.set(key, i);
            }
          }
          if (row.matricula) {
            const key = row.matricula.toLowerCase();
            if (matriculasSeen.has(key)) {
              errs.push(`Matrícula "${row.matricula}" duplicada nas linhas ${matriculasSeen.get(key)! + 2} e ${i + 2}.`);
            } else {
              matriculasSeen.set(key, i);
            }
          }
        }

        if (parsed.length === 0) {
          errs.push("Nenhum aluno válido encontrado na planilha.");
        }

        setPreview(parsed);
        setErrors(errs);
      } catch {
        setErrors(["Erro ao ler o arquivo. Verifique se é um arquivo Excel válido."]);
        setPreview([]);
      }
    };
    reader.readAsArrayBuffer(file);
    // Reset input
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleImport = async () => {
    if (preview.length === 0) return;
    setImporting(true);

    // Check duplicates against existing DB records
    const { data: existing } = await (supabase as any)
      .from("students")
      .select("email, roll_number")
      .eq("company_id", companyId);

    if (existing && existing.length > 0) {
      const dbEmails = new Set((existing as any[]).filter((e: any) => e.email).map((e: any) => e.email.toLowerCase()));
      const dbRolls = new Set((existing as any[]).filter((e: any) => e.roll_number).map((e: any) => e.roll_number.toLowerCase()));
      const conflicts: string[] = [];

      for (const s of preview) {
        if (s.email && dbEmails.has(s.email.toLowerCase())) {
          conflicts.push(`E-mail "${s.email}" já cadastrado.`);
        }
        if (s.matricula && dbRolls.has(s.matricula.toLowerCase())) {
          conflicts.push(`Matrícula "${s.matricula}" já cadastrada.`);
        }
      }

      if (conflicts.length > 0) {
        setErrors(conflicts);
        setImporting(false);
        return;
      }
    }

    const payload = preview.map((s) => ({
      name: s.nome,
      roll_number: s.matricula,
      class_group: s.turma,
      email: s.email,
      company_id: companyId,
    }));

    const { error } = await (supabase as any).from("students").insert(payload);

    if (error) {
      toast.error("Erro ao importar: " + error.message);
    } else {
      toast.success(`${preview.length} aluno(s) importados com sucesso!`);
      onImported();
      setPreview([]);
      setErrors([]);
      onOpenChange(false);
    }
    setImporting(false);
  };

  const handleClose = (v: boolean) => {
    if (!v) {
      setPreview([]);
      setErrors([]);
    }
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
          <DialogDescription>
            Importe alunos a partir de uma planilha Excel. Baixe o modelo para seguir o formato correto.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Download template */}
          <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-primary/30 bg-primary/5">
            <Download className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Modelo de Planilha</p>
              <p className="text-xs text-muted-foreground">Baixe e preencha seguindo as colunas: Nome, Matrícula, Turma, E-mail</p>
            </div>
            <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-1.5 shrink-0">
              <Download className="h-3.5 w-3.5" />
              Baixar Modelo
            </Button>
          </div>

          {/* Upload */}
          <div className="space-y-1.5">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFile}
              className="hidden"
              id="bulk-student-file"
            />
            <Button
              variant="outline"
              className="w-full gap-2 h-20 border-dashed"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-5 w-5" />
              <span>Selecionar arquivo Excel (.xlsx, .xls, .csv)</span>
            </Button>
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 space-y-1">
              {errors.map((e, i) => (
                <p key={i} className="text-xs text-destructive flex items-start gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  {e}
                </p>
              ))}
            </div>
          )}

          {/* Preview */}
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
