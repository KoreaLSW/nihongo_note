"use server";

import {
  createWordbook as createWordbookLib,
  appendWordToWordbook,
  removeWordFromWordbook,
  reorderWordbookWords,
  reorderWordbooks,
  renameWordbook,
} from "@/lib/wordbook";

export async function createWordbook(formData: FormData) {
  const name = (formData.get("name") as string) ?? "";

  if (!name.trim()) return { ok: false, error: "단어장 이름을 입력하세요." };

  try {
    createWordbookLib(name.trim());
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("createWordbook error:", e);
    return { ok: false, error: msg };
  }
}

export async function insertToWordbook(formData: FormData) {
  const wordbookId = (formData.get("wordbookId") as string) ?? "";
  const word = (formData.get("word") as string) ?? "";
  const meaning = (formData.get("meaning") as string) ?? "";
  const level = (formData.get("level") as string) ?? "";
  const reading = (formData.get("reading") as string) ?? "";

  if (!wordbookId.trim()) return { ok: false, error: "단어장을 선택하세요." };
  if (!word.trim()) return { ok: false, error: "word is required" };

  try {
    appendWordToWordbook(wordbookId.trim(), {
      word: word.trim(),
      meaning: meaning.trim(),
      level: level.trim() || "N5",
      reading: reading.trim(),
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.startsWith("duplicate")) {
      return { ok: false, error: "이미 이 단어장에 있는 단어입니다." };
    }
    console.error("insertToWordbook error:", e);
    return { ok: false, error: msg };
  }
}

export async function deleteFromWordbook(formData: FormData) {
  const wordbookId = (formData.get("wordbookId") as string) ?? "";
  const word = (formData.get("word") as string) ?? "";

  if (!wordbookId.trim()) return { ok: false, error: "wordbookId is required" };
  if (!word.trim()) return { ok: false, error: "word is required" };

  try {
    removeWordFromWordbook(wordbookId.trim(), word.trim());
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "word not found") {
      return { ok: false, error: "단어장에 없는 단어입니다." };
    }
    console.error("deleteFromWordbook error:", e);
    return { ok: false, error: msg };
  }
}

export async function reorderWordbookWordsAction(
  wordbookId: string,
  wordOrder: string[]
) {
  if (!wordbookId?.trim()) return { ok: false, error: "단어장을 선택하세요." };
  if (!Array.isArray(wordOrder)) return { ok: false, error: "순서 데이터가 올바르지 않습니다." };

  try {
    reorderWordbookWords(wordbookId.trim(), wordOrder);
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("reorderWordbookWords error:", e);
    return { ok: false, error: msg };
  }
}

export async function renameWordbookAction(formData: FormData) {
  const wordbookId = (formData.get("wordbookId") as string) ?? "";
  const name = (formData.get("name") as string) ?? "";

  if (!wordbookId.trim()) return { ok: false, error: "단어장을 선택하세요." };
  if (!name.trim()) return { ok: false, error: "단어장 이름을 입력하세요." };

  try {
    renameWordbook(wordbookId.trim(), name.trim());
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("renameWordbook error:", e);
    return { ok: false, error: msg };
  }
}

export async function reorderWordbooksAction(wordbookIds: string[]) {
  if (!Array.isArray(wordbookIds)) {
    return { ok: false, error: "순서 데이터가 올바르지 않습니다." };
  }

  try {
    reorderWordbooks(wordbookIds);
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("reorderWordbooks error:", e);
    return { ok: false, error: msg };
  }
}
