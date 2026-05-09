"use server";

import {
  createGrammarWordbook as createGrammarWordbookLib,
  appendGrammarToWordbook,
  removeGrammarFromWordbook,
  reorderGrammarWordbookWords,
  reorderGrammarWordbooks,
  renameGrammarWordbook,
  updateGrammarWordbookWord,
} from "@/lib/grammarWordbook";
import {
  moveGrammarMemorized,
  setGrammarMemorized,
} from "@/lib/grammarMemorized";

export async function createGrammarWordbook(formData: FormData) {
  const name = (formData.get("name") as string) ?? "";
  if (!name.trim()) return { ok: false, error: "문법 단어장 이름을 입력하세요." };
  try {
    createGrammarWordbookLib(name.trim());
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("createGrammarWordbook error:", e);
    return { ok: false, error: msg };
  }
}

export async function insertToGrammarWordbook(formData: FormData) {
  const wordbookId = (formData.get("wordbookId") as string) ?? "";
  const grammar = (formData.get("grammar") as string) ?? "";
  const shape = (formData.get("shape") as string) ?? "";
  const meaning = (formData.get("meaning") as string) ?? "";
  const interpretation = (formData.get("interpretation") as string) ?? "";
  const example = (formData.get("example") as string) ?? "";

  if (!wordbookId.trim()) return { ok: false, error: "단어장을 선택하세요." };
  if (!grammar.trim()) return { ok: false, error: "grammar is required" };

  try {
    appendGrammarToWordbook(wordbookId.trim(), {
      grammar: grammar.trim(),
      shape: (shape ?? "").trim(),
      meaning: (meaning ?? "").trim(),
      interpretation: (interpretation ?? "").trim(),
      example: (example ?? "").trim(),
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.startsWith("duplicate")) {
      return { ok: false, error: "이미 이 문법 단어장에 있는 문법입니다." };
    }
    console.error("insertToGrammarWordbook error:", e);
    return { ok: false, error: msg };
  }
}

export async function deleteFromGrammarWordbook(formData: FormData) {
  const wordbookId = (formData.get("wordbookId") as string) ?? "";
  const grammar = (formData.get("grammar") as string) ?? "";

  if (!wordbookId.trim()) return { ok: false, error: "wordbookId is required" };
  if (!grammar.trim()) return { ok: false, error: "grammar is required" };

  try {
    removeGrammarFromWordbook(wordbookId.trim(), grammar.trim());
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "grammar not found") {
      return { ok: false, error: "문법 단어장에 없는 문법입니다." };
    }
    console.error("deleteFromGrammarWordbook error:", e);
    return { ok: false, error: msg };
  }
}

export async function reorderGrammarWordbookWordsAction(
  wordbookId: string,
  grammarOrder: string[]
) {
  if (!wordbookId?.trim())
    return { ok: false, error: "단어장을 선택하세요." };
  if (!Array.isArray(grammarOrder))
    return { ok: false, error: "순서 데이터가 올바르지 않습니다." };

  try {
    reorderGrammarWordbookWords(wordbookId.trim(), grammarOrder);
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("reorderGrammarWordbookWords error:", e);
    return { ok: false, error: msg };
  }
}

export async function renameGrammarWordbookAction(formData: FormData) {
  const wordbookId = (formData.get("wordbookId") as string) ?? "";
  const name = (formData.get("name") as string) ?? "";

  if (!wordbookId.trim()) return { ok: false, error: "단어장을 선택하세요." };
  if (!name.trim()) return { ok: false, error: "문법 단어장 이름을 입력하세요." };

  try {
    renameGrammarWordbook(wordbookId.trim(), name.trim());
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("renameGrammarWordbook error:", e);
    return { ok: false, error: msg };
  }
}

export async function reorderGrammarWordbooksAction(wordbookIds: string[]) {
  if (!Array.isArray(wordbookIds)) {
    return { ok: false, error: "순서 데이터가 올바르지 않습니다." };
  }
  try {
    reorderGrammarWordbooks(wordbookIds);
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("reorderGrammarWordbooks error:", e);
    return { ok: false, error: msg };
  }
}

export async function setGrammarMemorizedAction(formData: FormData) {
  const grammar = (formData.get("grammar") as string) ?? "";
  const value = (formData.get("value") as string) ?? "no";

  if (!grammar.trim()) return { ok: false, error: "grammar is required" };

  try {
    setGrammarMemorized(grammar.trim(), value === "yes");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("setGrammarMemorized error:", e);
    return { ok: false, error: msg };
  }
}

export async function updateGrammarWordbookWordAction(formData: FormData) {
  const wordbookId = (formData.get("wordbookId") as string) ?? "";
  const no = (formData.get("no") as string) ?? "";
  const oldGrammar = (formData.get("oldGrammar") as string) ?? "";
  const grammar = (formData.get("grammar") as string) ?? "";
  const shape = (formData.get("shape") as string) ?? "";
  const meaning = (formData.get("meaning") as string) ?? "";
  const interpretation = (formData.get("interpretation") as string) ?? "";
  const example = (formData.get("example") as string) ?? "";

  if (!wordbookId.trim()) return { ok: false, error: "단어장을 선택하세요." };
  if (!no.trim()) return { ok: false, error: "no is required" };
  if (!grammar.trim()) return { ok: false, error: "grammar is required" };

  try {
    updateGrammarWordbookWord(wordbookId.trim(), no.trim(), {
      grammar: grammar.trim(),
      shape: shape.trim(),
      meaning: meaning.trim(),
      interpretation: interpretation.trim(),
      example: example.trim(),
    });

    const oldG = oldGrammar.trim();
    if (oldG && oldG !== grammar.trim()) {
      // 문법 키 변경 시 암기 정보도 같이 이동
      moveGrammarMemorized(oldG, grammar.trim());
    }

    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("updateGrammarWordbookWord error:", e);
    return { ok: false, error: msg };
  }
}

