---
name: swipe-manual-ingestion
description: Organiza, valida e importa no Swipe FEG ofertas, presells e anúncios enviados manualmente no chat. Use quando o usuário enviar um lote diário com nomes, nichos, quantidade de anúncios ativos, páginas/VSLs, checkouts, bibliotecas e links de anúncios e pedir para criar ou atualizar cards sem duplicidade.
---

# Ingestão Manual do Swipe

## Objetivo

Transformar os links e dados enviados manualmente pelo usuário em um manifesto auditável, validá-lo sem alterar o banco e só então aplicá-lo pelo fluxo `Swipe — Ingestão manual`. Este fluxo não usa planilha nem agendamento.

## Fluxo obrigatório

1. Leia [references/manifest-schema.md](references/manifest-schema.md).
2. Separe cada material por tipo: `oferta`, `brandsgeneral`, `brandsvalidated`, `presell` ou `criativo`.
3. Preserve os nomes comerciais e o nicho informados. Não invente métricas, imagens, links ou quantidade de anúncios.
4. Normalize os links apenas para comparação. Preserve a URL recebida no manifesto.
5. Una no mesmo item as novas VSLs, checkouts, bibliotecas e anúncios da mesma oferta. Não crie outro card quando o produto já existir.
6. Para cada anúncio de uma oferta, informe `creativeName` no padrão de nomenclatura vigente do nicho. Não altere nomes do Mega Brain.
7. Gere o manifesto JSON e execute primeiro com `mode: validate`.
8. Examine o plano retornado: quantidade de cards novos, cards atualizados, anúncios novos e duplicados ignorados.
9. Se houver colisão de produto, nicho inconsistente, URL sem origem clara ou um vínculo oferta/anúncio ambíguo, pare antes de aplicar e corrija o manifesto.
10. Execute o mesmo manifesto com `mode: apply` apenas depois da validação limpa.
11. Confirme os IDs criados ou atualizados e verifique os links diretos na seção administrativa `Atualizações`.

## Regras de qualidade

- Nunca vincule VSL, checkout ou anúncio a uma oferta apenas por proximidade no texto; o vínculo precisa estar explícito no lote.
- Considere URLs iguais após remover parâmetros de rastreamento como duplicadas.
- O mesmo domínio pode aparecer mais de uma vez somente quando o caminho da página/VSL for diferente.
- Não use caminhos locais do computador como mídia pública.
- Se não houver foto pública do produto, deixe `image` vazio; não use print incorreto como capa.
- `activeAds` deve ser numérico e vir do material do usuário ou de uma leitura confirmada.
- O anúncio criado a partir de uma oferta deve guardar `sourceOfferId` e `sourceOfferName`.
- Anúncios sem vídeo entram com arquivamento pendente; vídeos sem transcrição entram na fila de transcrição existente.
- Reexecutar o mesmo lote deve ser seguro: atualizar o card existente e ignorar anúncio já cadastrado.
- A seção de atualizações registra adições de materiais, não mudanças automáticas de métricas.

## Modos de execução

### Validação

Envie o manifesto ao webhook do n8n ou ao endpoint `/.netlify/functions/manual-ingest-n8n` com `mode: validate`. Nenhuma escrita deve ocorrer.

### Aplicação

Depois de conferir o plano, reenvie o mesmo manifesto com `mode: apply`. O endpoint aceita somente a sessão do administrador ou o segredo privado do n8n.

## Entrega ao usuário

Informe de forma curta:

- materiais criados;
- cards existentes atualizados;
- anúncios novos criados no Swipe de Criativos;
- duplicados ignorados;
- pendências reais de imagem, mídia ou transcrição.

Não declare sucesso se a aplicação ou a leitura posterior do card não tiver sido confirmada.
