# Ingestão manual de ofertas e anúncios

O fluxo `n8n/workflows/swipe-manual-ingestion.json` recebe um manifesto enviado manualmente, valida todo o lote sem gravar e só aplica se a validação for aprovada. Ele não contém planilha, gatilho de horário ou credenciais do Supabase.

## Configuração

1. Gere um segredo aleatório de pelo menos 32 bytes.
2. Na Netlify, cadastre `N8N_MANUAL_INGEST_SECRET` com esse valor.
3. No ambiente do n8n, cadastre o mesmo `N8N_MANUAL_INGEST_SECRET`.
4. No n8n, cadastre `SWIPE_BASE_URL=https://benchmarkinggrupofeg.site`.
5. Importe `n8n/workflows/swipe-manual-ingestion.json`.
6. Teste com um manifesto pequeno e só então ative o webhook.

Se a instalação do n8n bloquear acesso a variáveis por expressões, substitua os dois headers `Authorization` por uma credencial Header Auth privada do n8n e mantenha o mesmo valor `Bearer <segredo>`.

## Segurança e idempotência

- O endpoint também aceita chamadas pela sessão do administrador, mas rejeita usuários comuns.
- O n8n recebe apenas o segredo do webhook; a credencial privilegiada do Supabase permanece na Netlify.
- O modo `validate` não escreve no banco.
- Cards existentes são atualizados; anúncios com a mesma URL canônica são ignorados.
- Reprocessar o mesmo lote não duplica o registro da atualização.
- A automação de mídia e transcrição existente assume os anúncios criados que ainda não tenham vídeo ou copy.

## Publicação gradual

Durante a validação, a seção `Atualizações` e o endpoint de ingestão ficam disponíveis apenas ao administrador. A liberação futura para leitura dos demais usuários deve ser feita em uma migração de RLS separada, sem ampliar permissão de escrita.
