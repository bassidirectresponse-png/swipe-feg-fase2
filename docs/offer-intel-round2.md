# Rodada 2 — documentos, funis e recusas do provedor

Base: main local 09a0c30, incorporada por fast-forward somente no worktree backend.
Nenhuma mudança em migrations, banco, versões de dependências ou frontend.

## Documento e navegação

A classificação v3 usa title/h1/path ou formulário do próprio documento para
quiz/checkout. Links de menu e CTAs que apontam para outra página não provam o
tipo da página atual. A extração estática exclui header/nav/footer/aside/head,
roles de navegação e contêineres de menu/drawer. Páginas legais, FAQ, contato e
about/our-saga ficam unknown; seus links não entram na exploração.

Links observados no conteúdo são ordenados com prioridade para CTA/quiz/checkout
e limitados a seis por página, antes da fila e das arestas. Redes sociais e
ações destrutivas são excluídas. Redirects HTTP continuam explícitos (teto cinco).
Ciclos e convergências entre links admitidos continuam preservados sem refetch.
Não há execução de JavaScript nem submissão de formulários.

Fixture real: tests/fixtures/offer-intel-shopify-our-saga.html, obtida por um GET
público sem credenciais em 2026-10-28. Scripts, estilos, SVG, comentários e
atributos não semânticos foram removidos; texto, nesting, header/nav/footer e
links foram mantidos. Todos os testes rodam offline com esta fixture ou HTTP FAKE.

## Resultado da fonte

Quando parte das páginas é inacessível, domain_explorer retorna succeeded com
aviso no campo error já existente: code=pages_inaccessible e quantidade afetada.
O frontend atual mostra essa mensagem junto ao status da fonte. O job pode
terminar succeeded se as demais fontes também concluírem. Não foi introduzido
um status novo. Nenhuma página acessível, prazo esgotado ou falha de persistência
continua sendo falha real da fonte; com dados duráveis, o job permanece partial.

Snapshots históricos não são apagados nem reclassificados retroativamente.
Uma nova investigação produz um novo funil com estas regras; não se deve esperar
que o mapa antigo de 262 arestas seja reescrito por esta alteração.
