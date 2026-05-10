-- JLPT 단어장 쓰기 전환 보조 컬럼
-- 5단계(JLPT단어장 쓰기 기능 Supabase 전환) 전에 실행하세요.

alter table public.jlpt_wordbooks
  add column if not exists sort_order int;

with ranked as (
  select
    id,
    row_number() over (partition by level order by created_at, id) as rn
  from public.jlpt_wordbooks
  where sort_order is null
)
update public.jlpt_wordbooks w
set sort_order = ranked.rn
from ranked
where w.id = ranked.id;

create index if not exists jlpt_wordbooks_user_level_sort_idx
  on public.jlpt_wordbooks (user_id, level, sort_order, created_at);

grant select, insert, update, delete on public.jlpt_wordbooks to authenticated, service_role;
