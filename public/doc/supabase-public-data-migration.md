# Supabase Public Data Migration

`public` 폴더의 CSV/JSON 데이터를 Supabase DB로 옮기는 스크립트 안내입니다.

## 사전 준비

Supabase SQL Editor에서 아래 파일을 먼저 실행합니다.

1. `public/query/01_jlpt_tables.sql`
2. `public/query/02_jlpt_memorized_trigger.sql`
3. `public/query/03_jlpt_rls.sql`
4. `public/query/06_additional_app_tables.sql`
5. `public/query/07_grants_for_supabase_api.sql`
6. `public/query/08_jlpt_write_support.sql`

`.env` 또는 `.env.local`에 아래 값을 추가합니다.

```env
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
MIGRATION_USER_ID=auth.users에 있는 사용자 UUID
```

`MIGRATION_USER_ID`는 기존 CSV 데이터를 귀속시킬 Supabase 사용자 ID입니다.

## 실행

먼저 dry-run으로 이관 대상 row 수를 확인합니다.

```bash
npm run migrate:supabase
```

실제로 DB에 쓰려면 `-- --execute`를 붙입니다.

```bash
npm run migrate:supabase -- --execute
```

특정 영역만 실행할 수도 있습니다.

```bash
npm run migrate:supabase -- --only=kanji --execute
npm run migrate:supabase -- --only=jlptGrammar --execute
npm run migrate:supabase -- --only=vocabularyNotes --execute
npm run migrate:supabase -- --only=vocabularyWordbooks --execute
npm run migrate:supabase -- --only=grammarWordbooks --execute
npm run migrate:supabase -- --only=jlptWordbooks --execute
```

## 이관 대상

- `kanji_items`: `public/N1.csv`~`public/N5.csv`
- `user_kanji_progress`: `public/memorized.csv`
- `jlpt_grammar_items`: `public/grammar_json/n1_detail.json`, `n2_detail.json`, `n3_detail.json`
- `vocabulary_notes`: `public/note.csv` + `public/memorized.csv`
- `vocabulary_wordbooks`, `vocabulary_words`: `public/vocabulary_words/wordbooks.json`, `*.csv`
- `grammar_wordbooks`, `grammar_wordbook_items`: `public/grammar_wordbooks/grammar_wordbooks.json`, `*.csv`
- `jlpt_wordbooks`, `jlpt_words`: `public/jlpt_wordbooks/jlpt_wordbooks.json`, `*.csv`

## 주의

- `SUPABASE_SERVICE_ROLE_KEY`는 서버/로컬 스크립트 전용입니다. 브라우저 코드에 노출하지 않습니다.
- 스크립트는 `upsert`를 사용하므로 같은 데이터를 다시 실행해도 중복 생성 대신 갱신됩니다.
- `--execute`를 붙이지 않으면 DB에 쓰지 않습니다.
