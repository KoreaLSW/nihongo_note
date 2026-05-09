"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { reorderWordbookWordsAction } from "@/app/actions/wordbook";
import type { WordbookRow } from "@/lib/wordbook";

type Props = {
  wordbookId: string;
  initialWords: WordbookRow[];
};

function SortableWordItem({
  row,
}: {
  row: WordbookRow;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.word });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-lg border border-zinc-200 bg-white py-2.5 pl-3 pr-2 dark:border-zinc-700 dark:bg-zinc-800/50 ${
        isDragging ? "z-10 shadow-lg opacity-90" : ""
      }`}
    >
      <button
        type="button"
        aria-label="드래그"
        className="cursor-grab touch-none text-zinc-400 hover:text-zinc-600 active:cursor-grabbing dark:hover:text-zinc-300"
        {...attributes}
        {...listeners}
      >
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M7 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm0 6a1 1 0 011 1v1a1 1 0 11-2 0V9a1 1 0 011-1zm0 6a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm4-12a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm0 6a1 1 0 011 1v1a1 1 0 11-2 0V9a1 1 0 011-1zm0 6a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1z" />
        </svg>
      </button>
      <span className="w-8 shrink-0 text-sm tabular-nums text-zinc-500 dark:text-zinc-400">
        {row.no}
      </span>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="shrink-0 font-medium text-zinc-900 dark:text-zinc-100">
          {row.word}
        </span>
        <span className="min-w-0 truncate text-sm text-zinc-600 dark:text-zinc-400">
          {row.meaning}
        </span>
      </div>
    </div>
  );
}

export function WordbookReorderList({ wordbookId, initialWords }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<WordbookRow[]>(initialWords);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setItems((prev) => {
      const oldIndex = prev.findIndex((r) => r.word === active.id);
      const newIndex = prev.findIndex((r) => r.word === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      const reordered = arrayMove(prev, oldIndex, newIndex);
      return reordered.map((r, i) => ({ ...r, no: String(i + 1) }));
    });
  };

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    const res = await reorderWordbookWordsAction(
      wordbookId,
      items.map((r) => r.word)
    );
    setSaving(false);
    if (res?.ok) {
      router.push(`/vocabulary2/${wordbookId}`);
      router.refresh();
    } else {
      setError(res?.error ?? "저장에 실패했습니다.");
    }
  };

  if (items.length === 0) {
    return (
      <p className="rounded-xl border-2 border-dashed border-zinc-300 py-12 text-center text-zinc-500 dark:border-zinc-600 dark:text-zinc-400">
        단어가 없어 순서를 변경할 수 없습니다.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map((r) => r.word)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-2">
            {items.map((row) => (
              <SortableWordItem key={row.word} row={row} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {saving ? "저장 중…" : "순서 저장"}
        </button>
      </div>
    </div>
  );
}
