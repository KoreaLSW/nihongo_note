/** JLPT 레벨 전체 단어(all-words) 페이지 쿼리 파싱 — fs 미사용 */

/** `wb` 쿼리만 파싱. 키가 없으면 `undefined`, 있으면 (빈 문자열 제거 후) id 배열 */
export function parseJlptWordbookIdsParam(
  raw: string | string[] | undefined
): string[] | undefined {
  if (raw === undefined) return undefined;
  const arr = Array.isArray(raw) ? raw : [raw];
  const ids = arr.map((s) => String(s).trim()).filter(Boolean);
  return ids;
}

export type { JlptMemorizedListMode as JlptWordbookAllWordsMemorizedMode } from "./jlptWordbookShared";
export { parseJlptMemorizedListParam as parseJlptWordbookAllWordsMemorizedParam } from "./jlptWordbookShared";
