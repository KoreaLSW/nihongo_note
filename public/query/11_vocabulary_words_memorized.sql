-- 한자 단어장(`vocabulary_words`) 행 단위 암기·복습 (`kanji_items` 매칭 없이도 저장 가능)
alter table public.vocabulary_words
  add column if not exists memorized boolean not null default false;

alter table public.vocabulary_words
  add column if not exists memorized_at timestamptz;

alter table public.vocabulary_words
  add column if not exists reviewed_at timestamptz;

comment on column public.vocabulary_words.memorized is '한자단어장 목록·퀴즈용 암기 상태';
comment on column public.vocabulary_words.memorized_at is '한자단어장 암기 시각';
comment on column public.vocabulary_words.reviewed_at is '한자단어장 복습 시각';
