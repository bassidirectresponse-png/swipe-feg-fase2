# Navegação FEG Brands (prévia administrativa)

## Contrato visual

- **Todos** continua exibindo o acervo completo.
- Ofertas no Geral, Ofertas Insider e Swipe de Criativos exibem **nicho → produto → cards** no painel admin.
- O nome do produto vem dos dados da oferta; criativos com o mesmo nome de produto/marca herdam o nicho da oferta. Se não houver correspondência confiável, ficam em **Pendente de revisão**, sem serem apagados.
- Novos nichos inseridos nas ofertas passam a aparecer automaticamente nas três navegações. Os nichos legados que não correspondem à taxonomia aprovada permanecem pendentes para classificação manual.
- O card do Insider continua limpo; métricas, períodos, top ads e histórico do gráfico permanecem dentro do detalhe.

## Taxonomia inicial

Saúde masculina; Saúde feminina; Saúde Cardiovascular; Saúde íntima / libido; Sono/ Beleza; Saúde Geral/Nutrição.

## Notícias e Radar TikTok

No admin, a navegação de Notícias 24h e Radar TikTok também usa os nichos atuais das ofertas. Algumas categorias legadas claramente equivalentes são agrupadas visualmente; os dados originais não são regravados e seus links antigos continuam aceitos.

Os coletores de notícias e TikTok têm consultas preparadas para os seis nichos. A coleta agendada continua na configuração anterior até `ENABLE_BRAND_NICHES=1` ser ativado após validação. `python3 scripts/tiktok_mining.py --list-taxonomy` mostra a configuração sem acessar o provedor ou gastar créditos. Para qualquer nicho novo, revisar também as palavras-chave dos coletores antes da ativação: a seção visual é automática, mas a relevância de uma busca externa não pode ser inferida com segurança só pelo nome do nicho.
