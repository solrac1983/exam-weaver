import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
import { showInvokeError, showInvokeSuccess } from "@/lib/invokeFunction";
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Upload, Download, Loader2, FileSpreadsheet, CheckCircle2, AlertCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { readSpreadsheetFile, downloadCSVTemplate } from "@/lib/spreadsheetUtils";

interface Props {
  companyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
  segmentOptions?: string[];
  gradeOptions?: string[];
  shiftOptions?: string[];
}

interface ClassGroupRow {
  nome: string;
  segmento: string;
  serie: string;
  turno: string;
  ano: number;
}

export default function BulkClassGroupImport({ companyId, open, onOpenChange, onImported, segmentOptions = [], gradeOptions = [], shiftOptions = [] }: Props) {
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<ClassGroupRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [skippedCount, setSkippedCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    downloadCSVTemplate(
      [
        ["Nome", "Segmento", "Série", "Turno", "Ano"],
        ["1ºA", segmentOptions[0] || "Fundamental", gradeOptions[0] || "1º Ano", shiftOptions[0] || "Manhã", 2026],
        ["2ºB", segmentOptions[0] || "Fundamental", gradeOptions[1] || "2º Ano", shiftOptions[1] || "Tarde", 2026],
      ],
      "modelo_importacao_turmas.csv"
    );
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const rows = await readSpreadsheetFile(file);

      const headerRow = rows[0]?.map((h) => String(h).toLowerCase().trim()) || [];
      const nameIdx = headerRow.findIndex((h) => h.includes("nome"));
      const segIdx = headerRow.findIndex((h) => h.includes("segmento"));
      const serIdx = headerRow.findIndex((h) => h.includes("série") || h.includes("serie"));
      const shiftIdx = headerRow.findIndex((h) => h.includes("turno"));
      const yearIdx = headerRow.findIndex((h) => h.includes("ano"));

      if (nameIdx === -1) {
        setErrors(["Coluna 'Nome' não encontrada na planilha."]);
        setPreview([]);
        return;
      }

      const parsed: ClassGroupRow[] = [];
      const errs: string[] = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.every((c) => !c)) continue;

        const nome = String(row[nameIdx] || "").trim();
        if (!nome) { errs.push(`Linha ${i + 1}: Nome vazio, ignorada.`); continue; }

        const segmento = segIdx >= 0 ? String(row[segIdx] || "").trim() : "";
        const serie = serIdx >= 0 ? String(row[serIdx] || "").trim() : "";
        const turno = shiftIdx >= 0 ? String(row[shiftIdx] || "").trim() : "";
        const ano = yearIdx >= 0 ? Number(row[yearIdx]) || 2026 : 2026;

        if (!segmento || !serie || !turno) {
          errs.push(`Linha ${i + 1}: "${nome}" — Segmento, Série e Turno são obrigatórios.`);
          continue;
        }

        parsed.push({ nome, segmento, serie, turno, ano });
      }

      const fileWarnings: string[] = [];
      const seenNames = new Set<string>();
      const uniqueParsed: ClassGroupRow[] = [];

      for (const cg of parsed) {
        const key = cg.nome.toLowerCase();
        if (seenNames.has(key)) {
          fileWarnings.push(`"${cg.nome}" duplicado na planilha — será ignorado.`);
        } else {
          seenNames.add(key);
          uniqueParsed.push(cg);
        }
      }

      if (uniqueParsed.length === 0 && errs.length === 0) {
        errs.push("Nenhuma turma válida encontrada na planilha.");
      }

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

    const { data: existing } = await supabase
      .from("class_groups").select("name").eq("company_id", companyId);

    let toImport = [...preview];
    const dbSkipped: string[] = [];

    if (existing && existing.length > 0) {
      const dbNames = new Set(existing.map((e) => e.name.toLowerCase()));
      toImport = preview.filter((cg) => {
        if (dbNames.has(cg.nome.toLowerCase())) {
          dbSkipped.push(`"${cg.nome}" — já cadastrada`);
          return false;
        }
        return true;
      });
    }

    if (toImport.length === 0) {
      toast.info("Todas as turmas da planilha já estão cadastradas.");
      setWarnings(dbSkipped);
      setImporting(false);
      return;
    }

    const payload = toImport.map((cg) => ({
      name: cg.nome, segment: cg.segmento, grade: cg.serie, shift: cg.turno, year: cg.ano, company_id: companyId,
    }));

    const { error } = await supabase.from("class_groups").insert(payload);

    if (error) {
      showInvokeError("Erro ao importar: " + error.message);
    } else {
      const skippedMsg = dbSkipped.length > 0 ? ` (${dbSkipped.length} duplicada(s) ignorada(s))` : "";
      showInvokeSuccess(`${toImport.length} turma(s) importada(s) com sucesso!${skippedMsg}`);
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
            Importar Turmas em Lote
          </DialogTitle>
          <DialogDescription>Importe turmas a partir de um arquivo CSV. Baixe o modelo para seguir o formato correto.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-primary/30 bg-primary/5">
            <Download className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Modelo de Planilha</p>
              <p className="text-xs text-muted-foreground">Colunas: Nome, Segmento, Série, Turno, Ano</p>
            </div>
            <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-1.5 shrink-0">
              <Download className="h-3.5 w-3.5" />Baixar Modelo
            </Button>
          </div>

          <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} className="hidden" id="bulk-classgroup-file" />
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
                {skippedCount} duplicada(s) serão ignoradas:
              </p>
              {warnings.map((w, i) => <p key={i} className="text-xs text-muted-foreground ml-5">{w}</p>)}
            </div>
          )}

          {preview.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <p className="text-sm font-medium text-foreground">{preview.length} turma(s) prontas para importar</p>
              </div>
              <div className="rounded-lg border overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left px-3 py-2 font-semibold">#</th>
                      <th className="text-left px-3 py-2 font-semibold">Nome</th>
                      <th className="text-left px-3 py-2 font-semibold">Segmento</th>
                      <th className="text-left px-3 py-2 font-semibold">Série</th>
                      <th className="text-left px-3 py-2 font-semibold">Turno</th>
                      <th className="text-left px-3 py-2 font-semibold">Ano</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((cg, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                        <td className="px-3 py-1.5 font-medium">{cg.nome}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{cg.segmento}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{cg.serie}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{cg.turno}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{cg.ano}</td>
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
            Importar {preview.length > 0 ? `${preview.length} turma(s)` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}