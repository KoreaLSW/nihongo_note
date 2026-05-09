"use server";

import { createJlptWordbook } from "@/lib/jlptWordbook";
import { appendWordToJlptWordbook } from "@/lib/jlptWordbook";
import {
  setJlptWordMemorizedByQuizView,
  type JlptQuizMemorizedView,
} from "@/lib/jlptWordbook";
import { importJlptWordsFromCsv } from "@/lib/jlptWordbook";
import { deleteJlptWordbook } from "@/lib/jlptWordbook";
import { renameJlptWordbook } from "@/lib/jlptWordbook";
import { updateJlptWordbookWord, removeWordFromJlptWordbook } from "@/lib/jlptWordbook";
import { reorderJlptWordbooks } from "@/lib/jlptWordbook";

export async function createJlptWordbookAction(formData: FormData) {
  const level = (formData.get("level") as string) ?? "";
  const name = (formData.get("name") as string) ?? "";

  if (!name.trim()) return { ok: false, error: "단어장 이름을 입력하세요." };

  try {
    createJlptWordbook(level, name.trim());
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("createJlptWordbookAction error:", e);
    return { ok: false, error: msg };
  }
}

export async function insertToJlptWordbookAction(formData: FormData) {
  const wordbookId = (formData.get("wordbookId") as string) ?? "";
  const word = (formData.get("word") as string) ?? "";
  const meaning = (formData.get("meaning") as string) ?? "";
  const hiragana = (formData.get("hiragana") as string) ?? "";

  if (!wordbookId.trim()) return { ok: false, error: "단어장을 선택하세요." };
  if (!word.trim()) return { ok: false, error: "단어를 입력하세요." };

  try {
    appendWordToJlptWordbook(wordbookId.trim(), {
      word: word.trim(),
      meaning: meaning.trim(),
      hiragana: hiragana.trim(),
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.startsWith("duplicate")) {
      return { ok: false, error: "이미 이 단어장에 있는 단어입니다." };
    }
    console.error("insertToJlptWordbookAction error:", e);
    return { ok: false, error: msg };
  }
}

export async function setJlptWordMemorizedAction(formData: FormData) {
  const wordbookId = (formData.get("wordbookId") as string) ?? "";
  const no = (formData.get("no") as string) ?? "";
  const value = (formData.get("value") as string) ?? "no";
  const rawView = (formData.get("quizView") as string) ?? "word";

  if (!wordbookId.trim()) return { ok: false, error: "단어장을 선택하세요." };
  if (!no.trim()) return { ok: false, error: "항목 번호가 필요합니다." };

  const view: JlptQuizMemorizedView =
    rawView === "meaning" || rawView === "hiragana" ? rawView : "word";

  try {
    setJlptWordMemorizedByQuizView(wordbookId.trim(), no.trim(), view, value === "yes");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("setJlptWordMemorizedAction error:", e);
    return { ok: false, error: msg };
  }
}

export async function importJlptWordbookCsvAction(formData: FormData) {
  const wordbookId = (formData.get("wordbookId") as string) ?? "";
  const file = formData.get("file");

  if (!wordbookId.trim()) return { ok: false, error: "단어장을 선택하세요." };
  if (!(file instanceof File)) return { ok: false, error: "CSV 파일을 선택하세요." };
  if (!file.name.toLowerCase().endsWith(".csv")) {
    return { ok: false, error: "CSV 파일만 업로드할 수 있습니다." };
  }

  try {
    const text = await file.text();
    const res = importJlptWordsFromCsv(wordbookId.trim(), text);
    return { ok: true, ...res };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("importJlptWordbookCsvAction error:", e);
    return { ok: false, error: msg };
  }
}

export async function deleteJlptWordbookAction(formData: FormData) {
  const wordbookId = (formData.get("wordbookId") as string) ?? "";
  if (!wordbookId.trim()) return { ok: false, error: "단어장을 선택하세요." };

  try {
    deleteJlptWordbook(wordbookId.trim());
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("deleteJlptWordbookAction error:", e);
    return { ok: false, error: msg };
  }
}

export async function renameJlptWordbookAction(formData: FormData) {
  const wordbookId = (formData.get("wordbookId") as string) ?? "";
  const name = (formData.get("name") as string) ?? "";

  if (!wordbookId.trim()) return { ok: false, error: "단어장을 선택하세요." };
  if (!name.trim()) return { ok: false, error: "단어장 이름을 입력하세요." };

  try {
    renameJlptWordbook(wordbookId.trim(), name.trim());
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("renameJlptWordbookAction error:", e);
    return { ok: false, error: msg };
  }
}

export async function updateJlptWordbookWordAction(formData: FormData) {
  const wordbookId = (formData.get("wordbookId") as string) ?? "";
  const no = (formData.get("no") as string) ?? "";
  const word = (formData.get("word") as string) ?? "";
  const meaning = (formData.get("meaning") as string) ?? "";
  const hiragana = (formData.get("hiragana") as string) ?? "";

  if (!wordbookId.trim()) return { ok: false, error: "단어장을 선택하세요." };
  if (!no.trim()) return { ok: false, error: "항목 번호가 필요합니다." };
  if (!word.trim()) return { ok: false, error: "단어를 입력하세요." };
  if (!meaning.trim()) return { ok: false, error: "뜻을 입력하세요." };

  try {
    updateJlptWordbookWord(wordbookId.trim(), no.trim(), {
      word: word.trim(),
      meaning: meaning.trim(),
      hiragana: hiragana.trim(),
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.startsWith("duplicate")) {
      return { ok: false, error: "이미 이 단어장에 있는 단어입니다." };
    }
    console.error("updateJlptWordbookWordAction error:", e);
    return { ok: false, error: msg };
  }
}

export async function deleteFromJlptWordbookAction(formData: FormData) {
  const wordbookId = (formData.get("wordbookId") as string) ?? "";
  const no = (formData.get("no") as string) ?? "";

  if (!wordbookId.trim()) return { ok: false, error: "단어장을 선택하세요." };
  if (!no.trim()) return { ok: false, error: "항목 번호가 필요합니다." };

  try {
    removeWordFromJlptWordbook(wordbookId.trim(), no.trim());
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("deleteFromJlptWordbookAction error:", e);
    return { ok: false, error: msg };
  }
}

export async function reorderJlptWordbooksAction(level: string, wordbookIds: string[]) {
  if (!String(level ?? "").trim()) {
    return { ok: false, error: "레벨 정보가 올바르지 않습니다." };
  }
  if (!Array.isArray(wordbookIds)) {
    return { ok: false, error: "순서 데이터가 올바르지 않습니다." };
  }

  try {
    reorderJlptWordbooks(String(level).trim(), wordbookIds);
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("reorderJlptWordbooksAction error:", e);
    return { ok: false, error: msg };
  }
}
