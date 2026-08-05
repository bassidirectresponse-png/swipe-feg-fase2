-- Somente o administrador humano pode criar e excluir cards.
-- A conta noticias-bot permanece autorizada apenas a atualizar cards existentes
-- e arquivar a mídia produzida pelas automações internas.

create or replace function public.swipe_is_admin()
returns boolean
language sql
stable
set search_path = public
as $$
  select lower(coalesce(auth.jwt()->>'email', '')) = 'adminswipefeg@swipefeg.app';
$$;

revoke all on function public.swipe_is_admin() from public;
grant execute on function public.swipe_is_admin() to authenticated, service_role;

create or replace function public.swipe_can_write()
returns boolean
language sql
stable
set search_path = public
as $$
  select public.swipe_is_admin()
    or lower(coalesce(auth.jwt()->>'email', '')) = 'noticias-bot@swipefeg.app';
$$;

revoke all on function public.swipe_can_write() from public;
grant execute on function public.swipe_can_write() to authenticated, service_role;

-- Substitui as políticas antigas sem depender da ordem em que a migração base
-- foi aplicada. Leitura continua disponível para todos os usuários logados.
drop policy if exists "offers_insert_admin" on public.offers;
drop policy if exists "offers_update_admin" on public.offers;
drop policy if exists "offers_delete_admin" on public.offers;

create policy "offers_insert_admin"
  on public.offers for insert to authenticated
  with check (public.swipe_is_admin());
create policy "offers_update_admin"
  on public.offers for update to authenticated
  using (public.swipe_can_write())
  with check (public.swipe_can_write());
create policy "offers_delete_admin"
  on public.offers for delete to authenticated
  using (public.swipe_is_admin());
