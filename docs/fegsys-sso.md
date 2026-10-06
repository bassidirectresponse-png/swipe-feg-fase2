# Entrada pelo FEGSYS

O Swipe mostra somente a entrada corporativa pelo Google do FEGSYS. A rota
`/sso#t=<JWT>` remove imediatamente o fragmento da URL, valida o passe na
função Netlify e troca-o por uma sessão Supabase. Somente e-mails autenticados
do domínio exato `@grupofeg.com` são aceitos. Todos entram como leitores,
exceto `guilherme.bassi@grupofeg.com`, vinculado à conta administrativa
preexistente do Swipe.

## Configuração de produção

1. No **site Netlify do Swipe**, cadastre `ECOSYSTEM_SSO_SECRET_SWIPE` como variável
   secreta no escopo **Functions**, usando o mesmo segredo do emissor FEGSYS. Não
   coloque o valor no Git, em `netlify.toml`, no HTML ou em logs.
2. Confirme que `SUPABASE_SERVICE_ROLE_KEY` está disponível às Functions. A
   função recusa o handoff sem ela; o login por senha permanece independente.
3. A conta administrativa interna `adminswipefeg@swipefeg.app`, com o ID
   `ff9e002e-7ed1-4bc3-8571-18ffcb0c95c3`, deve continuar existente.
   O SSO confere ID e e-mail antes de criar a sessão do administrador.
   Para leitores, o `generate_link` administrativo cria a conta corporativa
   na primeira entrada, quando necessário, sem enviar e-mail.
4. Aponte `swipe.fegsys.com` para o deploy do Swipe e configure o FEGSYS para
   emitir o passe HS256 com `iss=fegsys`, `aud=swipe`, `email`, `iat` e `exp`
   (60 segundos). O destino deve ser `https://swipe.fegsys.com/sso#t=<passe>`.
5. Valide com a conta administrativa e uma conta leitora nova, passe expirado,
   passe com assinatura alterada e e-mail fora do domínio. Confirme que a URL final não tem
   fragmento e que os logs não contêm o passe nem o hash de uso único.

Sem a chave ou a service role, o SSO falha de forma fechada e o usuário vê a
entrada Google para tentar novamente. A remoção do formulário de senha não
revoga, por si só, senhas e sessões antigas armazenadas no Supabase; essa
revogação precisa ser feita separadamente antes de considerar a migração
exclusivamente Google concluída no backend.
