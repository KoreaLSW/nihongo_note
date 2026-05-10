import Link from "next/link";
import { notFound } from "next/navigation";
import { getWordbookMeta, getWordbookWords } from "@/lib/wordbook";
import { WordbookReorderList } from "../../components/WordbookReorderList";

type Props = { params: Promise<{ id: string }> };

export default async function WordbookReorderPage({ params }: Props) {
  const { id } = await params;
  const meta = await getWordbookMeta(id);
  if (!meta) notFound();

  const words = await getWordbookWords(id);

  return (
    <div className="p-8">
      <Link
        href={`/vocabulary2/${id}`}
        className="mb-6 inline-block text-sm font-medium text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-400"
      >
        ← {meta.name} 단어장
      </Link>

      <h1 className="mb-2 text-2xl font-semibold text-zinc-800 dark:text-zinc-200">
        단어 순서 변경
      </h1>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        단어를 드래그해서 순서를 바꾼 뒤 「순서 저장」을 누르세요.
      </p>

      <WordbookReorderList wordbookId={id} initialWords={words} />
    </div>
  );
}
