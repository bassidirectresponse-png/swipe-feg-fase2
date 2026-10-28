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

## Recusa definitiva do Apify e recuperação

POST com HTTP 401/402/403/422 e mensagem de erro JSON do Apify registra o
provider_run como failed, sem run_id, com usage.last_error.code=provider_rejected.
A fonte expõe provider_rejected e a mensagem sanitizada (tokens, credenciais,
URLs e markup removidos). Uma tentativa futura pode iniciar outro POST, somente
depois de uma nova reserva diária atômica. A reserva anterior não é devolvida.
O número da tentativa compõe a chave de reserva; retries concorrentes da mesma
tentativa compartilham a reserva e o CAS permite somente um POST.

Timeout, falha de rede, 5xx ou resposta sem prova estruturada de recusa continuam
unknown: retries apenas reconciliam, sem novo POST. As chaves de reconciliação
de registros antigos permanecem compatíveis.

O job e908337a já está unknown sem run_id e não contém prova persistida da
recusa. Esta mudança não o converte retroativamente em failed. Se a reconciliação
não localizar um run, permanece unknown. Depois de resolver a cobrança da conta
e cumprir o cooldown de seis horas, criar uma nova investigação para a mesma
oferta, com nova chave de idempotência, produz um job novo e permite nova coleta.
Não apagar o provider_run nem devolver sua reserva para forçar um POST.

Validação local: respostas e rede do Apify são FAKE explicitamente identificadas;
nenhum POST real, operação paga, escrita em produção ou deploy foi realizado.
