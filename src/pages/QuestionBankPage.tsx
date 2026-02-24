import { mockQuestions } from "@/data/mockData";
import { Input } from "@/components/ui/input";
import { Search, Tag, Filter } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const difficultyLabels: Record<string, string> = {
  facil: "Fácil",
  media: "Média",
  dificil: "Difícil",
};

const difficultyStyles: Record<string, string> = {
  facil: "bg-success/10 text-success",
  media: "bg-warning/10 text-warning",
  dificil: "bg-destructive/10 text-destructive",
};

export default function QuestionBankPage() {
  const [search, setSearch] = useState("");

  const allTags = [...new Set(mockQuestions.flatMap((q) => q.tags))];

  const filtered = mockQuestions.filter(
    (q) =>
      q.content.toLowerCase().includes(search.toLowerCase()) ||
      q.subjectName.toLowerCase().includes(search.toLowerCase()) ||
      q.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground font-display">Banco de Questões</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Pesquise e reutilize questões de provas anteriores
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por conteúdo, disciplina ou tag..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5">
        {allTags.map((tag) => (
          <button
            key={tag}
            onClick={() => setSearch(tag)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground text-xs hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            <Tag className="h-2.5 w-2.5" />
            {tag}
          </button>
        ))}
      </div>

      {/* Questions */}
      <div className="space-y-3">
        {filtered.map((q, i) => (
          <div
            key={q.id}
            className="glass-card rounded-lg p-4 animate-fade-in"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-medium text-muted-foreground">{q.subjectName}</span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">{q.grade}</span>
                  <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium", difficultyStyles[q.difficulty])}>
                    {difficultyLabels[q.difficulty]}
                  </span>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-medium",
                    q.type === "objetiva" ? "bg-info/10 text-info" : "bg-primary/10 text-primary"
                  )}>
                    {q.type === "objetiva" ? "Objetiva" : "Discursiva"}
                  </span>
                </div>
                <p className="text-sm text-foreground">{q.content}</p>
                <div className="flex items-center gap-2 mt-2">
                  {q.tags.map((tag) => (
                    <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
              <span className="text-xs text-muted-foreground">
                por {q.authorName} • {new Date(q.createdAt).toLocaleDateString("pt-BR")}
              </span>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>Nenhuma questão encontrada.</p>
        </div>
      )}
    </div>
  );
}
