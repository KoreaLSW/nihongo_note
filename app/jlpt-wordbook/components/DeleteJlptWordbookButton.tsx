"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteJlptWordbookAction } from "@/app/actions/jlptWordbook";

type Props = {
  wordbookId: string;
  redirectLevel?: string;
};

export function DeleteJlptWordbookButton({ wordbookId, redirectLevel }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const onDelete = async () => {
    const ok = window.confirm("이 단어장을 삭제할까요? 단어도 함께 삭제됩니다.");
    if (!ok) return;

    setPending(true);
    const fd = new FormData();
    fd.set("wordbookId", wordbookId);
    const res = await deleteJlptWordbookAction(fd);
    setPending(false);

    if (!res?.ok) {
      alert(res?.error ?? "삭제 실패");
      return;
    }

    if (redirectLevel) {
      router.push(`/jlpt-wordbook?level=${redirectLevel}`);
      return;
    }
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={pending}
      className="inline-flex w-fit items-center justify-center rounded-lg bg-red-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-600 disabled:opacity-50 dark:bg-red-600 dark:hover:bg-red-500"
    >
      {pending ? "삭제 중..." : "삭제"}
    </button>
  );
}
