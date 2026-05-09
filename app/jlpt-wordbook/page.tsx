import Link from "next/link";
import { CreateJlptWordbookForm } from "./components/CreateJlptWordbookForm";
import { JlptWordbookHomeSelection } from "./components/JlptWordbookHomeSelection";
import { JlptWordbooksReorderPanel } from "./components/JlptWordbooksReorderPanel";
import {
  getJlptWordbookList,
  getJlptWordbookWordsCount,
  JLPT_LEVELS,
  normalizeJlptLevel,
} from "@/lib/jlptWordbook";

type Props = {
  searchParams?: Promise<{ level?: string }>;
};

export default async function JlptWordbookPage({ searchParams }: Props) {
  const params = searchParams ? await searchParams : undefined;
  const selectedLevel = normalizeJlptLevel(params?.level || "n5");
  const selectedWordbooks = getJlptWordbookList(selectedLevel);

  return (
    <div className="p-8">
      <h1 className="mb-2 text-2xl font-semibold text-zinc-800 dark:text-zinc-200">
        JLPT 단어장
      </h1>
      <div className="mb-4 mt-4 flex flex-wrap gap-2">
        {JLPT_LEVELS.map((level) => {
          const isActive = selectedLevel === level;

          return (
            <Link
              key={level}
              href={`/jlpt-wordbook?level=${level}`}
              className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
                isActive
                  ? "border-emerald-500 bg-emerald-100 text-emerald-900 dark:border-emerald-500 dark:bg-emerald-900/50 dark:text-emerald-100"
                  : "border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              {level.toUpperCase()}
            </Link>
          );
        })}
      </div>

      <div className="mb-8">
        <CreateJlptWordbookForm level={selectedLevel} />
      </div>

      <JlptWordbooksReorderPanel level={selectedLevel} wordbooks={selectedWordbooks} />

      <JlptWordbookHomeSelection
        level={selectedLevel}
        wordbooks={selectedWordbooks.map((wb) => ({
          id: wb.id,
          name: wb.name,
          file: wb.file,
          count: getJlptWordbookWordsCount(wb.id),
        }))}
      />
    </div>
  );
}
