export default function Home() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center p-8 text-center">
      <h1 className="mb-2 text-2xl font-semibold text-zinc-800 dark:text-zinc-200">
        나만의 단어장에 오신 것을 환영합니다
      </h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        왼쪽 메뉴에서 레벨(N5~N1)을 선택하거나, 퀴즈·단어장을 이용해 보세요.
      </p>
    </div>
  );
}
