-- /fast becomes a public enrollment form: no NectarPay account is needed to submit.
alter table public.fast_enrollments alter column enrolled_by drop not null;
alter table public.fast_enrollments add column if not exists ip text;

-- Coin-taken check for the public form: existence only, never the merchant record.
create or replace function public.fast_enrollment_coin_taken(_coin_id text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.fast_enrollments where coin_id = _coin_id
  );
$$;

-- Submissions recorded from one address in the last _minutes: abuse control.
create or replace function public.fast_enrollment_ip_recent(_ip text, _minutes int)
returns int
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select count(*)::int
  from public.fast_enrollments
  where ip = _ip
    and created_at > now() - make_interval(mins => greatest(coalesce(_minutes, 0), 0));
$$;

revoke all on function public.fast_enrollment_coin_taken(text) from public;
revoke all on function public.fast_enrollment_ip_recent(text, int) from public;
grant execute on function public.fast_enrollment_coin_taken(text) to anon, authenticated;
grant execute on function public.fast_enrollment_ip_recent(text, int) to anon, authenticated;
grant all on public.fast_enrollments to service_role;