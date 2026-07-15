# Validação da refatoração

Medição local em Node 22, em 15/07/2026. O script reproduz o parser de Markdown
real do projeto e compara a busca linear com a busca binária usada no karaokê.

Comando: `node tests/performance.mjs`

## Resultados

- Streaming, 200 chunks a cada 20 ms: 200 atualizações / 15,55 ms antes; 50 /
  3,66 ms depois do buffer de 80 ms (75% menos commits de HTML).
- Karaokê, 10.000 palavras e 36.000 frames: busca linear 320,33 ms; busca
  binária 2,83 ms no ensaio isolado, cerca de 113× mais rápida.
- Em execução, somente a palavra anterior e a atual mudam de classe por frame;
  o corpo completo da transcrição não é re-renderizado.

## Verificações

- `node --test tests/refactor.test.mjs`: 6/6.
- `node --check netlify/functions/transcribe-file.mjs`: sem erros.
- JavaScript inline compilado com `new Function`: sem erros.
- Navegador local: tela inicial renderizada e console sem erros/avisos.
- Preview Netlify: deep links responderam HTTP 200 pelo fallback da SPA; funções
  foram empacotadas e a configuração do Groq respondeu `ready: true`.

As integrações autenticadas (gravação no Supabase, Groq e deploy) dependem das
credenciais/variáveis do ambiente conectado e devem ser validadas no preview da
Netlify após a publicação.

## Decisões e limites da stack

- Transcrições avulsas persistem texto, segmentos e palavras no Netlify Blobs;
  o áudio continua local e descartável. O permalink pode ser aberto por qualquer
  usuário autenticado do painel.
- Como a aplicação é uma SPA estática, a Netlify entrega `index.html` com HTTP
  200 em deep links. Categorias/itens inválidos renderizam uma tela 404, título
  404 e navegação de retorno no cliente; um status HTTP 404 dinâmico exigiria
  mover o roteamento para uma camada server-side que não existe nesta stack.
