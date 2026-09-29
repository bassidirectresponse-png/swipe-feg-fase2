# Padrão das Ofertas Insider

Esta é a regra para os produtos atuais e os próximos produtos de Ofertas Insider. A apresentação está em validação no painel admin; os dados publicados e as demais seções não são alterados por essa camada visual.

## Navegação

- “Todos” apresenta as seções Saúde masculina, Saúde feminina, Saúde Cardiovascular, Saúde íntima / libido, Sono/ Beleza e Saúde Geral/Nutrição.
- Cada nicho contém uma subseção por produto; vários cards do mesmo produto permanecem juntos. O link direto usa `?marca=<slug-do-produto>`.
- Ultima Peak, Primal Viking, Mars Men Boost e JOYMODE HARD+ pertencem a Saúde masculina. Ancestral Supplements pertence a Saúde Geral/Nutrição.
- A origem de nicho anterior permanece preservada no registro. Links antigos de detalhe redirecionam para a rota de nicho exibida no admin.

## Card e detalhe

- Card limpo: capa, marca, produto, nicho e atalhos úteis. Gastos, contagens de anúncios, leitura da BM e demais métricas ficam apenas no detalhe.
- Clicar na capa do card abre o detalhe, não a foto ampliada.
- O detalhe mantém todos os dados históricos e o gráfico de anúncios ativos quando o produto possui `adsHistory`. A ausência de histórico não deve gerar uma série fictícia.
- Leituras da BM são agrupadas por data de coleta e período de análise, preservando leituras anteriores e permitindo várias leituras no mesmo mês.
- Top ads usam o formato “Anúncio N — Mês Ano — intervalo”, somente quando o intervalo foi vinculado explicitamente ao anúncio (`bmRange`, `analysisRange` ou `dataRange`). Na ausência dele, mostram a data de registro (`sourceDate` ou `downloadedAt`); nunca inferir um intervalo de análise a partir da data de download.
- Os prints não são exibidos como substituto dos dados estruturados da BM no painel admin. A fonte publicada e seus anexos históricos permanecem armazenados.

## Atualizações futuras

Ao cadastrar uma nova leitura mensal, acrescentar relatórios com chave e intervalo próprios, sem substituir as leituras existentes. Ao cadastrar um top ad, registrar o mês e a data de origem; adicionar intervalo apenas se houver correspondência documental com uma leitura da BM. Validar o visual no admin antes de liberar a apresentação para os demais usuários.
