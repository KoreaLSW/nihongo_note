-- kanji_items 테이블에 한자 상세·단어장 카드용 컬럼 추가
--
-- 증상: 단어장(/vocabulary) 등에서 Postgres code 42703 (undefined_column)
-- 원인: 앱 코드는 onyomi / kunyomi / shape_explanation 등을 조회하는데,
--       초기 06 스키마에는 해당 컬럼이 없음.
--
-- Supabase SQL Editor에서 한 번 실행하면 됩니다.

alter table public.kanji_items
  add column if not exists meaning text not null default '',
  add column if not exists onyomi text not null default '',
  add column if not exists kunyomi text not null default '',
  add column if not exists shape_explanation text not null default '',
  add column if not exists onyomi_detail text not null default '',
  add column if not exists kunyomi_detail text not null default '';
