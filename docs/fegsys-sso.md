# Entrada pelo FEGSYS

O login por usuário e senha do Swipe continua disponível. O SSO acrescenta a rota
`/sso#t=<JWT>`: o fragmento é removido da URL imediatamente, validado na função
Netlify e trocado por uma sessão Supabase somente quando a conta está vinculada.

## Configuração de produção

1. No **site Netlify do Swipe**, cadastre `ECOSYSTEM_SSO_SECRET_SWIPE` como variável
   secreta no escopo **Functions**, usando o mesmo segredo do emissor FEGSYS. Não
   coloque o valor no Git, em `netlify.toml`, no HTML ou em logs.
2. Confirme que `SUPABASE_SERVICE_ROLE_KEY` está disponível às Functions. A
   função recusa o handoff sem ela; o login por senha permanece independente.
3. Para cada conta existente do Swipe, grave o e-mail real do FEGSYS em
   `app_metadata.fegsys_email` com a API administrativa do Supabase. Use
   minúsculas e verifique que nenhum e-mail do FEGSYS pertence a duas contas.
   Não use `user_metadata`, que o próprio usuário pode editar.
4. Aponte `swipe.fegsys.com` para o deploy do Swipe e configure o FEGSYS para
   emitir o passe HS256 com `iss=fegsys`, `aud=swipe`, `email`, `iat` e `exp`
   (60 segundos). O destino deve ser `https://swipe.fegsys.com/sso#t=<passe>`.
5. Valide com uma conta vinculada, uma sem vínculo, passe expirado, passe com
   assinatura alterada e login por senha. Confirme que a URL final não tem
   fragmento e que os logs não contêm o passe nem o hash de uso único.

Sem o vínculo, a chave ou a service role, o SSO falha de forma fechada e o
usuário segue para o fluxo de login já existente.
