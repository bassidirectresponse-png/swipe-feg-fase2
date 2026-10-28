# Rodada 6 — Raio-X e coleta ampliada

Implementação própria, baseada no contrato 10.1/10.2. Nenhum código da extensão
foi copiado. Testes de rede usam fetch/transport/storage explicitamente FAKE.

## Raio-X

- `offer-intel-domain-scans` GET por job ou oferta e `offer-intel-domain-scan` GET
  por UUID usam o mesmo auth/admin/quota dos endpoints existentes. Resposta
  achatada, allowlist, sem HTML/JS bruto nem URL interna do player.
- Migration `202610280003_offer_intel_domain_scans.sql`: arquivo apenas; tabela
  nova, RLS admin SELECT, RPCs invoker service_role, escrita com lease/cancel
  fencing. Não modifica tabelas/RPCs existentes. Requer validação SQL real e
  aplicação autorizada antes de habilitar o novo runtime em produção.
- Scans guardam até 400 páginas/host, com proveniência e verificação real. WP,
  sitemap e OSINT apenas listam URLs; não significam página acessível. A visita
  real via crawl/probe é que pode marcar verified. Soft-404 exige sentinela,
  título diferente ou diferença de tamanho superior a 256 bytes; redirects de
  caminho não contam como probe encontrado.
- Teto de probes inclui a sentinela (120); concorrência 4; 25s e parada após
  oito respostas 403/429 (requisições já em voo podem terminar). OSINT: 8s/fonte.
  Sitemap index: um nível, dez filhos e 2000 locs. Todas as chamadas HTTP,
  inclusive scripts/player/HLS, passam por fetchPublicPage com DNS fixado e
  revalidação de redirects. Scripts: até seis por host, 512 KiB cada.
- Folga do background: deadline global 10 minutos; Apify recebe no máximo 4;
  crawl recebe no máximo 3 (inclui sua folga de 60s); scanner reserva 15s finais.
  Caps adicionais conservadores: 20 hosts, 200 requests/host, 600 requests/job,
  oito resoluções de mídia/host. Orçamento insuficiente fica explícito como fonte
  failed/scan partial, preservando dados. Fontes externas não derrubam o job.
- Pixels são observações de IDs; não provam propriedade comum. Checkout e tech
  dependem de host/atributo. CTA oculto é extraído sem executar JS nem formulário.
  VTurb/HLS usa melhor BANDWIDTH, altura RESOLUTION e soma EXTINF apenas com
  ENDLIST. MP4 só tem duração se o mvhd estiver no prefixo de 512 KiB; nunca há
  download integral de mídia. URLs com credenciais/tokens são omitidas.
- Domínio registrável reutiliza o helper local existente (heurística de sufixos
  comuns, não uma lista PSL completa). Sites que exigem JS/autenticação continuam
  fora do alcance. A extração estática não promete descobrir URLs não publicadas.

## Validação

`tests/offer-intel-round6-scans.test.mjs`: sitemap/WP/OSINT sucesso e falha,
soft-404/redirect/403/429/tempo, pixels, checkout/tech, CTA oculto, assets,
VTurb/HLS/MP4, SSRF incluindo hosts externos, endpoints admin e cancelamento.
Sem chamadas pagas, deploy, escrita SQL ou captura visual nesta tarefa.
