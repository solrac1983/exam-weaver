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

function buildAnswerSheetHTML(sim: Simulado, altCount: number): string {
  const letters = "ABCDEFGHIJ".slice(0, altCount);
  const subjects = sim.subjects.filter(s => s.type !== "discursiva");
  const total = totalObjectiveQuestions(subjects);

  // Build question ranges per subject
  let currentQ = 1;
  const sections: { name: string; startQ: number; endQ: number }[] = [];
  for (const s of subjects) {
    sections.push({ name: s.subject_name, startQ: currentQ, endQ: currentQ + s.question_count - 1 });
    currentQ += s.question_count;
  }

  // Build flat items
  type QItem = { type: "header"; text: string } | { type: "question"; num: number };
  const allItems: QItem[] = [];
  for (const sec of sections) {
    allItems.push({ type: "header", text: sec.name });
    for (let q = sec.startQ; q <= sec.endQ; q++) {
      allItems.push({ type: "question", num: q });
    }
  }

  // Split into columns
  const COLS = total <= 30 ? 2 : 3;
  const PER_COL = Math.ceil(total / COLS);
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

  const bubbleSize = 9; // mm diameter
  const cellW = bubbleSize + 2; // mm per cell

  const renderBubble = (letter: string, qNum: number) => {
    return `<td class="bubble-cell">
      <svg width="${bubbleSize}mm" height="${bubbleSize}mm" viewBox="0 0 ${bubbleSize} ${bubbleSize}" class="bubble-svg">
        <circle cx="${bubbleSize / 2}" cy="${bubbleSize / 2}" r="${bubbleSize / 2 - 0.5}" 
                fill="none" stroke="#000" stroke-width="0.6"/>
        <text x="${bubbleSize / 2}" y="${bubbleSize / 2 + 0.3}" 
              text-anchor="middle" dominant-baseline="central" 
              font-size="2.8" font-weight="bold" font-family="Arial" fill="#333">${letter}</text>
      </svg>
    </td>`;
  };

  const renderColumn = (items: QItem[]) => {
    let html = "";
    for (const item of items) {
      if (item.type === "header") {
        html += `<tr class="section-header-row">
          <td colspan="${altCount + 1}" class="section-header-cell">${item.text}</td>
        </tr>`;
      } else {
        html += `<tr class="q-row">
          <td class="q-num-cell">${String(item.num).padStart(2, '0')}</td>
          ${letters.split("").map(l => renderBubble(l, item.num)).join("")}
        </tr>`;
      }
    }
    return `<table class="answer-table">${html}</table>`;
  };

  // Alignment markers (corner squares for CV detection)
  const marker = (size: number) =>
    `<svg width="${size}mm" height="${size}mm" viewBox="0 0 ${size} ${size}">
      <rect x="0" y="0" width="${size}" height="${size}" fill="#000"/>
      <rect x="${size * 0.25}" y="${size * 0.25}" width="${size * 0.5}" height="${size * 0.5}" fill="#fff"/>
      <rect x="${size * 0.35}" y="${size * 0.35}" width="${size * 0.3}" height="${size * 0.3}" fill="#000"/>
    </svg>`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Folha de Respostas — ${sim.title}</title>
  <style>
    @page { size: A4; margin: 8mm 10mm; }
    @media print { body { margin: 0; padding: 0; } }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10pt;
      color: #000;
      max-width: 210mm;
      margin: 0 auto;
      padding: 6mm 8mm;
      background: #fff;
    }

    /* Alignment markers */
    .markers-top, .markers-bottom {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 2mm;
    }
    .markers-top { margin-bottom: 3mm; }
    .markers-bottom { margin-top: 3mm; }

    /* Header */
    .sheet-header {
      text-align: center;
      border: 2px solid #000;
      padding: 3mm 4mm;
      margin-bottom: 3mm;
    }
    .sheet-header h1 {
      font-size: 14pt;
      margin-bottom: 1mm;
      letter-spacing: 0.5px;
    }
    .sheet-header .meta {
      font-size: 8.5pt;
      color: #333;
    }

    /* Student info */
    .student-info {
      display: flex;
      border: 1.5px solid #000;
      margin-bottom: 3mm;
      font-size: 10pt;
    }
    .student-info .field {
      flex: 1;
      padding: 2.5mm 3mm;
      border-right: 1px solid #000;
    }
    .student-info .field:last-child { border-right: none; }
    .student-info .field-small { flex: 0 0 18%; }
    .student-info .field strong { font-size: 8pt; display: block; margin-bottom: 1mm; }
    .student-info .field .line { 
      border-bottom: 1px solid #999; 
      height: 5mm; 
    }

    /* Instructions */
    .instructions {
      border: 1.5px solid #000;
      padding: 2mm 3mm;
      margin-bottom: 3mm;
      background: #f5f5f5;
      font-size: 8pt;
      line-height: 1.5;
    }
    .instructions strong { font-size: 8.5pt; }
    .instructions .sample-bubbles {
      display: inline-flex;
      gap: 2mm;
      align-items: center;
      margin: 0 2mm;
      vertical-align: middle;
    }
    .sample-filled {
      display: inline-block;
      width: 7mm;
      height: 7mm;
    }

    /* Grid layout */
    .grid-container {
      display: flex;
      gap: 3mm;
      border: 2px solid #000;
      padding: 3mm;
    }
    .answer-col {
      flex: 1;
      border: 1px solid #ccc;
    }
    .answer-col + .answer-col {
      border-left: 1.5px solid #000;
      padding-left: 2mm;
    }

    /* Answer table */
    .answer-table {
      width: 100%;
      border-collapse: collapse;
    }
    .section-header-row td {
      background: #222;
      color: #fff;
      font-weight: bold;
      font-size: 8pt;
      text-align: center;
      padding: 1.5mm 2mm;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .q-row {
      border-bottom: 0.5px solid #e0e0e0;
    }
    .q-row:nth-child(even) {
      background: #fafafa;
    }
    .q-num-cell {
      width: 8mm;
      text-align: center;
      font-weight: bold;
      font-size: 9pt;
      padding: 0.8mm 1mm;
      background: #f0f0f0;
      border-right: 1px solid #ccc;
    }
    .bubble-cell {
      text-align: center;
      padding: 0.5mm;
      width: ${cellW}mm;
    }
    .bubble-svg {
      display: block;
      margin: 0 auto;
    }

    /* Footer */
    .sheet-footer {
      text-align: center;
      font-size: 7pt;
      color: #999;
      margin-top: 2mm;
      padding-top: 1.5mm;
      border-top: 1px solid #ddd;
    }
    .sheet-footer .barcode {
      font-family: monospace;
      font-size: 8pt;
      letter-spacing: 2px;
      color: #000;
      margin-bottom: 1mm;
    }
  </style>
</head>
<body>
  <!-- TOP ALIGNMENT MARKERS -->
  <div class="markers-top">
    ${marker(6)}
    <span style="font-size:7pt;color:#999;letter-spacing:1px;">FOLHA DE RESPOSTAS — LEITURA AUTOMÁTICA</span>
    ${marker(6)}
  </div>

  <!-- HEADER -->
  <div class="sheet-header">
    <h1>${sim.title}</h1>
    <div class="meta">
      Turma(s): ${sim.class_groups.join(", ")} · 
      Data: ${sim.application_date || "___/___/______"} · 
      ${total} questões · ${altCount} alternativas (${letters.split("").join(", ")})
    </div>
  </div>

  <!-- STUDENT INFO -->
  <div class="student-info">
    <div class="field">
      <strong>NOME DO ALUNO(A):</strong>
      <div class="line"></div>
    </div>
    <div class="field field-small">
      <strong>Nº MATRÍCULA:</strong>
      <div class="line"></div>
    </div>
    <div class="field field-small">
      <strong>TURMA:</strong>
      <div class="line"></div>
    </div>
  </div>

  <!-- INSTRUCTIONS -->
  <div class="instructions">
    <strong>INSTRUÇÕES:</strong> Preencha <strong>completamente</strong> o círculo da alternativa escolhida usando caneta azul ou preta.
    <span class="sample-bubbles">
      Correto: <svg class="sample-filled" width="7mm" height="7mm" viewBox="0 0 7 7">
        <circle cx="3.5" cy="3.5" r="3" fill="#000" stroke="#000" stroke-width="0.5"/>
      </svg>
      &nbsp;Errado: <svg class="sample-filled" width="7mm" height="7mm" viewBox="0 0 7 7">
        <circle cx="3.5" cy="3.5" r="3" fill="none" stroke="#000" stroke-width="0.5"/>
        <line x1="1.5" y1="1.5" x2="5.5" y2="5.5" stroke="#000" stroke-width="0.4"/>
      </svg>
    </span>
    Não rasure. Marque apenas UMA alternativa por questão.
  </div>

  <!-- ANSWER GRID -->
  <div class="grid-container">
    ${columns.map(col => `<div class="answer-col">${renderColumn(col)}</div>`).join("")}
  </div>

  <!-- FOOTER WITH IDENTIFIER -->
  <div class="sheet-footer">
    <div class="barcode">ID: ${sim.id.substring(0, 8).toUpperCase()}</div>
    ProvaFácil — Folha de Respostas · Gerada em ${new Date().toLocaleDateString("pt-BR")}
  </div>

  <!-- BOTTOM ALIGNMENT MARKERS -->
  <div class="markers-bottom">
    ${marker(6)}
    <svg width="40mm" height="3mm" viewBox="0 0 40 3">
      ${Array.from({ length: 20 }, (_, i) => `<rect x="${i * 2}" y="0" width="1" height="3" fill="${i % 2 === 0 ? '#000' : '#fff'}"/>`).join("")}
    </svg>
    ${marker(6)}
  </div>
</body>
</html>`;
}

export default function AnswerSheetGenerator({ sim, open, onOpenChange }: Props) {
  const [alternatives, setAlternatives] = useState("5");

  const generate = () => {
    const altCount = parseInt(alternatives);
    const total = totalObjectiveQuestions(sim.subjects);

    if (total === 0) {
      toast({ title: "Nenhuma questão objetiva neste simulado.", variant: "destructive" });
      return;
    }

    const html = buildAnswerSheetHTML(sim, altCount);

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
