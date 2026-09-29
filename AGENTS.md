# Navegação do Swipe FEG com Code Review Graph

Neste computador, o Code Review Graph 2.3.9 está instalado em `.venv/` e o índice persistente fica em `.code-review-graph/`. Ambos são locais e não entram no Git. Em um novo computador, execute `python3 -m venv .venv`, `.venv/bin/python -m pip install -r requirements-graph.txt` e `.venv/bin/code-review-graph build` na raiz do projeto. O MCP `code_review_graph` também está disponível neste ambiente; sempre informe `repo_root` com o caminho deste projeto quando a detecção automática não for confiável.

## Antes de alterar código

1. Consulte a busca de nós ou o resumo de arquitetura para localizar a área relevante; use `get_minimal_context_tool` para mudanças pequenas e `get_impact_radius_tool` ou `detect_changes_tool` para avaliar efeitos em testes e consumidores.
2. Confirme qualquer resultado lendo o arquivo-fonte real. O grafo é um índice estrutural, não substitui a fonte nem prova que uma dependência ausente não existe.
3. Depois de alterar `index.html`, execute `npm run graph:sync`. `graph-sources/index-inline.generated.js` é apenas o espelho indexável do JavaScript inline: não o edite diretamente e não o carregue no site.
4. Execute `npm run graph:check`, os testes pertinentes e `.venv/bin/code-review-graph update --brief` para atualizar o índice. Se houver suspeita de índice incompleto, use `.venv/bin/code-review-graph build`.

## Consultas úteis

- `.venv/bin/code-review-graph status`: cobertura e atualização do índice.
- `.venv/bin/code-review-graph wiki`: documentação estrutural em `.code-review-graph/wiki/`.
- MCP `semantic_search_nodes_tool`: localizar funções por nome ou assunto; sem embeddings, usa busca textual.
- MCP `query_graph_tool`: `callers_of`, `callees_of`, `tests_for` e `file_summary`.
- MCP `get_architecture_overview_tool`, `list_communities_tool` e `list_flows_tool`: visão geral e fluxos.
- MCP `get_impact_radius_tool` ou `detect_changes_tool`: efeito provável de alterações; sempre confirme com testes.

O grafo cobre código JavaScript, Python e SQL. HTML, CSS, textos e arquivos ainda não rastreados pelo Git não entram como estrutura de código. Para esses materiais, use leitura e busca normais. Não habilite embeddings em nuvem sem autorização explícita, pois enviariam código a um provedor externo.

O espelho de `index.html` aparece no grafo como um arquivo JavaScript independente. Suas linhas não são as linhas reais de `index.html`, e o grafo pode não relacionar os testes que inspecionam o HTML ao espelho. Portanto, trate os avisos de “test gaps” e o risco calculado para esse arquivo como pistas, não como diagnóstico; confira `tests/` e execute a suíte antes de concluir.
