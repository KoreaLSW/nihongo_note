-- Row Level Security (로그인 사용자별 단어장 분리 시)
-- user_id를 채우는 앱과 함께 사용. 단일 사용자·서버 전용(service_role)만 쓰면 이 파일은 생략 가능

alter table public.jlpt_wordbooks enable row level security;
alter table public.jlpt_words enable row level security;

-- 단어장: 본인 것만
create policy "jlpt_wordbooks_select_own"
  on public.jlpt_wordbooks for select
  using (auth.uid() is not null and user_id = auth.uid());

create policy "jlpt_wordbooks_insert_own"
  on public.jlpt_wordbooks for insert
  with check (auth.uid() is not null and user_id = auth.uid());

create policy "jlpt_wordbooks_update_own"
  on public.jlpt_wordbooks for update
  using (auth.uid() is not null and user_id = auth.uid())
  with check (auth.uid() is not null and user_id = auth.uid());

create policy "jlpt_wordbooks_delete_own"
  on public.jlpt_wordbooks for delete
  using (auth.uid() is not null and user_id = auth.uid());

-- 단어: 소속 단어장이 본인 것일 때만
create policy "jlpt_words_select_via_wordbook"
  on public.jlpt_words for select
  using (
    exists (
      select 1 from public.jlpt_wordbooks w
      where w.id = jlpt_words.wordbook_id
        and w.user_id = auth.uid()
    )
  );

create policy "jlpt_words_insert_via_wordbook"
  on public.jlpt_words for insert
  with check (
    exists (
      select 1 from public.jlpt_wordbooks w
      where w.id = jlpt_words.wordbook_id
        and w.user_id = auth.uid()
    )
  );

create policy "jlpt_words_update_via_wordbook"
  on public.jlpt_words for update
  using (
    exists (
      select 1 from public.jlpt_wordbooks w
      where w.id = jlpt_words.wordbook_id
        and w.user_id = auth.uid()
    )
  );

create policy "jlpt_words_delete_via_wordbook"
  on public.jlpt_words for delete
  using (
    exists (
      select 1 from public.jlpt_wordbooks w
      where w.id = jlpt_words.wordbook_id
        and w.user_id = auth.uid()
    )
  );
