/** 전체 단어 목록(all-words) ↔ 상세 이전/다음 네비게이션용. fs 미사용 — 클라이언트에서도 import 가능 */

export type Vocabulary2AllWordsMemorizedMode = "all" | "yes" | "no";

export function parseVocabulary2AllWordsMemorizedParam(
  raw: string | undefined
): Vocabulary2AllWordsMemorizedMode {
  const m = (raw ?? "all").toLowerCase();
  if (m === "yes") return "yes";
  if (m === "no") return "no";
  return "all";
}

/** 단어 상세 URL에 붙일 쿼리 (`?from=all-words&memorized=…`) */
export function vocabulary2AllWordsDetailQuery(
  mode: Vocabulary2AllWordsMemorizedMode
): string {
  const p = new URLSearchParams();
  p.set("from", "all-words");
  if (mode !== "all") p.set("memorized", mode);
  return `?${p.toString()}`;
}
