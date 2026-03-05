import { useState, useMemo, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import { Simulado, SimuladoSubject } from "@/hooks/useSimulados";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Printer, Download } from "lucide-react";

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

  let currentQ = 1;
  const sections: { name: string; startQ: number; endQ: number }[] = [];
  for (const s of subjects) {
    sections.push({ name: s.subject_name, startQ: currentQ, endQ: currentQ + s.question_count - 1 });
    currentQ += s.question_count;
  }

  type QItem = { type: "header"; text: string } | { type: "question"; num: number };
  const allItems: QItem[] = [];
  for (const sec of sections) {
    allItems.push({ type: "header", text: sec.name });
    for (let q = sec.startQ; q <= sec.endQ; q++) {
      allItems.push({ type: "question", num: q });
    }
  }

  const COLS = total <= 20 ? 2 : total <= 45 ? 3 : total <= 60 ? 4 : 5;
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

  const isCompact = total > 45;
  const isUltraCompact = total > 70;
  const bubbleSize = isUltraCompact ? 5.5 : isCompact ? 6.5 : 8;
  const fontSize = isUltraCompact ? "1.8" : isCompact ? "2.2" : "2.8";
  const rowPad = isUltraCompact ? "0.2mm" : isCompact ? "0.3mm" : "0.5mm";
  const numFontSize = isUltraCompact ? "6pt" : isCompact ? "7pt" : "8pt";
  const headerFontSize = isUltraCompact ? "5.5pt" : isCompact ? "6pt" : "7pt";

  const renderBubble = (letter: string) => {
    return `<td class="bubble-cell">
      <svg width="${bubbleSize}mm" height="${bubbleSize}mm" viewBox="0 0 ${bubbleSize} ${bubbleSize}" class="bubble-svg">
        <circle cx="${bubbleSize / 2}" cy="${bubbleSize / 2}" r="${bubbleSize / 2 - 0.3}" 
                fill="none" stroke="#000" stroke-width="0.5"/>
        <text x="${bubbleSize / 2}" y="${bubbleSize / 2 + 0.2}" 
              text-anchor="middle" dominant-baseline="central" 
              font-size="${fontSize}" font-weight="bold" font-family="Arial" fill="#444">${letter}</text>
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
          ${letters.split("").map(l => renderBubble(l)).join("")}
        </tr>`;
      }
    }
    return `<table class="answer-table">${html}</table>`;
  };

  const marker = (size: number) =>
    `<svg width="${size}mm" height="${size}mm" viewBox="0 0 ${size} ${size}">
      <rect x="0" y="0" width="${size}" height="${size}" fill="#000"/>
    </svg>`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Folha de Respostas — ${sim.title}</title>
  <style>
    @page { size: A4; margin: 6mm 8mm; }
    @media print { body { margin: 0; padding: 0; } }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 9pt;
      color: #000;
      max-width: 210mm;
      margin: 0 auto;
      padding: 4mm 6mm;
      background: #fff;
    }
    .markers-top, .markers-bottom {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 1mm;
    }
    .markers-top { margin-bottom: 2mm; }
    .markers-bottom { margin-top: 2mm; }
    .sheet-header {
      text-align: center;
      border: 1.5px solid #000;
      padding: 2mm 3mm;
      margin-bottom: 2mm;
    }
    .sheet-header h1 {
      font-size: 12pt;
      margin-bottom: 0.5mm;
      letter-spacing: 0.3px;
    }
    .sheet-header .meta {
      font-size: 7.5pt;
      color: #333;
    }
    .student-info {
      display: flex;
      border: 1px solid #000;
      margin-bottom: 2mm;
      font-size: 8pt;
    }
    .student-info .field {
      flex: 1;
      padding: 1.5mm 2mm;
      border-right: 1px solid #000;
    }
    .student-info .field:last-child { border-right: none; }
    .student-info .field-small { flex: 0 0 16%; }
    .student-info .field strong { font-size: 7pt; display: block; margin-bottom: 0.5mm; }
    .student-info .field .line { 
      border-bottom: 1px solid #999; 
      height: 4mm; 
    }
    .instructions {
      border: 1px solid #000;
      padding: 1.5mm 2mm;
      margin-bottom: 2mm;
      background: #f5f5f5;
      font-size: 7pt;
      line-height: 1.4;
      display: flex;
      align-items: center;
      gap: 3mm;
    }
    .instructions strong { font-size: 7.5pt; }
    .sample-bubbles {
      display: inline-flex;
      gap: 1.5mm;
      align-items: center;
      flex-shrink: 0;
    }
    .grid-container {
      display: flex;
      gap: 1.5mm;
      border: 1.5px solid #000;
      padding: 2mm;
    }
    .answer-col {
      flex: 1;
      min-width: 0;
    }
    .answer-col + .answer-col {
      border-left: 1px solid #999;
      padding-left: 1.5mm;
    }
    .answer-table {
      width: 100%;
      border-collapse: collapse;
    }
    .section-header-row td {
      background: #222;
      color: #fff;
      font-weight: bold;
      font-size: ${headerFontSize};
      text-align: center;
      padding: 1mm 1mm;
      letter-spacing: 0.3px;
      text-transform: uppercase;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 0;
    }
    .q-row {
      border-bottom: 0.3px solid #ddd;
    }
    .q-row:nth-child(even) {
      background: #f8f8f8;
    }
    .q-num-cell {
      width: 6mm;
      text-align: center;
      font-weight: bold;
      font-size: ${numFontSize};
      padding: ${rowPad} 0.5mm;
      background: #eee;
      border-right: 0.5px solid #ccc;
    }
    .bubble-cell {
      text-align: center;
      padding: ${rowPad} 0.3mm;
    }
    .bubble-svg {
      display: block;
      margin: 0 auto;
    }
    .roll-number-section {
      border: 1.5px solid #000;
      margin-bottom: 2mm;
      padding: 1.5mm 2mm;
    }
    .roll-number-header {
      font-size: 7pt;
      text-align: center;
      margin-bottom: 1mm;
      padding-bottom: 1mm;
      border-bottom: 0.5px solid #ccc;
    }
    .roll-number-grid {
      width: auto;
      margin: 0 auto;
      border-collapse: collapse;
    }
    .roll-digit-label {
      width: 6mm;
      text-align: center;
      font-weight: bold;
      font-size: 8pt;
      padding: 0.3mm 1mm;
      background: #eee;
      border: 0.3px solid #ddd;
    }
    .roll-digit-col-header {
      text-align: center;
      font-size: 5.5pt;
      font-weight: bold;
      color: #666;
      padding: 0.5mm 0.5mm;
      border: 0.3px solid #ddd;
      background: #f5f5f5;
    }
    .roll-bubble-cell {
      text-align: center;
      padding: 0.2mm 0.5mm;
      border: 0.3px solid #eee;
    }
    .roll-bubble-cell svg {
      display: block;
      margin: 0 auto;
    }
    .roll-number-write {
      margin-top: 1.5mm;
      font-size: 7pt;
      display: flex;
      align-items: center;
      gap: 2mm;
    }
    .roll-boxes {
      display: inline-flex;
      gap: 0.5mm;
    }
    .roll-box {
      display: inline-block;
      width: 5mm;
      height: 6mm;
      border: 1px solid #000;
      background: #fff;
    }
    .sheet-footer {
      text-align: center;
      font-size: 6pt;
      color: #999;
      margin-top: 1.5mm;
      padding-top: 1mm;
      border-top: 0.5px solid #ddd;
    }
    .sheet-footer .barcode {
      font-family: monospace;
      font-size: 7pt;
      letter-spacing: 2px;
      color: #000;
      margin-bottom: 0.5mm;
    }
  </style>
