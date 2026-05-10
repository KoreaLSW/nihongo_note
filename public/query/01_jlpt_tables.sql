-- JLPT 단어장: CSV + jlpt_wordbooks.json 구조를 Supabase(Postgres) 테이블로 옮길 때 사용
-- Supabase SQL Editor에서 위에서 아래 순서로 실행하거나, 이 파일 전체를 한 번에 실행

-- 기존 앱의 wordbook id가 문자열이므로 PK는 text 유지 (마이그레이션 시 그대로 복사 가능)
create table if not exists public.jlpt_wordbooks (
  id text primary key,
  level text not null check (level in ('n1', 'n2', 'n3', 'n4', 'n5')),
  name text not null,
  -- 서버/클라이언트에서 UUID 연동 시 사용; 단일 사용자면 null 허용
  user_id uuid references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.jlpt_wordbooks is 'JLPT 단어장 메타 (기존 jlpt_wordbooks.json + 파일명 대신 DB 저장)';

-- 단어 한 행 = CSV 한 줄 (JlptWordbookRow)
create table if not exists public.jlpt_words (
  id bigserial primary key,
  wordbook_id text not null references public.jlpt_wordbooks (id) on delete cascade,
  sort_order int not null,
  word text not null,
  meaning text not null,
  hiragana text not null default '',
  memorized_word boolean not null default false,
  memorized_word_at timestamptz,
  memorized_meaning boolean not null default false,
  memorized_meaning_at timestamptz,
  memorized_hiragana boolean not null default false,
  memorized_hiragana_at timestamptz,
  -- 세 축 모두 암기 시 true (lib/jlptWordbookShared recomputeJlptAggregateFields 와 동일 의미)
  memorized boolean not null default false,
  memorized_at timestamptz,
  created_at timestamptz not null default now(),
  unique (wordbook_id, word)
);

comment on table public.jlpt_words is 'JLPT 단어장 단어 행 (기존 *.csv 컬럼 대응; yes/no는 boolean으로 저장)';

create index if not exists jlpt_words_wordbook_sort_order_idx
  on public.jlpt_words (wordbook_id, sort_order);

create index if not exists jlpt_words_wordbook_memorized_idx
  on public.jlpt_words (wordbook_id, memorized);

create index if not exists jlpt_wordbooks_user_level_idx
  on public.jlpt_wordbooks (user_id, level);
