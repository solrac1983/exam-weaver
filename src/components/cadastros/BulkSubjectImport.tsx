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
}

interface SubjectRow { name: string; code: string; area: string; }

const areaOptions = ["Linguagens", "Matemática", "Ciências da Natureza", "Ciências Humanas"];

export default function BulkSubjectImport({ companyId, open, onOpenChange, onImported }: Props) {
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<SubjectRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    downloadCSVTemplate(
      [
        ["Nome", "Código", "Área"],
        ["Matemática", "MAT", "Matemática"],
        ["Português", "PORT", "Linguagens"],
      ],
      "modelo_importacao_disciplinas.csv"
    );
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rows = await readSpreadsheetFile(file);

      const headerRow = rows[0]?.map((h) => String(h).toLowerCase().trim()) || [];
      const nameIdx = headerRow.findIndex((h) => h.includes("nome"));
      const codeIdx = headerRow.findIndex((h) => h.includes("código") || h.includes("codigo") || h.includes("code"));
      const areaIdx = headerRow.findIndex((h) => h.includes("área") || h.includes("area"));

      if (nameIdx === -1) { setErrors(["Coluna 'Nome' não encontrada."]); setPreview([]); return; }

      const parsed: SubjectRow[] = [];
      const errs: string[] = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.every((c) => !c)) continue;
        const name = String(row[nameIdx] || "").trim();
        if (!name) { errs.push(`Linha ${i + 1}: Nome vazio.`); continue; }
        const code = codeIdx >= 0 ? String(row[codeIdx] || "").trim().toUpperCase() : "";
        const area = areaIdx >= 0 ? String(row[areaIdx] || "").trim() : "";
        if (!code) { errs.push(`Linha ${i + 1}: "${name}" — Código obrigatório.`); continue; }
        parsed.push({ name, code, area });
      }

      const seen = new Set<string>();
      const unique: SubjectRow[] = [];
      const fileWarnings: string[] = [];
      for (const s of parsed) {
        const key = s.name.toLowerCase();
        if (seen.has(key)) { fileWarnings.push(`"${s.name}" duplicado.`); }
        else { seen.add(key); unique.push(s); }
      }

      if (unique.length === 0 && errs.length === 0) errs.push("Nenhuma disciplina válida encontrada.");
      setPreview(unique);
      setErrors(errs);
      setWarnings(fileWarnings);
    } catch (err: any) {
      setErrors([err.message || "Erro ao ler o arquivo."]); setPreview([]); setWarnings([]);
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleImport = async () => {
    if (preview.length === 0) return;
    setImporting(true);

    const { data: existing } = await supabase.from("subjects").select("name").eq("company_id", companyId);
    const dbNames = new Set((existing || []).map((e: any) => e.name.toLowerCase()));
    const toImport = preview.filter((s) => !dbNames.has(s.name.toLowerCase()));
    const skipped = preview.length - toImport.length;

    if (toImport.length === 0) {
      toast.info("Todas as disciplinas já estão cadastradas.");
      setImporting(false);
      return;
    }

    const payload = toImport.map((s) => ({ name: s.name, code: s.code, area: s.area, company_id: companyId }));
    const { error } = await supabase.from("subjects").insert(payload);

    if (error) {
      showInvokeError("Erro ao importar: " + error.message);
    } else {
      const msg = skipped > 0 ? ` (${skipped} duplicada(s) ignorada(s))` : "";
      showInvokeSuccess(`${toImport.length} disciplina(s) importada(s)!${msg}`);
      onImported();
      resetState();
      onOpenChange(false);
    }
    setImporting(false);
  };

  const resetState = () => { setPreview([]); setErrors([]); setWarnings([]); };
  const handleClose = (v: boolean) => { if (!v) resetState(); onOpenChange(v); };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Importar Disciplinas em Lote
          </DialogTitle>
          <DialogDescription>Importe disciplinas a partir de um arquivo CSV.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-primary/30 bg-primary/5">
            <Download className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Modelo de Planilha</p>
              <p className="text-xs text-muted-foreground">Colunas: Nome, Código, Área</p>
            </div>
            <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-1.5 shrink-0">
              <Download className="h-3.5 w-3.5" />Baixar Modelo
            </Button>
          </div>

          <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} className="hidden" />
          <Button variant="outline" className="w-full gap-2 h-16 border-dashed" onClick={() => fileRef.current?.click()}>
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
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />Duplicada(s) serão ignoradas:
              </p>
              {warnings.map((w, i) => <p key={i} className="text-xs text-muted-foreground ml-5">{w}</p>)}
            </div>
          )}

          {preview.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <p className="text-sm font-medium text-foreground">{preview.length} disciplina(s) pronta(s)</p>
              </div>
              <div className="rounded-lg border overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b bg-muted/50">
                    <th className="text-left px-3 py-2 font-semibold">#</th>
                    <th className="text-left px-3 py-2 font-semibold">Nome</th>
                    <th className="text-left px-3 py-2 font-semibold">Código</th>
                    <th className="text-left px-3 py-2 font-semibold">Área</th>
                  </tr></thead>
                  <tbody>
                    {preview.map((s, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                        <td className="px-3 py-1.5 font-medium">{s.name}</td>
                        <td className="px-3 py-1.5 text-muted-foreground font-mono">{s.code}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{s.area || "—"}</td>
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
            Importar {preview.length > 0 ? `${preview.length} disciplina(s)` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}