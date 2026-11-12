# Taxonomia de nichos — 12/11/2026

`lib/niche-catalog.json` é o cadastro central: grupos, temas, sinônimos, consultas e feeds. `npm run taxonomy:sync` atualiza seu espelho público; o build exige que os dois coincidam. UI e funções usam o mesmo classificador JS; o coletor Python tem teste de equivalência com ele. Classificação exige assunto e contexto no mesmo trecho, prioriza o título e separa conteúdo veterinário. Notícias não consulta pools genéricos. TikTok mantém terça/sexta, rodiziando três consultas específicas por grupo para preservar o volume de coleta.

A estrutura comercial SUPPLEMENTS/PET/SKIN CARE permanece independente dos nichos de pesquisa. Memória, Visão, Audição, Ansiedade e Cabelo/Unhas foram preservados no cadastro central. Nenhum resultado sem evidência é inserido por um fallback genérico. Vídeos/notícias ambíguos já existentes recebem `taxonomyStatus: review`; seu conteúdo permanece no banco, fora dos feeds de pesquisa.

## Migração dos dados

O projeto armazena categorias em `offers.data` (JSON), sem tabela própria de nichos. O script versionado utiliza a mesma sessão temporária OIDC já usada nas manutenções e o RPC atômico `swipe_merge_offer_data`.

1. `node scripts/migrate_niche_taxonomy.mjs` confere o plano sem gravar.
2. `node scripts/migrate_niche_taxonomy.mjs --apply` aplica em lotes por cursor.
3. Repita a inspeção: `changed: 0` confirma idempotência.

Cada registro alterado tem cópia integral anterior no store privado Netlify `niche-taxonomy-backups`, chave `2026-11-12/<id>.json`. Apenas nicho, subnicho e metadados da classificação são mesclados. IDs, produtos, anúncios, favoritos, bibliotecas, mídias, métricas e referências permanecem. A migração pode ser retomada após falha; nunca usa DELETE nem substitui o JSON inteiro. Para reversão assistida, use o backup e restaure apenas os campos de classificação, preservando atualizações posteriores dos demais campos.

Rascunhos de formulário em edição não são descartados. O cache de leitura é invalidado por versão; links antigos com tema são remapeados juntos. Acesso a `/swipe-organic` (inclusive detalhes) redireciona para Ofertas Brands com aviso; os registros originais não são alterados. Importação e filas de processamento desse módulo ficam desativadas, mantendo os serviços compartilhados.

## Validação

A suíte testa remanejamentos, contexto multilíngue, exclusão de assuntos genéricos, separação veterinária/humana, deduplicação, autenticação, backup antes da gravação e segunda aplicação sem alterações. Fontes RSS podem ser verificadas com `DRY_RUN=1 python3 scripts/noticias_ingest.py`, sem gravações. `--dry` do TikTok ainda consulta o provedor e pode consumir créditos; não é necessário para validar as regras locais.
