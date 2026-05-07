# Refatoração do Editor para arquitetura Word-like

Esta refatoração reorganiza `src/components/editor/` em camadas modulares sem quebrar conteúdo Tiptap existente. Será entregue em **4 fases**, cada uma testável e mergeável independentemente.

## Arquitetura alvo

```text
src/components/editor/
├── core/
│   ├── DocumentModel.ts          ← fonte única de verdade (state container)
│   ├── PageLayoutEngine.ts       ← cálculo A4/margens/quebras (puro)
│   ├── StyleManager.ts           ← registry de estilos nomeados
│   └── DocumentContext.tsx       ← provider React (substitui props drilling)
├── extensions/                   ← Tiptap extensions (movidas de raiz)
├── ribbon/
│   ├── FileTab.tsx               ← NOVA aba
│   ├── HomeTab.tsx               ← refatorada para usar StyleManager
│   └── ...
├── header-footer/
│   ├── HeaderFooterEditor.tsx    ← edição visual inline
│   └── DynamicFields.ts          ← {page}, {totalPages}, {date}, etc.
├── io/
│   ├── exportPDF.ts
│   ├── exportDOCX.ts
│   └── importDOCX.ts
└── RichEditor.tsx                ← orquestrador (slim)
```

## Fase 1 — Núcleo (DocumentModel + PageLayoutEngine + Context)

**Objetivo:** Centralizar estado e cálculos de página sem mudar UI.

- `DocumentModel.ts`: tipo + reducer
  ```ts
  interface DocumentModel {
    content: JSONContent;        // Tiptap JSON
    styles: StyleRegistry;
    pageSetup: { size: 'A4'|'Letter'; orientation; margins; columns };
    headerFooter: { default; firstPage?; even?; odd? };
    metadata: { title; author; subject; keywords; createdAt; updatedAt };
    comments: Comment[];
    revisions: Revision[];
    assets: AssetRef[];
  }
  ```
- `PageLayoutEngine.ts`: extrai e unifica a lógica hoje duplicada em `PaginationExtension.ts`, `pageSizing.ts`, `pageBreakTextFlow.ts`, `usePageBreaks.ts`. API pura: `computePages(blocks, pageSetup) → PageLayout[]`.
- `DocumentContext.tsx`: provider + hooks `useDocument()`, `usePageLayout()`, `useSaveStatus()`. Elimina ~80% dos `window.dispatchEvent` e `document.querySelector` espalhados pelo editor.
- Compatibilidade: `RichEditor` passa a inicializar o model a partir do conteúdo Tiptap atual; serialização inalterada.

**Testes:** `PageLayoutEngine.test.ts` (já existe `pageSizing.test.ts` — expandir).

## Fase 2 — Style Manager + aba Arquivo

- `StyleManager.ts`: registry com estilos pré-definidos:
  - Normal, Título 1, Título 2, **Questão**, **Alternativa**, **Texto de Apoio**, **Gabarito**, **Cabeçalho de Prova**.
  - Cada estilo: `{ id, name, baseStyle?, run: {font,size,bold,...}, paragraph: {align,indent,spacing,...} }`.
  - Aplicado via Tiptap mark/attribute custom (`paragraphStyle`) já mapeado para CSS classes em `index.css`.
- `ribbon/FileTab.tsx`: nova aba com:
  - **Novo** (limpa modelo com confirmação)
  - **Abrir** (importa DOCX via `mammoth` já presente)
  - **Salvar** (dispara hook de persistência atual)
  - **Salvar como modelo** (grava em `templates`)
  - **Exportar PDF** / **Exportar DOCX** (usam `PageLayoutEngine` + `pageSetup` do model)
  - **Imprimir** (`window.print()` com CSS sincronizado)
  - **Propriedades do documento** (dialog editando `metadata`)
- `HomeTab` ganha dropdown de estilos lendo do `StyleManager`.

## Fase 3 — Cabeçalho/Rodapé avançado + StatusBar

- `HeaderFooterEditor.tsx`: substitui `PageHeaderFooterOverlay`. Edição inline com mini-editor Tiptap; abas para *Padrão*, *Primeira página*, *Páginas pares*, *Páginas ímpares*.
- `DynamicFields.ts`: node Tiptap para campos `{page}`, `{totalPages}`, `{date}`, `{title}`, `{author}` — renderizados em tempo real a partir do `DocumentContext`.
- `EditorStatusBar`: já tem palavras/caracteres/zoom/save status. Adicionar:
  - Página atual (derivada da posição do cursor + `PageLayoutEngine`).
  - Total real de páginas (não mais heurística `characters/3000`).
  - Indicador de modo (Edição / Revisão / Leitura).

## Fase 4 — Unificação de Export/Print + Cleanup

- `io/exportPDF.ts`, `io/exportDOCX.ts`, `io/print.ts`: todos consomem `documentModel.pageSetup` via `PageLayoutEngine.toCSSVars()` / `.toDocxSection()` / `.toPDFOptions()`. Garante paridade tela ⇄ PDF ⇄ impressão ⇄ DOCX.
- Remoção de duplicações: deletar código morto em `PaginationExtension.ts` substituído pelo engine.
- Substituição final de `window.addEventListener('chart-data-update', ...)` e seletores `document.querySelector('.ProseMirror img[src=...]')` por estado/refs React.

## Compatibilidade

- Documentos existentes (Tiptap JSON) carregam direto em `DocumentModel.content`.
- Migração de `pageSetup`: defaults A4 + margens atuais quando ausente.
- Nenhuma migration de banco necessária (modelo é client-side; persistência continua usando `documents`/`exam_versions` existentes em `content` JSON).

## Não está no escopo

- Colaboração realtime (Yjs já existe e continua funcionando).
- Mudança no schema do banco.
- Reescrita do sistema de comentários (apenas integração ao DocumentModel).

## Entregáveis por fase

1. **F1**: 4 arquivos novos em `core/`, `RichEditor.tsx` adaptado, suíte de testes para o engine.
2. **F2**: `StyleManager.ts`, `ribbon/FileTab.tsx`, dialog de propriedades, dropdown de estilos.
3. **F3**: `HeaderFooterEditor.tsx`, `DynamicFields.ts`, `EditorStatusBar` aprimorado.
4. **F4**: módulos `io/*`, remoção de duplicações, testes E2E de paridade visual.

**Estimativa:** ~25–30 arquivos tocados/criados. Aprovação por fase recomendada para revisão incremental.

## Segurança

Scan atual está limpo (0 findings ativos). Achados antigos do painel (`newera_*`) foram marcados como corrigidos — funções não existem mais no banco.
