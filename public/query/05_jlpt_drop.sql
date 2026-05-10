-- 스키마 되돌리기(개발 중 초기화용). 주의: 데이터 삭제

drop trigger if exists jlpt_words_recompute_memorized_trigger on public.jlpt_words;
drop function if exists public.jlpt_words_recompute_memorized();

drop table if exists public.jlpt_words cascade;
drop table if exists public.jlpt_wordbooks cascade;
