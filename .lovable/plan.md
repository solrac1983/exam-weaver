## Contexto

O prompt mestre define 50+ seções para transformar o editor em produto 10/10 estilo Word Online. As fases 1-2 já foram entregues (DocumentModel central, PageLayoutEngine, StyleManager, DocumentContext, FileTab). Não é viável executar as 50 seções em um único turno sem quebrar o editor — precisamos continuar incrementalmente, respeitando a ordem oficial (seção 50 do prompt) e mantendo o editor funcional a cada passo.

## Próximas fases propostas (3 a 5)

Vou implementar as **3 próximas fases incrementais**, cada uma testável e independente:

### Fase 3 — Barra de Status + Painel de Estilos
1. `EditorStatusBar.tsx` — barra inferior fixa com: página atual/total, palavras, caracteres, idioma, status de salvamento, zoom (+/−), botões de modo de exibição. Lê dados do `DocumentContext` e Tiptap (`editor.storage.characterCount`).
2. `StylesSidePanel.tsx` — painel lateral recolhível listando estilos do `StyleManager` (Normal, Título 1-3, Questão, Alternativa, Gabarito, etc.) com ações: aplicar ao bloco, atualizar a partir da seleção, criar novo.
3. Integrar ambos ao `RichEditor.tsx` sem quebrar o layout atual; painel toggleável via aba "Exibição".

### Fase 4 — Blocos estruturados de Questão
1. `extensions/QuestionBlockExtension.ts` — Node Tiptap com attrs (`id, number, subject, difficulty, points, answer, tags`).
2. `extensions/AlternativeListExtension.ts` + `AlternativeItemExtension.ts` — lista com letras A-E e flag `isCorrect`.
3. Numeração reativa atômica (reaproveita `AutoNumbering` existente, mas atrelada ao node em vez de regex).
4. Migração leve: detector que oferece "converter para QuestionBlock" em parágrafos antigos `Questão N)` (não-destrutivo, opt-in).
5. Comando `setQuestionBlock()` exposto na aba "Provas" (criar a aba ProvasTab no ribbon).

### Fase 5 — Gabarito automático + Validador
1. `editor-core/education/AnswerKeyModel.ts` — coleta respostas dos `QuestionBlock` e gera estrutura `{ number, letter, subject }`.
2. `AnswerKeyPanel.tsx` (painel lateral) — renderiza tabela de gabarito, indica pendências (sem resposta), permite copiar/exportar.
3. `editor-core/education/ExamValidator.ts` — checa: questão sem enunciado, sem alternativa correta, alternativa vazia, gabarito incompleto. Resultados exibidos no painel.

## Princípios mantidos
- Compatibilidade total com conteúdo Tiptap atual; nenhum node antigo é removido automaticamente.
- Nenhuma feature anterior é deletada — apenas estendida ou paralela.
- Todo novo arquivo segue arquitetura `src/editor-core/...` quando faz parte do core, e `src/components/editor/...` quando é UI.
- Estado React + DocumentContext; sem `querySelector` exceto onde Tiptap exige.

## Fora deste lote (próximos turnos)
Fases 6+ (Cabeçalho/Rodapé editáveis avançados, Importação/Exportação DOCX profissional, Comentários completos, Controle de alterações, IA contextual unificada, Banco de Questões, Templates, Colaboração persistente, Histórico de versões, Performance/cache, Testes) — serão entregues nos turnos seguintes seguindo a ordem da seção 50.

## Detalhes técnicos
- Status bar consome `editor.storage.characterCount` (já existe em `RichEditor.tsx`) e `usePageLayout()` para total de páginas.
- Style panel usa `useDocument()` para ler/atualizar `model.styles`.
- QuestionBlock será `Node.create({ name: 'questionBlock', group: 'block', content: 'block+' })` com NodeView React para mostrar número editável.
- AnswerKey faz traversal via `editor.state.doc.descendants` filtrando por `node.type.name === 'questionBlock'`.

## Segurança
Findings ativos no painel são de outro projeto (verificado: nenhuma função/bucket `newera_*` existe). Scan atual está limpo. Sem ações necessárias.

## Confirmação
Aprova prosseguir com **Fases 3-5** neste turno? Se preferir um escopo menor (só Fase 3, ou só Fase 4), me avise.