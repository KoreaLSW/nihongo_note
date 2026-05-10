-- 전체 메뉴 Supabase 전환용 추가 테이블
-- 01_jlpt_tables.sql 에 이미 있는 jlpt_wordbooks / jlpt_words 는 여기서 다시 만들지 않음
--
-- 포함 범위:
-- 1. 레벨별 한자 + 한자퀴즈
-- 2. JLPT 문법
-- 3. 단어장(note.csv 계열)
-- 4. 한자단어장(vocabulary_words 계열)
-- 5. 문법단어장(grammar_wordbooks 계열)
--
-- Supabase SQL Editor에서 01~03 실행 후 이 파일을 실행

create extension if not exists pg_trgm with schema extensions;

-- ============================================================================
-- 1. 레벨별 한자 + 한자퀴즈
-- ============================================================================

create table if not exists public.kanji_items (
  id bigserial primary key,
  no int not null,
  kanji text not null,
  meaning_quoted text not null default '',
  meaning text not null default '',
  onyomi text not null default '',
  kunyomi text not null default '',
  shape_explanation text not null default '',
  onyomi_detail text not null default '',
  kunyomi_detail text not null default '',
  level text not null check (level in ('n1', 'n2', 'n3', 'n4', 'n5')),
  image_path text,
  created_at timestamptz not null default now(),
  unique (level, no),
  unique (kanji)
);

comment on table public.kanji_items is '레벨별 한자 원본 데이터 (기존 public/kanji.csv, N1.csv~N5.csv 대응)';

create table if not exists public.user_kanji_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  kanji_id bigint not null references public.kanji_items (id) on delete cascade,
  memorized boolean not null default false,
  memorized_at timestamptz,
  reviewed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, kanji_id)
);

comment on table public.user_kanji_progress is '사용자별 한자 암기 상태 및 한자퀴즈 결과';

create index if not exists kanji_items_level_no_idx
  on public.kanji_items (level, no);

create index if not exists kanji_items_meaning_trgm_idx
  on public.kanji_items using gin (meaning_quoted gin_trgm_ops);

create index if not exists user_kanji_progress_user_memorized_idx
  on public.user_kanji_progress (user_id, memorized);

-- ============================================================================
-- 2. JLPT 문법
-- ============================================================================

create table if not exists public.jlpt_grammar_items (
  id bigserial primary key,
  level text not null check (level in ('n1', 'n2', 'n3')),
  no int not null,
  grammar text not null,
  shape text not null default '',
  meaning text not null default '',
  interpretation text not null default '',
  example text not null default '',
  created_at timestamptz not null default now(),
  unique (level, no)
);

comment on table public.jlpt_grammar_items is 'JLPT 문법 원본 데이터 (JLPT문법 메뉴 대응)';

create table if not exists public.user_jlpt_grammar_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  grammar_id bigint not null references public.jlpt_grammar_items (id) on delete cascade,
  memorized boolean not null default false,
  memorized_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, grammar_id)
);

comment on table public.user_jlpt_grammar_progress is '사용자별 JLPT 문법 암기 상태';

create index if not exists jlpt_grammar_items_level_no_idx
  on public.jlpt_grammar_items (level, no);

create index if not exists jlpt_grammar_items_search_idx
  on public.jlpt_grammar_items using gin (
    (grammar || ' ' || shape || ' ' || meaning || ' ' || interpretation || ' ' || example) gin_trgm_ops
  );

create index if not exists user_jlpt_grammar_progress_user_memorized_idx
  on public.user_jlpt_grammar_progress (user_id, memorized);

-- ============================================================================
-- 3. 단어장(note.csv 계열)
-- ============================================================================

create table if not exists public.vocabulary_notes (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  no int,
  word text not null,
  reading text not null default '',
  meaning text not null default '',
  level text not null default '',
  memorized boolean not null default false,
  memorized_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, word)
);

comment on table public.vocabulary_notes is '일반 단어장 데이터 (기존 note.csv + memorized.csv 통합)';

create index if not exists vocabulary_notes_user_level_idx
  on public.vocabulary_notes (user_id, level);

create index if not exists vocabulary_notes_user_created_idx
  on public.vocabulary_notes (user_id, created_at desc);

