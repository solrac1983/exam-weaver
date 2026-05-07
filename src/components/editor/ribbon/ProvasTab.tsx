/**
 * ProvasTab — exam-specific ribbon group: insert structured questions and
 * alternatives, toggle the answer-key/validation panel, and access exam
 * tools.
 *
 * Communicates with RichEditor via window CustomEvents so it stays decoupled
 * from the parent's local state (consistent with the existing tab pattern).
 */
import type { Editor } from "@tiptap/react";
import {
  HelpCircle, ListPlus, CheckSquare, ClipboardCheck, Sparkles, Shuffle, Library,
} from "lucide-react";
import { RibbonStackedBtn, RibbonGroup, RibbonDivider } from "./RibbonShared";
import { showInvokeError, showInvokeSuccess } from "@/lib/invokeFunction";

interface ProvasTabProps {
  editor: Editor;
}

export function ProvasTab({ editor }: ProvasTabProps) {
  const insertQuestion = () => {
    if ((editor.commands as any).insertQuestionBlock?.()) {
      showInvokeSuccess("Questão inserida.");
    } else {
      showInvokeError("Não foi possível inserir a questão aqui.");
    }
  };

  const addAlternative = () => {
    const ok = (editor.commands as any).addAlternativeAfter?.();
    if (!ok) showInvokeError("Posicione o cursor dentro de uma alternativa.");
  };

  const toggleCorrect = () => {
    const ok = (editor.commands as any).toggleAlternativeCorrect?.();
    if (!ok) showInvokeError("Posicione o cursor dentro de uma alternativa.");
  };

  const openAnswerKey = () => {
    window.dispatchEvent(new CustomEvent("editor-toggle-answer-key"));
  };

  const shuffleAlternatives = () => {
    // Phase 5: lightweight shuffle of alternatives within each questionBlock.
    const { state, view } = editor;
    let tr = state.tr;
    let changed = false;
    state.doc.descendants((node, pos) => {
      if (node.type.name !== "alternativeList") return;
      const items = node.content.content.slice();
      if (items.length < 2) return;
      // Fisher–Yates
      for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
      }
      // Reassign letters A..N preserving isCorrect against the original alt
      const letters = ["A", "B", "C", "D", "E"];
      const newItems = items.map((it, idx) =>
        state.schema.nodes.alternativeItem.create(
          { letter: letters[idx] || `${idx + 1}`, isCorrect: it.attrs.isCorrect },
          it.content,
        ),
      );
      const newList = state.schema.nodes.alternativeList.create(node.attrs, newItems);
      tr = tr.replaceWith(pos, pos + node.nodeSize, newList);
      changed = true;
    });
    if (changed) {
      view.dispatch(tr);
      showInvokeSuccess("Alternativas embaralhadas.");
    } else {
      showInvokeError("Nenhuma questão estruturada encontrada.");
    }
  };

  return (
    <>
      <RibbonGroup label="Questões">
        <RibbonStackedBtn onClick={insertQuestion} icon={HelpCircle} label="Questão" shortcut="Ctrl+Shift+Q"
          description="Inserir uma questão estruturada com alternativas A-D" />
        <RibbonStackedBtn onClick={addAlternative} icon={ListPlus} label="Alternativa" shortcut="Ctrl+Shift+A"
          description="Adicionar nova alternativa à questão atual" />
        <RibbonStackedBtn onClick={toggleCorrect} icon={CheckSquare} label="Correta"
          description="Marcar/desmarcar a alternativa atual como correta" />
      </RibbonGroup>

      <RibbonDivider />

      <RibbonGroup label="Gabarito & Validação">
        <RibbonStackedBtn onClick={openAnswerKey} icon={ClipboardCheck} label="Gabarito"
          description="Abrir painel de gabarito automático e validação da prova" />
        <RibbonStackedBtn onClick={shuffleAlternatives} icon={Shuffle} label="Embaralhar"
          description="Embaralhar alternativas mantendo o gabarito coerente" />
      </RibbonGroup>

      <RibbonDivider />

      <RibbonGroup label="Recursos">
        <RibbonStackedBtn
          onClick={() => window.dispatchEvent(new CustomEvent("editor-toggle-question-bank"))}
          icon={Library} label="Banco"
          description="Abrir banco de questões (em breve)" />
        <RibbonStackedBtn
          onClick={() => window.dispatchEvent(new CustomEvent("editor-open-ai-panel"))}
          icon={Sparkles} label="Gerar IA"
          description="Gerar prova ou questões com IA" />
      </RibbonGroup>
    </>
  );
}
