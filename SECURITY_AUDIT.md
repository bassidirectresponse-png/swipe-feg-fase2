# Auditoria e hardening de segurança

Data: 20 de julho de 2026  
Branch: `security/autonomous-hardening`  
Escopo: repositório Swipe FEG Fase 2, configuração Netlify, funções serverless, políticas Supabase versionadas e pipelines GitHub Actions.

## Resumo executivo

A aplicação foi inventariada e endurecida com base no OWASP Top 10:2025, OWASP ASVS 5.0 Level 2, WSTG, Cheat Sheet Series e NIST SP 800-63B-4. Foram corrigidos 16 achados confirmados: 5 altos, 7 médios e 4 baixos. Os controles incluem autenticação e autorização no servidor, rate limiting distribuído, limites de corpo e download, proteção SSRF, validação de mídia por assinatura, CORS restrito, CSP com hash, SRI, políticas de upload, CI de segurança, secret scanning do código e de todo o histórico Git e SBOM.

Não foram encontrados segredos no estado atual nem em todo o histórico Git acessível examinado. Há, porém, um bloqueio externo crítico: uma credencial de conta de serviço Google foi divulgada fora do repositório. Como não há acesso de gerenciamento IAM autorizado neste ambiente, sua revogação e rotação não puderam ser confirmadas. O código agora recusa essa integração até que o identificador exato de uma nova chave aprovada também seja configurado.

O release não deve ser liberado enquanto os gates externos da seção **Bloqueios para liberação** não forem concluídos.

## Arquitetura e ativos

- Frontend: SPA estática em HTML, CSS e JavaScript, publicada pela Netlify.
- Backend: funções Netlify em Node.js ESM, empacotadas com esbuild.
- Identidade e banco: Supabase Auth, Postgres/RLS e Storage.
- Persistência auxiliar: Netlify Blobs para rate limiting e jobs longos.
- Integrações: BigQuery, Google Drive, Meta/Apify, Groq e provedores de IA.
- Automação: GitHub Actions, tarefas agendadas Netlify e scripts Python de ingestão/transcrição.
- Dados relevantes: perfis e funções de usuário, criativos e mídias, transcrições, métricas de anúncios, jobs de VSL e credenciais de integração mantidas no ambiente do servidor.
- Não detectados no escopo: pagamentos, webhooks de cobrança, WebSockets próprios ou recursos multi-tenant com seleção de tenant pelo cliente.

### Fronteiras de confiança

1. Navegador não confiável → Netlify Functions: bearer token, origem, método, tipo e tamanho precisam ser validados.
2. Netlify Functions → Supabase: identidade do usuário e papel administrativo são conferidos no servidor.
3. Netlify Functions → Internet: URLs remotas passam por allowlist, resolução DNS, bloqueio de redes privadas e revalidação de redirects.
4. Netlify Functions → IA/BigQuery/Apify: segredos permanecem no ambiente do servidor; mensagens externas são redigidas.
5. Browser/Functions → Storage: upload é limitado por autorização, bucket, caminho, extensão, MIME, tamanho e assinatura do arquivo.
6. GitHub Actions → repositório/provedores: permissões mínimas, actions fixadas por SHA e credenciais fora de URLs.

## Inventário de endpoints

| Endpoint | Método | Autenticação e permissão | Entrada/limite principal | Operação sensível e proteção |
|---|---|---|---|---|
| `/.netlify/functions/feguinho` | POST | usuário Supabase | JSON até 128 KiB; 20/min | IA; CORS restrito, validação e erro seguro |
| `/.netlify/functions/furtado` | POST | usuário Supabase | JSON até 256 KiB; 12/min | geração de copy; mesmas proteções |
| `/.netlify/functions/transcript` | POST | usuário Supabase | JSON até 4 MiB; cotas por operação | transcrição/IA; conteúdo e resposta limitados |
| `/.netlify/functions/transcribe-file` | POST | usuário Supabase | WAV até 12 MiB; cota | upload de áudio; MIME e assinatura WAV |
| `/.netlify/functions/transcribe` | POST | administrador | JSON limitado e URL do Storage aprovada | mídia até 24 MiB; allowlist, SSRF e assinatura |
| `/.netlify/functions/transcribe-background` | POST | administrador | JSON limitado; 20/h | mídia até 40 MiB, retries controlados e erros seguros |
| `/.netlify/functions/vsl-dissector` | POST | usuário Supabase | JSON até 12 MiB; 4/10 min | cria análise longa; ownership e validação |
| `/.netlify/functions/vsl-dissector-background` | POST interno | job autenticado/validado | chave e fases validadas | processamento em partes, estado e replay protegidos |
| `/.netlify/functions/vsl-job` | GET/POST | usuário Supabase e proprietário | leitura/escrita com cotas; até 12 MiB | consulta e atualização de job sem IDOR |
| `/.netlify/functions/fb-ingest-background` | POST | administrador com automação | JSON limitado; 20/h | download até 60 MiB; URL Meta, SSRF e assinatura de mídia |
| `/.netlify/functions/brain-drive-ingest-background` | POST | administrador | JSON limitado; 12/h | Drive allowlist; mídia até 150 MiB e assinatura |
| `/.netlify/functions/fegsys-megabrain` | GET | administrador | filtros de período normalizados; cota | consulta BigQuery; credencial validada e erros redigidos |
| `/.netlify/functions/fegsys-sync` | agendado | invocação agendada Netlify | execução horária | sincronização BigQuery; resposta e logs seguros |

