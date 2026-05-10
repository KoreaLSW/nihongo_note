import Link from "next/link";
import { notFound } from "next/navigation";
import { getGrammarWordbookList } from "@/lib/grammarWordbook";
import {
  getJlptGrammarItems,
  JLPT_GRAMMAR_LEVELS as LEVELS,
} from "@/lib/jlptGrammar";
import { AddJlptGrammarToWordbookModal } from "../../components/AddJlptGrammarToWordbookModal";
import { JlptGrammarMemorizedButton } from "../../components/JlptGrammarMemorizedButton";

type Props = {
  params: Promise<{ level: string; no: string }>;
};

function normalizeAudioUrl(u: string): string {
  const s = String(u ?? "").trim();
  if (!s) return "";
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return `https://nihongo.co.kr${s.startsWith("/") ? "" : "/"}${s}`;
}

function removeSpacesInJapaneseLine(text: string): string {
  const t = String(text ?? "");
  if (!t.trim()) return "";
  const [first, ...rest] = t.split("\n");
  const ja = String(first ?? "")
    .replace(/[ \t\u3000]+/g, "") // half/full width spaces
    .trimEnd();
  return [ja, ...rest].join("\n").trim();
}

export default async function JlptGrammarDetailPage({ params }: Props) {
  const { level: rawLevel, no: rawNo } = await params;
  const level = String(rawLevel ?? "").toLowerCase();
  if (!LEVELS.includes(level as (typeof LEVELS)[number])) notFound();

  const no = Number(String(rawNo ?? "").trim());
  if (!Number.isFinite(no) || no <= 0) notFound();

  const list = await getJlptGrammarItems(level as (typeof LEVELS)[number]);
  const item = list.find((x) => Number(x?.no) === no) ?? null;
  if (!item) notFound();
  const wordbooks = await getGrammarWordbookList();

  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-xs font-semibold tracking-wide text-sky-700 dark:text-sky-300">
              JLPT 문법 {level.toUpperCase()} · NO {item.no}
            </div>
            <div className="mt-2">
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                  item.memorized === "yes"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
                }`}
              >
                {item.memorized === "yes" ? "암기" : "미암기"}
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              {item.title ?? "(제목 없음)"}
            </h1>
            {item.meaning ? (
              <div className="mt-3">
                <div className="text-sm font-semibold text-zinc-500 dark:text-zinc-300">
                  의미
                </div>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700 dark:text-zinc-200">
                  {String(item.meaning)
                    .split(/\r?\n/g)
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .map((line, i) => (
                      <li key={i} className="leading-7">
                        {line}
                      </li>
                    ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="flex gap-2">
            <JlptGrammarMemorizedButton
              level={level}
              no={item.no}
              memorized={item.memorized === "yes"}
            />
            <Link
              href={`/jlpt-grammar/${level}`}
              className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-100 dark:hover:bg-zinc-800/50"
            >
              목록으로
            </Link>
            <AddJlptGrammarToWordbookModal
              wordbooks={wordbooks}
              level={level}
              no={no}
              grammarTitle={String(item.title ?? "").trim() || "(제목 없음)"}
            />
            {item.href ? (
              <Link
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-700"
              >
                원문 보기
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800/50">
        {item.connection ? (
          <div className="rounded-xl bg-zinc-50 p-5 text-lg text-zinc-700 dark:bg-zinc-900/30 dark:text-zinc-200">
            <div className="mb-2 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
              접속
            </div>
            <div className="whitespace-pre-wrap">{item.connection}</div>
          </div>
        ) : null}

        {item.description ? (
          <div className="mt-5">
            <div className="mb-2 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
              설명
            </div>
            <div className="whitespace-pre-wrap text-lg leading-8 text-zinc-800 dark:text-zinc-100">
              {item.description}
            </div>
          </div>
        ) : null}

        <div className="mt-6">
          <div className="mb-2 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
            예문
          </div>
          {(item.examples_items ?? []).length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-lg text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
              예문이 없습니다.
            </div>
          ) : (
            <div className="space-y-3">
              {(item.examples_items ?? []).map((ex, idx) => {
                const text = removeSpacesInJapaneseLine(String(ex?.text ?? ""));
                const audio = ex?.audio ?? {};
                const male = normalizeAudioUrl(audio["남"] ?? "");
                const female = normalizeAudioUrl(audio["여"] ?? "");
                if (!text && !male && !female) return null;

                return (
                  <div
                    key={`${item.no}-${idx}`}
                    className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900/30"
                  >
                    {text ? (
                      <div className="whitespace-pre-wrap text-lg leading-8 text-zinc-800 dark:text-zinc-100">
                        {text}
                      </div>
                    ) : null}

                    {(male || female) ? (
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                        {male ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                              남
                            </span>
                            <audio controls preload="none" src={male} />
                          </div>
                        ) : null}
                        {female ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                              여
                            </span>
                            <audio controls preload="none" src={female} />
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {(Array.isArray(item.related) && item.related.length > 0) ? (
          <div className="mt-6">
            <div className="mb-2 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
              관련 문법
            </div>
            <div className="flex flex-wrap gap-2">
              {item.related
                .filter((r) => (r?.title ?? r?.href ?? "").trim() !== "")
                .map((r, idx) => {
                  const title = String(r.title ?? "").trim() || "관련 항목";
                  const href = String(r.href ?? "").trim();
                  return href ? (
                    <Link
                      key={`${item.no}-rel-${idx}`}
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-lg text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-100 dark:hover:bg-zinc-800/50"
                    >
                      {title}
                    </Link>
                  ) : (
                    <span
                      key={`${item.no}-rel-${idx}`}
                      className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-lg text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/30 dark:text-zinc-200"
                    >
                      {title}
                    </span>
                  );
                })}
            </div>
          </div>
        ) : null}

        {item.video?.youtube ? (
          <div className="mt-6">
            <div className="mb-2 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
              {String(item.video.title ?? "").trim() || "영상"}
            </div>
            {item.video.text ? (
              <div className="mb-3 whitespace-pre-wrap text-lg leading-8 text-zinc-700 dark:text-zinc-200">
                {item.video.text}
              </div>
            ) : null}
            <div className="max-w-xl overflow-hidden rounded-2xl border border-zinc-200 bg-black/5 dark:border-zinc-700">
              <iframe
                className="aspect-video w-full"
                src={item.video.youtube}
                title={String(item.video.title ?? "JLPT 문법 영상")}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

