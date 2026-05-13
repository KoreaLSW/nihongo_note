-- 문법 단어장 행 단위 암기 (JLPT `jlpt_grammar_items` 문자열 일치 없이도 퀴즈에서 저장 가능)
alter table public.grammar_wordbook_items
  add column if not exists memorized boolean not null default false;

alter table public.grammar_wordbook_items
  add column if not exists memorized_at timestamptz;

comment on column public.grammar_wordbook_items.memorized is '문법단어장 목록·퀴즈용 암기 상태';
comment on column public.grammar_wordbook_items.memorized_at is '문법단어장 암기 시각';