Todas as respostas serverless recebem headers de segurança consistentes. Preflight só é aceito para origens explicitamente permitidas. Rotas não listadas são o fallback da SPA e não constituem autorização.

## Achados corrigidos

| ID | Severidade | Achado confirmado | Correção aplicada |
|---|---|---|---|
| H-01 | Alta | Autenticação e papel administrativo inconsistentes entre funções | Middleware central valida bearer token no Supabase e papel administrativo no servidor |
| H-02 | Alta | Downloads remotos permitiam superfície de SSRF e redirects não revalidados | HTTPS obrigatório, allowlist, DNS, bloqueio de IP privado/link-local e revalidação de cada redirect |
| H-03 | Alta | Uploads/downloads grandes ou disfarçados podiam consumir memória e persistir conteúdo incompatível | Streaming com teto, Content-Length, MIME, extensão e magic bytes para os formatos aceitos |
| H-04 | Alta | Endpoints caros não tinham contenção uniforme de abuso | Rate limiting por identidade/IP em Netlify Blobs, atualização atômica CAS e fail closed em produção |
| H-05 | Alta | Jobs de VSL podiam sofrer acesso indevido, replay ou transição inválida | Ownership, UUID/chave, fase, estado obsoleto, limites e cotas validados no servidor |
| M-01 | Média | CORS permissivo/inconsistente e headers divergentes | Allowlist exata de origens, preflight restrito e headers centralizados |
| M-02 | Média | Token de provedor em query string e propagação de corpos de erro externos | Token movido para header e erros externos substituídos por mensagens seguras |
| M-03 | Média | Scripts CDN flutuantes e política de script inline ampla | Versões exatas, SRI e CSP com hash do único bundle inline |
| M-04 | Média | Credencial BigQuery sem validação estrutural e sem gate de rotação | Projeto, e-mail, endpoint, chave, tamanho e identificador esperado são exigidos |
| M-05 | Média | Actions flutuantes e PAT incorporável na URL de clone | Actions fixadas por commit, `persist-credentials: false` e token entregue pelo mecanismo oficial |
| M-06 | Média | Regras Storage não restringiam de modo completo caminho, tamanho, extensão e MIME | Políticas retrocompatíveis com autorização, bucket, path, tamanho, extensão e MIME |
| M-07 | Média | Método, Content-Type e corpo não eram limitados de maneira uniforme | Parsers centrais rejeitam método/tipo incorretos, JSON inválido e excesso de bytes |
| L-01 | Baixa | Cache e proteções do navegador insuficientes | `no-store` no app, HSTS, nosniff, frame denial, referrer e permissions policy |
| L-02 | Baixa | Ausência de gates automatizados de segurança | Workflow com build, testes, npm audit, pip-audit, secret scan, CSP, SBOM e CodeQL |
| L-03 | Baixa | Scripts SQL antigos poderiam reintroduzir políticas de upload frágeis | Scripts legados foram alinhados ao hardening e testados contra regressão |
| L-04 | Baixa | Higiene de configuração e supply chain incompleta | `.env.example`, ignores de backups/segredos, Dependabot e SBOM CycloneDX |

## Segredos e credenciais

- Scanner atual: 78 arquivos, sem achados.
- Histórico Git: todas as branches, tags, commits e blobs acessíveis, sem achados.
- O scanner cobre arquivos ocultos e não rastreados, texto e `.b64`, além de todas as branches/tags acessíveis pelo Git.
- O relatório deliberadamente não contém valores, trechos ou fingerprints derivados de material sensível exposto fora do repositório.
- O identificador público e a chave anônima pública do Supabase não são tratados como segredo; autorização continua dependente de RLS e validação no servidor.