</head>
<body>
  <div class="markers-top">
    ${marker(5)}
    <span style="font-size:6pt;color:#999;letter-spacing:1px;">FOLHA DE RESPOSTAS</span>
    ${marker(5)}
  </div>
  <div class="sheet-header">
    <h1>${sim.title}</h1>
    <div class="meta">
      Turma(s): ${sim.class_groups.join(", ")} · 
      Data: ${sim.application_date || "___/___/______"} · 
      ${total} questões · ${altCount} alternativas (${letters.split("").join(", ")})
    </div>
  </div>
  <div class="student-info">
    <div class="field">
      <strong>NOME DO ALUNO(A):</strong>
      <div class="line"></div>
    </div>
    <div class="field field-small">
      <strong>TURMA:</strong>
      <div class="line"></div>
    </div>
  </div>
   <div class="roll-number-section">
    <div class="roll-instructions-row">
      <div class="roll-left">
        <div class="roll-number-header">
          <strong>Nº MATRÍCULA</strong>
        </div>
        <table class="roll-number-grid">
          <tr>
            <td class="roll-digit-label"></td>
            ${Array.from({ length: 2 }, (_, i) => `<td class="roll-digit-col-header">Dígito ${i + 1}</td>`).join("")}
          </tr>
          ${Array.from({ length: 10 }, (_, d) => `<tr>
            <td class="roll-digit-label">${d}</td>
            ${Array.from({ length: 2 }, () => `<td class="roll-bubble-cell">
              <svg width="5.5mm" height="5.5mm" viewBox="0 0 5.5 5.5">
                <circle cx="2.75" cy="2.75" r="2.45" fill="none" stroke="#000" stroke-width="0.5"/>
                <text x="2.75" y="2.95" text-anchor="middle" dominant-baseline="central" font-size="2" font-weight="bold" font-family="Arial" fill="#444">${d}</text>
              </svg>
            </td>`).join("")}
          </tr>`).join("")}
        </table>
        <div class="roll-number-write">
          Nº: <span class="roll-boxes">${Array.from({ length: 2 }, () => `<span class="roll-box"></span>`).join("")}</span>
        </div>
      </div>
      <div class="roll-right-instructions">
        <strong style="font-size:7pt;display:block;margin-bottom:1mm;text-transform:uppercase;">Instruções</strong>
        <ul class="instr-list">
          <li>Verifique se seu nome está completo e se os dados estão corretos. Preencha seu nome e assine no local apropriado.</li>
          <li>Mantenha silêncio durante toda a aplicação.</li>
          <li>Transcreva a frase do cabeçalho da prova abaixo:<br/><span style="display:inline-block;width:95%;border-bottom:1px solid #999;height:4mm;margin-top:0.5mm;"></span></li>
          <li>O CARTÃO-RESPOSTA é o único documento para correção. Não amasse, dobre ou rasure.</li>
          <li>Use caneta esferográfica de tinta preta (material transparente). Não use lápis, lapiseira ou borracha.</li>
          <li>Pense bem antes de responder. Revise cada questão antes de marcar.</li>
          <li>Não haverá substituição por erro de preenchimento.</li>
          <li>Em hipótese alguma leve este cartão ao sair da sala.</li>
          <li style="display:flex;align-items:center;gap:2mm;">
            <span>Exemplo de preenchimento:</span>
            <span style="display:inline-flex;gap:0.8mm;align-items:center;">
              <svg width="5mm" height="5mm" viewBox="0 0 5 5"><circle cx="2.5" cy="2.5" r="2.2" fill="none" stroke="#000" stroke-width="0.4"/><text x="2.5" y="2.7" text-anchor="middle" dominant-baseline="central" font-size="1.8" font-family="Arial" fill="#444">A</text></svg>
              <svg width="5mm" height="5mm" viewBox="0 0 5 5"><circle cx="2.5" cy="2.5" r="2.2" fill="#000" stroke="#000" stroke-width="0.4"/><text x="2.5" y="2.7" text-anchor="middle" dominant-baseline="central" font-size="1.8" font-family="Arial" fill="#fff">B</text></svg>
              <svg width="5mm" height="5mm" viewBox="0 0 5 5"><circle cx="2.5" cy="2.5" r="2.2" fill="#000" stroke="#000" stroke-width="0.4"/><text x="2.5" y="2.7" text-anchor="middle" dominant-baseline="central" font-size="1.8" font-family="Arial" fill="#fff">C</text></svg>
              <svg width="5mm" height="5mm" viewBox="0 0 5 5"><circle cx="2.5" cy="2.5" r="2.2" fill="#000" stroke="#000" stroke-width="0.4"/><text x="2.5" y="2.7" text-anchor="middle" dominant-baseline="central" font-size="1.8" font-family="Arial" fill="#fff">D</text></svg>
              <svg width="5mm" height="5mm" viewBox="0 0 5 5"><circle cx="2.5" cy="2.5" r="2.2" fill="none" stroke="#000" stroke-width="0.4"/><text x="2.5" y="2.7" text-anchor="middle" dominant-baseline="central" font-size="1.8" font-family="Arial" fill="#444">E</text></svg>
            </span>
          </li>
        </ul>
      </div>
    </div>
  </div>
  <div class="instructions">
    <div>
      <strong>INSTRUÇÕES:</strong> Preencha <strong>completamente</strong> o círculo da alternativa escolhida usando caneta azul ou preta. Não rasure. Marque apenas UMA alternativa por questão.
    </div>
    <span class="sample-bubbles">
      ✓ <svg width="6mm" height="6mm" viewBox="0 0 6 6">
        <circle cx="3" cy="3" r="2.5" fill="#000" stroke="#000" stroke-width="0.4"/>
      </svg>
      ✗ <svg width="6mm" height="6mm" viewBox="0 0 6 6">
        <circle cx="3" cy="3" r="2.5" fill="none" stroke="#000" stroke-width="0.4"/>
        <line x1="1.2" y1="1.2" x2="4.8" y2="4.8" stroke="#000" stroke-width="0.3"/>
      </svg>
    </span>
  </div>
  <div class="grid-container">
    ${columns.map(col => `<div class="answer-col">${renderColumn(col)}</div>`).join("")}
  </div>
  <div class="sheet-footer">
    <div class="barcode">ID: ${sim.id.substring(0, 8).toUpperCase()}</div>
    ProvaFácil · ${new Date().toLocaleDateString("pt-BR")}
  </div>
  <div class="markers-bottom">
    ${marker(5)}
    <svg width="30mm" height="2mm" viewBox="0 0 30 2">
      ${Array.from({ length: 15 }, (_, i) => `<rect x="${i * 2}" y="0" width="1" height="2" fill="${i % 2 === 0 ? '#000' : '#fff'}"/>`).join("")}
    </svg>
    ${marker(5)}
  </div>
