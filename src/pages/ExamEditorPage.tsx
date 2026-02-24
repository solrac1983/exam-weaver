import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { RichEditor } from "@/components/editor/RichEditor";
import { Button } from "@/components/ui/button";
import { mockDemands, mockQuestions, examTypeLabels } from "@/data/mockData";
import { StatusBadge } from "@/components/StatusBadge";
import {
  ArrowLeft,
  Save,
  Send,
  Eye,
  Library,
  X,
  GripVertical,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";

const defaultExamContent = `
<h1 style="text-align: center">AVALIAÇÃO BIMESTRAL</h1>
<p style="text-align: center"><strong>Disciplina:</strong> _________________ &nbsp;&nbsp; <strong>Professor(a):</strong> _________________</p>
<p style="text-align: center"><strong>Aluno(a):</strong> _________________________________ &nbsp;&nbsp; <strong>Turma:</strong> _______ &nbsp;&nbsp; <strong>Data:</strong> ___/___/______</p>
<hr>
<h2>Instruções</h2>
<ul>
<li>Leia atentamente cada questão antes de responder.</li>
<li>Utilize caneta azul ou preta para as respostas.</li>
<li>Não é permitido o uso de corretivo.</li>
</ul>
<hr>
<h2>Questões Objetivas</h2>
<p><strong>1)</strong> Escreva aqui o enunciado da primeira questão...</p>
<p>a) Alternativa A</p>
<p>b) Alternativa B</p>
<p>c) Alternativa C</p>
<p>d) Alternativa D</p>
<p></p>
<h2>Questões Discursivas</h2>
<p><strong>1)</strong> Escreva aqui o enunciado da questão discursiva...</p>
<p></p>
`;

export default function ExamEditorPage() {
  const navigate = useNavigate();
  const { demandId } = useParams();
  const demand = mockDemands.find((d) => d.id === demandId);

  const [content, setContent] = useState(defaultExamContent);
  const [showBank, setShowBank] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground font-display">
              Editor de Prova
              {demand && (
                <span className="text-muted-foreground font-normal">
                  {" "}— {demand.subjectName} ({examTypeLabels[demand.examType]})
                </span>
              )}
            </h1>
            {demand && (
              <div className="flex items-center gap-2 mt-0.5">
                <StatusBadge status={demand.status} />
                <span className="text-xs text-muted-foreground">
                  {demand.classGroups.join(", ")}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBank(!showBank)}
            className="gap-1.5"
          >
            <Library className="h-4 w-4" />
            Banco de Questões
          </Button>
          <Button variant="outline" size="sm" onClick={handleSave} className="gap-1.5">
            <Save className="h-4 w-4" />
            {saved ? "Salvo ✓" : "Salvar"}
          </Button>
          <Button size="sm" className="gap-1.5">
            <Send className="h-4 w-4" />
            Enviar para revisão
          </Button>
        </div>
      </div>

      {/* Editor + Bank panel */}
      <div className="flex gap-4">
        <div className={cn("flex-1 transition-all", showBank ? "max-w-[calc(100%-320px)]" : "max-w-full")}>
          <RichEditor content={content} onChange={setContent} />
        </div>

        {showBank && (
          <div className="w-[300px] flex-shrink-0 glass-card rounded-lg overflow-hidden animate-slide-in-left">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Banco de Questões</h3>
              <button
                onClick={() => setShowBank(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-3 space-y-2 max-h-[600px] overflow-y-auto">
              {mockQuestions.map((q) => (
                <QuestionBankCard key={q.id} question={q} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function QuestionBankCard({ question }: { question: (typeof mockQuestions)[0] }) {
  return (
    <div className="rounded-md border border-border bg-card p-3 text-xs cursor-grab hover:border-primary/30 hover:shadow-sm transition-all group">
      <div className="flex items-start gap-2">
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 mt-0.5 group-hover:text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="font-medium text-foreground">{question.subjectName}</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">{question.grade}</span>
          </div>
          <p className="text-muted-foreground line-clamp-2">{question.content}</p>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {question.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-[10px]">
                <Tag className="h-2 w-2" />
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
