import { getWordbookList, getWordbookWords } from "@/lib/wordbook";
import type { Vocabulary2AllWordsMemorizedMode } from "@/lib/vocabulary2AllWordsNav";

export type Vocabulary2AllWordsFlatRow = {
  wordbookId: string;
  wordbookName: string;
  no: string;
  word: string;
  reading: string;
  meaning: string;
  level: string;
  created_at: string;
  memorized: string;
  memorized_at: string;
  reviewed_at: string;
};

/** 단어장 manifest 순서 → 각 CSV 행 순서로 이어 붙인 전체 목록 */
export async function getVocabulary2AllWordsFlatRows(): Promise<Vocabulary2AllWordsFlatRow[]> {
  const wordbooks = await getWordbookList();
  const flat: Vocabulary2AllWordsFlatRow[] = [];
  for (const wb of wordbooks) {
    for (const r of await getWordbookWords(wb.id)) {
      flat.push({
        wordbookId: wb.id,
        wordbookName: wb.name,
        no: r.no,
        word: r.word,
        reading: r.reading ?? "",
        meaning: r.meaning ?? "",
        level: r.level ?? "",
        created_at: r.created_at ?? "",
        memorized: r.memorized ?? "no",
        memorized_at: r.memorized_at ?? "",
        reviewed_at: r.reviewed_at ?? "",
      });
    }
  }
  return flat;
}

export function filterVocabulary2AllWordsFlat(
  flat: Vocabulary2AllWordsFlatRow[],
  mode: Vocabulary2AllWordsMemorizedMode
): Vocabulary2AllWordsFlatRow[] {
  if (mode === "yes") return flat.filter((r) => r.memorized === "yes");
  if (mode === "no") return flat.filter((r) => r.memorized !== "yes");
  return flat;
}
