import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Simulado, SimuladoSubject } from "@/hooks/useSimulados";
import { FileSpreadsheet } from "lucide-react";

interface Props {
  sim: Simulado;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function totalObjectiveQuestions(subjects: SimuladoSubject[]) {
  return subjects.reduce((sum, s) => sum + (s.type === "discursiva" ? 0 : s.question_count), 0);
}

export default function AnswerSheetGenerator({ sim, open, onOpenChange }: Props) {
  const [alternatives, setAlternatives] = useState("5");

  const generate = () => {
    const altCount = parseInt(alternatives);
    const letters = "ABCDEFGHIJ".slice(0, altCount);
    const subjects = sim.subjects.filter(s => s.type !== "discursiva");
    const total = totalObjectiveQuestions(subjects);

    if (total === 0) {
      toast({ title: "Nenhuma questão objetiva neste simulado.", variant: "destructive" });
      return;
    }

    // Build question ranges per subject
    let currentQ = 1;
    const sections: { name: string; startQ: number; endQ: number }[] = [];
    for (const s of subjects) {
      sections.push({ name: s.subject_name, startQ: currentQ, endQ: currentQ + s.question_count - 1 });
      currentQ += s.question_count;
    }

    // Generate bubble grid HTML
    const COLS = 3;
    const PER_COL = Math.ceil(total / COLS);

    // Create flat list of all questions with subject labels
    type QItem = { type: "header"; text: string } | { type: "question"; num: number };
    const allItems: QItem[] = [];
    for (const sec of sections) {
      allItems.push({ type: "header", text: sec.name });
      for (let q = sec.startQ; q <= sec.endQ; q++) {
        allItems.push({ type: "question", num: q });
      }
    }

    // Split into columns by question count
    let qCount = 0;
    const columns: QItem[][] = [[]];
    let colIdx = 0;
    for (const item of allItems) {
      if (item.type === "question") {
        if (qCount > 0 && qCount % PER_COL === 0 && colIdx < COLS - 1) {
          colIdx++;
          columns.push([]);
        }
        qCount++;
      }
      if (!columns[colIdx]) columns[colIdx] = [];
      columns[colIdx].push(item);
    }

    const renderColumn = (items: QItem[]) => {
      let html = "";
      for (const item of items) {
        if (item.type === "header") {
          html += `<div class="section-header">${item.text}</div>`;
          html += `<div class="letters-header">${letters.split("").map(l => `<span>${l}</span>`).join("")}</div>`;
        } else {
          html += `<div class="q-row">
            <span class="q-num">${item.num}</span>
            ${letters.split("").map(() => `<span class="bubble">○</span>`).join("")}
          </div>`;
        }
      }
      return html;
    };

    // Roll number section
    const rollNoSection = `
      <div class="roll-section">
        <div class="roll-title">Roll No</div>
        <div class="roll-boxes">
          <div class="roll-box"></div>
          <div class="roll-box"></div>
        </div>
        <div class="roll-digits">
          ${[0,1,2,3,4,5,6,7,8,9].map(d => `<div class="digit-row"><span class="digit-label">${d}</span><span class="bubble">○</span><span class="bubble">○</span></div>`).join("")}
        </div>
      </div>
    `;

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Folha de Respostas — ${sim.title}</title>
  <style>
    @page { size: A4; margin: 10mm 12mm; }
    @media print { body { margin: 0; padding: 0; } }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, sans-serif;
      font-size: 10pt;
      color: #000;
      max-width: 210mm;
      margin: 0 auto;
      padding: 5mm;
    }
    .sheet-header {
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 3mm;
      margin-bottom: 3mm;
    }
    .sheet-header h1 { font-size: 14pt; margin-bottom: 1mm; }
    .sheet-header p { font-size: 9pt; color: #333; }
    .student-info {
      display: flex;
      justify-content: space-between;
      border: 1px solid #000;
      padding: 2mm 3mm;
      margin-bottom: 3mm;
      font-size: 10pt;
    }
    .student-info span { flex: 1; }
    
    .main-grid {
      display: flex;
      gap: 4mm;
      border: 1px solid #000;
      padding: 3mm;
    }
    .roll-section {
      border-right: 1px solid #ccc;
      padding-right: 3mm;
      min-width: 28mm;
    }
    .roll-title { font-weight: bold; text-align: center; font-size: 9pt; margin-bottom: 1mm; }
    .roll-boxes { display: flex; gap: 1mm; justify-content: center; margin-bottom: 1mm; }
    .roll-box { width: 8mm; height: 10mm; border: 1px solid #000; }
    .roll-digits { }
    .digit-row { display: flex; align-items: center; gap: 2mm; font-size: 8pt; line-height: 1.6; }
    .digit-label { width: 8mm; text-align: center; font-weight: bold; }

    .answer-columns {
      display: flex;
      flex: 1;
      gap: 4mm;
    }
    .answer-col {
      flex: 1;
    }
    .section-header {
      font-weight: bold;
      font-size: 8pt;
      text-align: center;
      background: #eee;
      padding: 0.5mm 0;
      margin-top: 1mm;
      border: 1px solid #ccc;
    }
    .letters-header {
      display: flex;
      justify-content: flex-end;
      gap: 1mm;
      font-size: 7pt;
      font-weight: bold;
      padding: 0.3mm 0;
      margin-bottom: 0;
    }
    .letters-header span {
      width: 5mm;
      text-align: center;
    }
    .q-row {
      display: flex;
      align-items: center;
      gap: 1mm;
      line-height: 1.5;
      font-size: 9pt;
    }
    .q-num {
      width: 7mm;
      text-align: right;
      font-weight: bold;
      font-size: 8pt;
      padding-right: 1mm;
    }
    .bubble {
      width: 5mm;
      text-align: center;
      font-size: 12pt;
      line-height: 1.2;
    }
    .sheet-footer {
      margin-top: 3mm;
      text-align: center;
      font-size: 7pt;
      color: #999;
    }
    .instructions-box {
      font-size: 8pt;
      border: 1px solid #000;
      padding: 2mm 3mm;
      margin-bottom: 3mm;
      background: #fafafa;
    }
    .instructions-box strong { font-size: 9pt; }
  </style>
</head>
<body>
  <div class="sheet-header">
    <h1>${sim.title}</h1>
    <p>Turma(s): ${sim.class_groups.join(", ")} · Data: ${sim.application_date || "___/___/______"} · ${total} questões (${altCount} alternativas)</p>
  </div>
  
  <div class="student-info">
    <span><strong>Aluno(a):</strong> _____________________________________________</span>
    <span><strong>Nº:</strong> _______</span>
    <span><strong>Turma:</strong> ___________</span>
  </div>

  <div class="instructions-box">
    <strong>Instruções:</strong> Preencha completamente o círculo correspondente à alternativa escolhida. Use caneta azul ou preta. Não rasure.
  </div>

  <div class="main-grid">
    ${rollNoSection}
    <div class="answer-columns">
      ${columns.map(col => `<div class="answer-col">${renderColumn(col)}</div>`).join("")}
    </div>
  </div>

  <div class="sheet-footer">
    ProvaFácil — Folha de Respostas gerada em ${new Date().toLocaleDateString("pt-BR")}
  </div>
</body>
</html>`;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast({ title: "Permita pop-ups para gerar a folha.", variant: "destructive" });
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => { setTimeout(() => printWindow.print(), 500); };
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Folha de Respostas
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Gerar folha de respostas para <strong>{sim.title}</strong> com {totalObjectiveQuestions(sim.subjects)} questões objetivas.
          </p>
          <div className="space-y-1.5">
            <Label className="text-xs">Número de alternativas por questão</Label>
            <Select value={alternatives} onValueChange={setAlternatives}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 alternativas (A-C)</SelectItem>
                <SelectItem value="4">4 alternativas (A-D)</SelectItem>
                <SelectItem value="5">5 alternativas (A-E)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={generate} className="gap-2">
            <FileSpreadsheet className="h-4 w-4" /> Gerar Folha
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
