# Supabase CSV 마이그레이션 기획서

## 목적

현재 앱은 `public` 폴더 안의 CSV 파일과 JSON 매니페스트를 직접 읽고 쓰면서 데이터를 관리한다. 배포 환경에서는 `public` 파일이 공개 리소스가 되고, Vercel 파일 시스템은 영구 저장소로 적합하지 않으므로 Supabase DB 기반으로 조회, 입력, 삭제, 수정을 전환한다.

## 전환 범위

- 레벨별 한자
- 한자퀴즈
- JLPT 문법
- 단어장
- 한자단어장
- 문법단어장
- JLPT단어장

## 목표 테이블

SQL 파일은 `public/query` 폴더에 분리되어 있다.

- `01_jlpt_tables.sql`: `jlpt_wordbooks`, `jlpt_words`
- `02_jlpt_memorized_trigger.sql`: JLPT단어장 암기 집계 트리거
- `03_jlpt_rls.sql`: JLPT단어장 RLS 정책
- `04_jlpt_seed_examples.sql`: 테스트용 예시 INSERT
- `05_jlpt_drop.sql`: 개발 중 초기화용 DROP 쿼리
- `06_additional_app_tables.sql`: 전체 메뉴 추가 테이블, 인덱스, RLS 정책

테이블 역할:

- `kanji_items`: 레벨별 한자와 한자퀴즈 원본 데이터
- `user_kanji_progress`: 사용자별 한자 암기/복습 상태
- `jlpt_grammar_items`: JLPT 문법 원본 데이터
- `user_jlpt_grammar_progress`: 사용자별 JLPT 문법 암기 상태
- `vocabulary_notes`: 일반 단어장 데이터
- `vocabulary_wordbooks`, `vocabulary_words`: 한자단어장 메타와 단어 행
- `grammar_wordbooks`, `grammar_wordbook_items`: 문법단어장 메타와 문법 항목
- `jlpt_wordbooks`, `jlpt_words`: JLPT단어장 메타와 단어 행

## 인증과 권한

필요 환경 변수:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

주의:

- `SUPABASE_SERVICE_ROLE_KEY`는 서버 전용이며 브라우저 코드에 절대 노출하지 않는다.
- 사용자 데이터는 `user_id = auth.uid()` 기준으로 RLS를 적용한다.
- 기존 데이터를 이관할 때 `user_id`가 비어 있으면 로그인 사용자가 조회할 수 없다.

## 구현 단계

### 1단계: DB 준비

1. Supabase SQL Editor에서 `01_jlpt_tables.sql` 실행 (완료)
2. `02_jlpt_memorized_trigger.sql` 실행 (완료)
3. 로그인 기반으로 사용할 경우 `03_jlpt_rls.sql` 실행 (완료)
4. 전체 메뉴 테이블 확장을 위해 `06_additional_app_tables.sql` 실행
5. 테스트 데이터가 필요하면 `04_jlpt_seed_examples.sql`을 수정 후 실행

### 2단계: Supabase 클라이언트 추가

1. 패키지 설치 (완료)
   - `@supabase/supabase-js`
   - `@supabase/ssr`
2. 서버용 클라이언트 생성 (완료)
3. 브라우저용 클라이언트 생성 (완료)
4. 미들웨어에서 세션 쿠키 갱신 (완료)

### 3단계: 로그인 기능 추가

1. 로그인 페이지 생성 (완료)
2. 로그아웃 액션 생성 (완료)
3. 인증 콜백 라우트 생성 (완료)
4. 로그인하지 않은 사용자의 전체 앱 접근 차단 (완료)
5. 사용자 생성 데이터 insert 시 `user_id`를 현재 로그인 사용자 ID로 저장 (완료)

현재 적용된 생성 흐름:

- JLPT단어장 생성: `jlpt_wordbooks.user_id`
- 한자단어장 생성: `vocabulary_wordbooks.user_id`
- 문법단어장 생성: `grammar_wordbooks.user_id`
- 일반 단어장 단어 추가: `vocabulary_notes.user_id`

### 4단계: 읽기 기능 전환 (완료)

읽기 기능은 메뉴 단위로 전환한다.

1. 레벨별 한자 / 한자퀴즈
   - `getKanjiByLevel`을 `kanji_items` 조회 우선으로 교체
   - 사용자 암기 상태는 `user_kanji_progress`로 합성
2. JLPT 문법
   - JLPT 문법 목록/상세/검색을 `jlpt_grammar_items` 조회 우선으로 교체
   - 사용자 암기 상태는 `user_jlpt_grammar_progress`로 분리
3. JLPT 단어장
   - `getJlptWordbookList`, `getJlptWordbookMeta`, `getJlptWordbookWords`를 Supabase 조회 우선으로 교체
4. 일반 단어장
   - `note.csv` 기반 조회를 `vocabulary_notes` 조회 우선으로 교체
5. 한자단어장
   - `getWordbookList`와 단어 행 조회를 `vocabulary_wordbooks`, `vocabulary_words` 조회 우선으로 교체
6. 문법단어장
   - `getGrammarWordbookList`와 문법 행 조회를 `grammar_wordbooks`, `grammar_wordbook_items` 조회 우선으로 교체

