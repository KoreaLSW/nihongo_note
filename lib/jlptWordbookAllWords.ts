import type { JlptLevel, JlptWordbookRow } from "@/lib/jlptWordbook";
import {
  getJlptWordbookList,
  getJlptWordbookWords,
  normalizeJlptLevel,
} from "@/lib/jlptWordbook";
import {
  filterJlptWordbookRowsByMemorizedMode,
  type JlptMemorizedListMode,
} from "@/lib/jlptWordbookShared";
import { parseJlptWordbookIdsParam } from "@/lib/jlptWordbookAllWordsNav";

export type JlptLevelAllWordsFlatRow = JlptWordbookRow & {
  wordbookId: string;
  wordbookName: string;
  level: JlptLevel;
};

export type JlptAllWordsWordbookFilter = {
  /** `undefined`: 레벨 내 전체 단어장 · `[]`: 포함할 단어장 없음 · 그 외: 해당 id만 */
  wordbookIds: string[] | undefined;
};

/**
 * `nowb=1`이면 빈 범위, `wb` 없으면 전체, `wb` 있으면 해당 id만(레벨에 속한 것만 유지).
 */
export function resolveJlptLevelWordbookIdsForAllWords(
  level: string,
  sp: { nowb?: string; wb?: string | string[] }
): JlptAllWordsWordbookFilter {
  if (sp?.nowb === "1") {
    return { wordbookIds: [] };
  }
  const parsed = parseJlptWordbookIdsParam(sp?.wb);
  if (parsed === undefined) {
    return { wordbookIds: undefined };
  }
  const lv = normalizeJlptLevel(level);
  const allowed = new Set(getJlptWordbookList(lv).map((w) => w.id));
  return { wordbookIds: parsed.filter((id) => allowed.has(id)) };
}

/** 레벨 전체 단어·퀴즈 URL에 단어장 범위를 붙임. `undefined`는 전체(쿼리 생략). */
export function appendJlptWordbookFilterToSearchParams(
  params: URLSearchParams,
  wordbookIds: string[] | undefined
): void {
  if (wordbookIds === undefined) return;
  if (wordbookIds.length === 0) {
    params.set("nowb", "1");
    return;
  }
  for (const id of wordbookIds) {
    params.append("wb", id);
  }
}

/** URL에 넣을 때: 전체 선택이면 `undefined`(쿼리 생략), manifest 순서로 정렬 */
export function canonicalizeWordbookIdsForUrl(
  level: string,
  wordbookIds: string[] | undefined
): string[] | undefined {
  if (wordbookIds === undefined) return undefined;
  if (wordbookIds.length === 0) return [];
  const lv = normalizeJlptLevel(level);
  const all = getJlptWordbookList(lv).map((w) => w.id);
  const set = new Set(wordbookIds);
  const ordered = all.filter((id) => set.has(id));
  if (ordered.length === all.length) return undefined;
  return ordered;
}

/** 해당 레벨의 단어장 CSV를 manifest 순서대로 이어 붙인 목록 */
export function getJlptLevelAllWordsFlatRows(
  level: string,
  opts?: { wordbookIds?: string[] }
): JlptLevelAllWordsFlatRow[] {
  const lv = normalizeJlptLevel(level);
  let wordbooks = getJlptWordbookList(lv);
  const ids = opts?.wordbookIds;
  if (ids !== undefined) {
    const idSet = new Set(ids);
    wordbooks = wordbooks.filter((w) => idSet.has(w.id));
  }
  const flat: JlptLevelAllWordsFlatRow[] = [];
  for (const wb of wordbooks) {
    for (const r of getJlptWordbookWords(wb.id)) {
      flat.push({
        ...r,
        wordbookId: wb.id,
        wordbookName: wb.name,
        level: lv,
      });
    }
  }
  return flat;
}

export function filterJlptLevelAllWordsFlat(
  flat: JlptLevelAllWordsFlatRow[],
  mode: JlptMemorizedListMode
): JlptLevelAllWordsFlatRow[] {
  return filterJlptWordbookRowsByMemorizedMode(flat, mode);
}