### Bloqueio externo crítico

Uma chave privada de conta de serviço Google foi divulgada fora do Git. A ocorrência não foi reprocessada nem armazenada para gerar fingerprint. É obrigatório:

1. Revogar a chave antiga no Google Cloud IAM.
2. Criar uma chave nova para uma conta de serviço com somente as permissões BigQuery necessárias.
3. Atualizar o JSON protegido no ambiente Netlify e configurar `GOOGLE_SERVICE_ACCOUNT_EXPECTED_KEY_ID` com o identificador da nova chave.
4. Fazer novo deploy e verificar que a nova credencial funciona e a antiga falha.

Sem o item 3, a integração FEGSYS falha de forma fechada por projeto.

## Validações executadas

| Gate | Resultado |
|---|---|
| Build estático | aprovado; `index.html` e um bundle inline válidos |
| Testes Node | 52/52 aprovados |
| Sintaxe das funções/scripts ESM | aprovada |
| CSP/hash do bundle | aprovado; hash exato conferido |
| Secret scan atual + Git completo | aprovado; zero achados |
| `npm audit --omit=dev --audit-level=low` | aprovado; zero vulnerabilidades conhecidas |
| `pip-audit` das dependências de transcrição | aprovado; zero vulnerabilidades conhecidas |
| Árvore npm | íntegra |
| SBOM CycloneDX | gerada e validada localmente; 51 componentes |
| Whitespace/diff | aprovado |

CodeQL e o workflow completo foram adicionados, mas só produzirão evidência independente após execução no GitHub Actions.

## Bloqueios para liberação

1. **Crítico — Google Cloud:** revogar/rotacionar a chave exposta e confirmar o gate do novo identificador na Netlify.
2. **Banco — Supabase:** criar backup/ponto de recuperação, validar em staging e aplicar `db/storage-upload-hardening.sql`; confirmar que as policies resultantes estão ativas.
3. **Identidade — Supabase Auth:** pelo painel de gerenciamento, revisar MFA/passkeys para administradores, política e bloqueio de senhas, rotação de refresh token, duração de sessão, CAPTCHA e limites de login/recuperação.
4. **Repositório — GitHub:** habilitar branch protection, checks obrigatórios, revisão, secret scanning e push protection, quando disponíveis no plano.
5. **CI:** executar e aprovar os workflows Security gates e CodeQL na branch antes do merge.

## Riscos residuais e decisões

- O bucket público de criativos permanece público por requisito funcional. Isso preserva URLs diretas, mas qualquer mídia nele deve ser considerada publicamente legível. Migrar para bucket privado e signed URLs exige mudança arquitetural.
- O SDK Supabase no navegador mantém tokens no armazenamento suportado pelo cliente. A CSP reduz risco de XSS, mas sessões HttpOnly exigiriam um BFF e migração arquitetural.
- `style-src 'unsafe-inline'` permanece para estilos inline e atributos do app monolítico. Scripts não usam `unsafe-inline`; a remoção de estilo inline requer extração ampla de CSS.
- Netlify Blobs é dependência obrigatória do rate limiting em produção. Indisponibilidade resulta em bloqueio seguro das operações protegidas.
- DAST autenticado não foi executado contra produção e nenhum ataque de carga/força bruta foi realizado. Uma execução não destrutiva deve ocorrer em preview/staging com serviços isolados.
- A função agendada FEGSYS depende da garantia de invocação interna da plataforma Netlify e não deve ser exposta como endpoint regular.

## Rollback e implantação segura

- Os commits foram separados por categoria para permitir reversão seletiva.
- As mudanças SQL são aditivas/retrocompatíveis, mas só devem ser aplicadas após backup e teste de upload/leitura em staging.
- Em caso de regressão de aplicação, reverta o commit da categoria afetada; não reverta a rotação da credencial nem reintroduza a chave comprometida.
- Após deploy de preview, testar login de usuário/admin, CORS, uploads válidos e inválidos, ingestões, transcrição, jobs longos, FEGSYS e expiração das cotas antes de promover para produção.

## Critério de conclusão

O código e a configuração versionada atendem aos gates locais definidos nesta auditoria. A conclusão operacional e a liberação permanecem condicionadas aos cinco bloqueios externos acima. Esta auditoria reduz riscos conhecidos no escopo examinado, mas não constitui garantia de segurança absoluta.
