import Link from "next/link";
import { notFound } from "next/navigation";
import { getGrammarWordbookMeta, getGrammarWordbookWords } from "@/lib/grammarWordbook";
import { GrammarReorderList } from "../../components/GrammarReorderList";

type Props = { params: Promise<{ id: string }> };

export default async function GrammarWordbookReorderPage({ params }: Props) {
  const { id } = await params;
  const meta = await getGrammarWordbookMeta(id);
  if (!meta) notFound();

  const words = await getGrammarWordbookWords(id);

  return (
    <div className="p-8">
      <Link
        href={`/grammar2/${id}`}
        className="mb-6 inline-block text-sm font-medium text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-400"
      >
        ← {meta.name} 문법단어장
      </Link>

      <h1 className="mb-2 text-2xl font-semibold text-zinc-800 dark:text-zinc-200">
        문법 순서 변경
      </h1>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        문법을 드래그해서 순서를 바꾼 뒤 「순서 저장」을 누르세요.
      </p>

      <GrammarReorderList wordbookId={id} initialWords={words} />
    </div>
  );
}

