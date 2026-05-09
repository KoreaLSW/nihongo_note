"use client";

import { useRouter } from "next/navigation";
import { deleteFromWordbook } from "@/app/actions/wordbook";

type Props = { wordbookId: string; word: string };

export function WordbookDetailDeleteButton({ wordbookId, word }: Props) {
  const router = useRouter();

  const handleDelete = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData();
    fd.set("wordbookId", wordbookId);
    fd.set("word", word);
    const res = await deleteFromWordbook(fd);
    if (res?.ok) {
      router.push(`/vocabulary2/${wordbookId}`);
      router.refresh();
    }
  };

  return (
    <form onSubmit={handleDelete} className="inline">
      <input type="hidden" name="wordbookId" value={wordbookId} />
      <input type="hidden" name="word" value={word} />
      <button
        type="submit"
        className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/40"
      >
        단어장에서 삭제
      </button>
    </form>
  );
}
