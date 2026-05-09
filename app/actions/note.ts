"use server";

import { appendNote, removeNote } from "@/lib/note";
import { setMemorized as setMemorizedState, setReviewed as setReviewedState } from "@/lib/memorized";

export async function insertToNote(formData: FormData) {
  const word = (formData.get("word") as string) ?? "";
  const meaning = (formData.get("meaning") as string) ?? "";
  const level = (formData.get("level") as string) ?? "";
  const reading = (formData.get("reading") as string) ?? "";

  if (!word.trim()) return { ok: false, error: "word is required" };

  try {
    appendNote({
      word: word.trim(),
      meaning: meaning.trim(),
      level: level.trim() || "N5",
      reading: reading.trim(),
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.startsWith("duplicate")) {
      return { ok: false, error: "이미 단어장에 있는 단어입니다." };
    }
    console.error("insertToNote error:", e);
    return { ok: false, error: msg };
  }
}

export async function deleteFromNote(formData: FormData) {
  const word = (formData.get("word") as string) ?? "";

  if (!word.trim()) return { ok: false, error: "word is required" };

  try {
    removeNote(word.trim());
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "word not found") {
      return { ok: false, error: "단어장에 없는 단어입니다." };
    }
    console.error("deleteFromNote error:", e);
    return { ok: false, error: msg };
  }
}

export async function setMemorized(formData: FormData) {
  const word = (formData.get("word") as string) ?? "";
  const value = (formData.get("value") as string) ?? "no";

  if (!word.trim()) return { ok: false, error: "word is required" };

  try {
    setMemorizedState(word.trim(), value === "yes");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("setMemorized error:", e);
    return { ok: false, error: msg };
  }
}

export async function setReviewed(formData: FormData) {
  const word = (formData.get("word") as string) ?? "";

  if (!word.trim()) return { ok: false, error: "word is required" };

  try {
    setReviewedState(word.trim());
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("setReviewed error:", e);
    return { ok: false, error: msg };
  }
}
