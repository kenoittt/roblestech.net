-- Who can actually read the handbook? Asked of the live database, per role.
--
-- The bug this guards against: is_ppm_user() reads public.profiles, and
-- profiles' SELECT policy calls is_ppm_user(). Without SECURITY DEFINER that
-- inner read re-enters the policy and the function calls itself until the
-- stack runs out. Admins never saw it: the policy is
-- (id = auth.uid() or is_admin() or is_ppm_user()), is_admin() IS security
-- definer, and for an admin it returns true and short-circuits the OR before
-- is_ppm_user() is reached. Staff fell through and recursed.
--
-- So a check that tries one admin passes while every member of staff is
-- locked out. Trying one account of EVERY role is the whole point.
create temporary table if not exists rls_probe(
  role text, person text, is_ppm_user boolean, own_profile int,
  categories int, articles int, err text
) on commit drop;

do $$
declare r record; v_ppm boolean; v_own int; v_cat int; v_art int;
begin
  for r in
    select distinct on (p.role) p.role, p.id, p.full_name
    from public.profiles p
    where p.role in ('super_admin','admin','staff','client')
    order by p.role, p.full_name
  loop
    begin
      set local role authenticated;
      perform set_config('request.jwt.claims',
              json_build_object('sub', r.id::text, 'role','authenticated')::text, true);

      select public.is_ppm_user() into v_ppm;
      select count(*) into v_own from public.profiles where id = r.id;
      select count(*) into v_cat from public.kb_categories;
      select count(*) into v_art from public.kb_articles;

      reset role;
      insert into rls_probe values (r.role, r.full_name, v_ppm, v_own, v_cat, v_art, null);
    exception when others then
      reset role;
      insert into rls_probe values (r.role, r.full_name, null, null, null, null, sqlerrm);
    end;
  end loop;
end $$;

select * from rls_probe order by
  case role when 'super_admin' then 1 when 'admin' then 2 when 'staff' then 3 else 4 end;