</body>
</html>`;
}

export default function AnswerSheetGenerator({ sim, open, onOpenChange }: Props) {
  const [altCount, setAltCount] = useState("5");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const total = totalObjectiveQuestions(sim.subjects);

  const previewHTML = useMemo(() => {
    if (!open || total === 0) return "";
    return buildAnswerSheetHTML(sim, parseInt(altCount));
  }, [open, sim, altCount, total]);

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast({ title: "Permita pop-ups para imprimir.", variant: "destructive" });
      return;
    }
    printWindow.document.write(previewHTML);
    printWindow.document.close();
    printWindow.onload = () => { setTimeout(() => printWindow.print(), 500); };
  };

  if (total === 0 && open) {
    toast({ title: "Nenhuma questão objetiva neste simulado.", variant: "destructive" });
    onOpenChange(false);
    return null;
  }

  if (total > 90 && open) {
    toast({ title: "Máximo de 90 questões objetivas permitidas.", variant: "destructive" });
    onOpenChange(false);
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Folha de Respostas — {sim.title}</DialogTitle>
          <DialogDescription>
            {total} questões objetivas · Turma(s): {sim.class_groups.join(", ")}
          </DialogDescription>
        </DialogHeader>

        {/* Options */}
        <div className="flex items-center gap-4 py-2 border-b">
          <div className="flex items-center gap-2">
            <Label htmlFor="alt-count" className="text-sm whitespace-nowrap">Alternativas:</Label>
            <Select value={altCount} onValueChange={setAltCount}>
              <SelectTrigger id="alt-count" className="w-20 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="4">A–D</SelectItem>
                <SelectItem value="5">A–E</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Preview */}
        <div className="flex-1 min-h-0 overflow-auto border rounded-md bg-muted/30">
          <iframe
            ref={iframeRef}
            srcDoc={previewHTML}
            className="w-full h-[60vh] border-0 bg-white"
            title="Preview da Folha de Respostas"
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" /> Imprimir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