### 5단계: 쓰기 기능 전환

쓰기 기능은 사용자 데이터부터 전환한다. 쓰기 전환이 끝난 메뉴는 더 이상 `public` CSV 파일에 저장하지 않는다.

1. 모든 insert에 `user_id = auth.uid()` 적용
2. 서버 액션에서 현재 로그인 사용자 확인
3. JLPT 단어장 CRUD를 `jlpt_wordbooks`, `jlpt_words`로 전환 (완료)
4. 한자 진행 상태 변경을 `user_kanji_progress` upsert로 전환 (완료)
5. JLPT 문법 진행 상태 변경을 `user_jlpt_grammar_progress` upsert로 전환 (완료)
6. 일반 단어장 CRUD를 `vocabulary_notes`로 전환 (완료)
7. 한자단어장 CRUD를 `vocabulary_wordbooks`, `vocabulary_words`로 전환 (완료)
8. 문법단어장 CRUD를 `grammar_wordbooks`, `grammar_wordbook_items`로 전환 (완료)

JLPT 단어장 쓰기 전환 보조 SQL:

- `public/query/08_jlpt_write_support.sql`

### 6단계: 기존 CSV 데이터 이관

공통 변환 규칙:

- `no`는 `sort_order` 또는 `no` 정수로 변환
- `yes` / `no` 문자열은 boolean으로 변환
- 빈 날짜 문자열은 `null`로 변환
- 날짜 문자열은 가능한 경우 `timestamptz`로 변환
- 사용자별 데이터는 대상 `user_id`를 반드시 지정

이관 대상:

- `kanji.csv`, `N1.csv`~`N5.csv` → `kanji_items`
- `memorized.csv` → `user_kanji_progress` 또는 기존 의미에 맞는 진행 테이블
- JLPT 문법 원본 → `jlpt_grammar_items`
- `note.csv` → `vocabulary_notes`
- `vocabulary_words/wordbooks.json`, `vocabulary_words/*.csv` → `vocabulary_wordbooks`, `vocabulary_words`
- `grammar_wordbooks/grammar_wordbooks.json`, `grammar_wordbooks/*.csv` → `grammar_wordbooks`, `grammar_wordbook_items`
- `jlpt_wordbooks/jlpt_wordbooks.json`, `jlpt_wordbooks/*.csv` → `jlpt_wordbooks`, `jlpt_words`

### 7단계: 배포 설정

1. Vercel Environment Variables에 Supabase 환경 변수 등록
2. 로컬 `.env`는 Git에 커밋하지 않음
3. Supabase SQL이 운영 프로젝트에 모두 적용되었는지 확인
4. 빌드 확인
5. 로그인, 전체 메뉴 조회, 단어장 CRUD, CSV 업로드, 암기/복습/퀴즈 흐름 테스트

### 8단계: CSV 의존성 제거

모든 읽기/쓰기 기능이 Supabase로 전환된 뒤에만 CSV 의존성을 제거한다.

1. `lib/*`의 `fs`, `csv-parse`, `csv-stringify` 사용 위치 확인
2. Supabase 전환이 끝난 함수에서 CSV fallback 제거
3. `public`에 남은 사용자 데이터 CSV를 더 이상 쓰지 않도록 서버 액션 정리
4. 원본 학습 데이터 파일은 백업 또는 seed 파일로만 보관
5. 배포 후 Vercel에서 새로 생성/수정한 데이터가 DB에만 저장되는지 확인

## 마이그레이션 검증 체크리스트

- 로그인 사용자가 본인 데이터만 조회할 수 있다.
- 로그아웃 상태에서는 전체 앱 메뉴에 접근할 수 없고 로그인 페이지로 이동한다.
- 단어장 생성 시 `user_id`가 저장된다.
- 공통 원본 데이터(`kanji_items`, `jlpt_grammar_items`)는 로그인 사용자만 조회할 수 있다.
- 단어/문법 항목 추가, 수정, 삭제 후 화면이 갱신된다.
- 암기 상태 변경 시 관련 progress 테이블 또는 단어 행이 갱신된다.
- 단어장 삭제 시 연결된 하위 항목이 함께 삭제된다.
- 한자퀴즈와 레벨별 한자가 같은 `kanji_items` 원본을 기준으로 동작한다.
- JLPT 문법 목록/검색/상세가 `jlpt_grammar_items` 기준으로 동작한다.
- 기존 CSV/JSON row 수와 DB 이관 row 수가 일치한다.
- Vercel 배포 후에도 데이터가 유지된다.

## 롤백 계획

초기 전환 기간에는 CSV 기반 코드를 즉시 삭제하지 않는다.

권장 방식:

1. Supabase 기반 함수 구현
2. 기존 CSV 기반 함수는 백업 경로로 유지
3. 화면이 Supabase 기반으로 안정화된 뒤 CSV 쓰기 로직 제거
4. 필요 시 `05_jlpt_drop.sql`로 개발 DB만 초기화

주의:

- 운영 DB에서 `05_jlpt_drop.sql`을 실행하면 데이터가 삭제된다.
- `public/doc`와 `public/query` 파일은 배포 시 공개될 수 있으므로 API 키, DB 비밀번호, 실제 사용자 데이터는 절대 넣지 않는다.