create index if not exists vocabulary_notes_search_idx
  on public.vocabulary_notes using gin (
    (word || ' ' || reading || ' ' || meaning) gin_trgm_ops
  );

-- ============================================================================
-- 4. 한자단어장(vocabulary_words 계열)
-- ============================================================================

create table if not exists public.vocabulary_wordbooks (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  sort_order int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.vocabulary_wordbooks is '한자단어장 메타 (기존 public/vocabulary_words/wordbooks.json 대응)';

create table if not exists public.vocabulary_words (
  id bigserial primary key,
  wordbook_id text not null references public.vocabulary_wordbooks (id) on delete cascade,
  sort_order int not null,
  word text not null,
  reading text not null default '',
  meaning text not null default '',
  level text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (wordbook_id, word)
);

comment on table public.vocabulary_words is '한자단어장 단어 행 (기존 public/vocabulary_words/*.csv 대응)';

create index if not exists vocabulary_wordbooks_user_sort_idx
  on public.vocabulary_wordbooks (user_id, sort_order, created_at);

create index if not exists vocabulary_words_wordbook_sort_idx
  on public.vocabulary_words (wordbook_id, sort_order);

create index if not exists vocabulary_words_search_idx
  on public.vocabulary_words using gin (
    (word || ' ' || reading || ' ' || meaning) gin_trgm_ops
  );

-- ============================================================================
-- 5. 문법단어장(grammar_wordbooks 계열)
-- ============================================================================

create table if not exists public.grammar_wordbooks (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  sort_order int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.grammar_wordbooks is '문법단어장 메타 (기존 public/grammar_wordbooks/grammar_wordbooks.json 대응)';

create table if not exists public.grammar_wordbook_items (
  id bigserial primary key,
  wordbook_id text not null references public.grammar_wordbooks (id) on delete cascade,
  sort_order int not null,
  grammar text not null,
  shape text not null default '',
  meaning text not null default '',
  interpretation text not null default '',
  example text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (wordbook_id, grammar)
);

comment on table public.grammar_wordbook_items is '문법단어장 항목 행 (기존 public/grammar_wordbooks/*.csv 대응)';

create index if not exists grammar_wordbooks_user_sort_idx
  on public.grammar_wordbooks (user_id, sort_order, created_at);

create index if not exists grammar_wordbook_items_wordbook_sort_idx
  on public.grammar_wordbook_items (wordbook_id, sort_order);

create index if not exists grammar_wordbook_items_search_idx
  on public.grammar_wordbook_items using gin (
    (grammar || ' ' || shape || ' ' || meaning || ' ' || interpretation || ' ' || example) gin_trgm_ops
  );

-- ============================================================================
-- RLS
-- ============================================================================

alter table public.kanji_items enable row level security;
alter table public.user_kanji_progress enable row level security;
alter table public.jlpt_grammar_items enable row level security;
alter table public.user_jlpt_grammar_progress enable row level security;
alter table public.vocabulary_notes enable row level security;
alter table public.vocabulary_wordbooks enable row level security;
alter table public.vocabulary_words enable row level security;
alter table public.grammar_wordbooks enable row level security;
alter table public.grammar_wordbook_items enable row level security;

-- 원본 학습 데이터는 로그인 사용자에게 조회만 허용
drop policy if exists "kanji_items_select_authenticated" on public.kanji_items;
create policy "kanji_items_select_authenticated"
  on public.kanji_items for select
  using (auth.uid() is not null);

drop policy if exists "jlpt_grammar_items_select_authenticated" on public.jlpt_grammar_items;
create policy "jlpt_grammar_items_select_authenticated"
  on public.jlpt_grammar_items for select
  using (auth.uid() is not null);

-- 사용자별 한자 진행상태
drop policy if exists "user_kanji_progress_select_own" on public.user_kanji_progress;
create policy "user_kanji_progress_select_own"
  on public.user_kanji_progress for select
  using (auth.uid() is not null and user_id = auth.uid());

drop policy if exists "user_kanji_progress_insert_own" on public.user_kanji_progress;
create policy "user_kanji_progress_insert_own"
  on public.user_kanji_progress for insert
  with check (auth.uid() is not null and user_id = auth.uid());

drop policy if exists "user_kanji_progress_update_own" on public.user_kanji_progress;
create policy "user_kanji_progress_update_own"
  on public.user_kanji_progress for update
  using (auth.uid() is not null and user_id = auth.uid())
  with check (auth.uid() is not null and user_id = auth.uid());

drop policy if exists "user_kanji_progress_delete_own" on public.user_kanji_progress;
create policy "user_kanji_progress_delete_own"
  on public.user_kanji_progress for delete
  using (auth.uid() is not null and user_id = auth.uid());

-- 사용자별 JLPT 문법 진행상태
drop policy if exists "user_jlpt_grammar_progress_select_own" on public.user_jlpt_grammar_progress;
create policy "user_jlpt_grammar_progress_select_own"
  on public.user_jlpt_grammar_progress for select
  using (auth.uid() is not null and user_id = auth.uid());

drop policy if exists "user_jlpt_grammar_progress_insert_own" on public.user_jlpt_grammar_progress;
create policy "user_jlpt_grammar_progress_insert_own"
  on public.user_jlpt_grammar_progress for insert
  with check (auth.uid() is not null and user_id = auth.uid());

drop policy if exists "user_jlpt_grammar_progress_update_own" on public.user_jlpt_grammar_progress;
create policy "user_jlpt_grammar_progress_update_own"
  on public.user_jlpt_grammar_progress for update
  using (auth.uid() is not null and user_id = auth.uid())
  with check (auth.uid() is not null and user_id = auth.uid());

drop policy if exists "user_jlpt_grammar_progress_delete_own" on public.user_jlpt_grammar_progress;
create policy "user_jlpt_grammar_progress_delete_own"
  on public.user_jlpt_grammar_progress for delete
  using (auth.uid() is not null and user_id = auth.uid());

-- 일반 단어장(note) 사용자 데이터
drop policy if exists "vocabulary_notes_select_own" on public.vocabulary_notes;
create policy "vocabulary_notes_select_own"
  on public.vocabulary_notes for select
  using (auth.uid() is not null and user_id = auth.uid());

drop policy if exists "vocabulary_notes_insert_own" on public.vocabulary_notes;
create policy "vocabulary_notes_insert_own"
  on public.vocabulary_notes for insert
  with check (auth.uid() is not null and user_id = auth.uid());

drop policy if exists "vocabulary_notes_update_own" on public.vocabulary_notes;
create policy "vocabulary_notes_update_own"
  on public.vocabulary_notes for update
  using (auth.uid() is not null and user_id = auth.uid())
  with check (auth.uid() is not null and user_id = auth.uid());

drop policy if exists "vocabulary_notes_delete_own" on public.vocabulary_notes;
create policy "vocabulary_notes_delete_own"
  on public.vocabulary_notes for delete
  using (auth.uid() is not null and user_id = auth.uid());

-- 한자단어장 메타
drop policy if exists "vocabulary_wordbooks_select_own" on public.vocabulary_wordbooks;
create policy "vocabulary_wordbooks_select_own"
  on public.vocabulary_wordbooks for select
  using (auth.uid() is not null and user_id = auth.uid());

drop policy if exists "vocabulary_wordbooks_insert_own" on public.vocabulary_wordbooks;
create policy "vocabulary_wordbooks_insert_own"
  on public.vocabulary_wordbooks for insert
  with check (auth.uid() is not null and user_id = auth.uid());

drop policy if exists "vocabulary_wordbooks_update_own" on public.vocabulary_wordbooks;
create policy "vocabulary_wordbooks_update_own"
  on public.vocabulary_wordbooks for update
  using (auth.uid() is not null and user_id = auth.uid())
  with check (auth.uid() is not null and user_id = auth.uid());

drop policy if exists "vocabulary_wordbooks_delete_own" on public.vocabulary_wordbooks;
create policy "vocabulary_wordbooks_delete_own"
  on public.vocabulary_wordbooks for delete
  using (auth.uid() is not null and user_id = auth.uid());

-- 한자단어장 항목: 소속 단어장이 본인 것일 때만
drop policy if exists "vocabulary_words_select_via_wordbook" on public.vocabulary_words;
create policy "vocabulary_words_select_via_wordbook"
  on public.vocabulary_words for select
  using (
    exists (
      select 1 from public.vocabulary_wordbooks w
      where w.id = vocabulary_words.wordbook_id
        and w.user_id = auth.uid()
    )
  );

drop policy if exists "vocabulary_words_insert_via_wordbook" on public.vocabulary_words;
create policy "vocabulary_words_insert_via_wordbook"
  on public.vocabulary_words for insert
  with check (
    exists (
      select 1 from public.vocabulary_wordbooks w
      where w.id = vocabulary_words.wordbook_id
        and w.user_id = auth.uid()
    )
  );

drop policy if exists "vocabulary_words_update_via_wordbook" on public.vocabulary_words;
create policy "vocabulary_words_update_via_wordbook"
  on public.vocabulary_words for update
  using (
    exists (
      select 1 from public.vocabulary_wordbooks w
      where w.id = vocabulary_words.wordbook_id
        and w.user_id = auth.uid()
    )
  );

drop policy if exists "vocabulary_words_delete_via_wordbook" on public.vocabulary_words;
create policy "vocabulary_words_delete_via_wordbook"
  on public.vocabulary_words for delete
  using (
    exists (
      select 1 from public.vocabulary_wordbooks w
      where w.id = vocabulary_words.wordbook_id
        and w.user_id = auth.uid()
    )
  );

-- 문법단어장 메타
drop policy if exists "grammar_wordbooks_select_own" on public.grammar_wordbooks;
create policy "grammar_wordbooks_select_own"
  on public.grammar_wordbooks for select
  using (auth.uid() is not null and user_id = auth.uid());

drop policy if exists "grammar_wordbooks_insert_own" on public.grammar_wordbooks;
create policy "grammar_wordbooks_insert_own"
  on public.grammar_wordbooks for insert
  with check (auth.uid() is not null and user_id = auth.uid());

drop policy if exists "grammar_wordbooks_update_own" on public.grammar_wordbooks;
create policy "grammar_wordbooks_update_own"
  on public.grammar_wordbooks for update
  using (auth.uid() is not null and user_id = auth.uid())
  with check (auth.uid() is not null and user_id = auth.uid());

drop policy if exists "grammar_wordbooks_delete_own" on public.grammar_wordbooks;
create policy "grammar_wordbooks_delete_own"
  on public.grammar_wordbooks for delete
  using (auth.uid() is not null and user_id = auth.uid());

-- 문법단어장 항목: 소속 단어장이 본인 것일 때만
drop policy if exists "grammar_wordbook_items_select_via_wordbook" on public.grammar_wordbook_items;
create policy "grammar_wordbook_items_select_via_wordbook"
  on public.grammar_wordbook_items for select
  using (
    exists (
      select 1 from public.grammar_wordbooks w
      where w.id = grammar_wordbook_items.wordbook_id
        and w.user_id = auth.uid()
    )
  );

drop policy if exists "grammar_wordbook_items_insert_via_wordbook" on public.grammar_wordbook_items;
create policy "grammar_wordbook_items_insert_via_wordbook"
  on public.grammar_wordbook_items for insert
  with check (
    exists (
      select 1 from public.grammar_wordbooks w
      where w.id = grammar_wordbook_items.wordbook_id
        and w.user_id = auth.uid()
    )
  );

drop policy if exists "grammar_wordbook_items_update_via_wordbook" on public.grammar_wordbook_items;
create policy "grammar_wordbook_items_update_via_wordbook"
  on public.grammar_wordbook_items for update
  using (
    exists (
      select 1 from public.grammar_wordbooks w
      where w.id = grammar_wordbook_items.wordbook_id
        and w.user_id = auth.uid()
    )
  );

drop policy if exists "grammar_wordbook_items_delete_via_wordbook" on public.grammar_wordbook_items;
create policy "grammar_wordbook_items_delete_via_wordbook"
  on public.grammar_wordbook_items for delete
  using (
    exists (
      select 1 from public.grammar_wordbooks w
      where w.id = grammar_wordbook_items.wordbook_id
        and w.user_id = auth.uid()
    )
  );
