-- Supabase API role 권한 부여
-- 테이블 생성 후 실행하세요.
-- RLS 정책은 그대로 적용되며, service_role은 마이그레이션 스크립트에서 사용합니다.

grant usage on schema public to anon, authenticated, service_role;

grant select on public.kanji_items to authenticated;
grant select, insert, update, delete on public.kanji_items to service_role;
grant select, insert, update, delete on public.user_kanji_progress to authenticated, service_role;

grant select on public.jlpt_grammar_items to authenticated;
grant select, insert, update, delete on public.jlpt_grammar_items to service_role;
grant select, insert, update, delete on public.user_jlpt_grammar_progress to authenticated, service_role;

grant select, insert, update, delete on public.vocabulary_notes to authenticated, service_role;

grant select, insert, update, delete on public.vocabulary_wordbooks to authenticated, service_role;
grant select, insert, update, delete on public.vocabulary_words to authenticated, service_role;

grant select, insert, update, delete on public.grammar_wordbooks to authenticated, service_role;
grant select, insert, update, delete on public.grammar_wordbook_items to authenticated, service_role;

grant select, insert, update, delete on public.jlpt_wordbooks to authenticated, service_role;
grant select, insert, update, delete on public.jlpt_words to authenticated, service_role;

grant usage, select on all sequences in schema public to authenticated, service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated, service_role;

alter default privileges in schema public
  grant usage, select on sequences to authenticated, service_role;
