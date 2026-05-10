-- memorized / memorized_at 자동 갱신 (lib/recomputeJlptAggregateFields 와 동일 의미)
-- 01_jlpt_tables.sql 실행 후 적용

create or replace function public.jlpt_words_recompute_memorized()
returns trigger
language plpgsql
as $$
declare
  all_yes boolean;
  max_at timestamptz;
begin
  all_yes :=
    new.memorized_word
    and new.memorized_meaning
    and new.memorized_hiragana;

  new.memorized := all_yes;

  if all_yes then
    select max(x) into max_at
    from unnest(
      array[
        new.memorized_word_at,
        new.memorized_meaning_at,
        new.memorized_hiragana_at
      ]
    ) as x
    where x is not null;

    new.memorized_at := max_at;
  else
    new.memorized_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists jlpt_words_recompute_memorized_trigger on public.jlpt_words;

create trigger jlpt_words_recompute_memorized_trigger
  before insert or update of
    memorized_word,
    memorized_meaning,
    memorized_hiragana,
    memorized_word_at,
    memorized_meaning_at,
    memorized_hiragana_at
  on public.jlpt_words
  for each row
  execute procedure public.jlpt_words_recompute_memorized();
