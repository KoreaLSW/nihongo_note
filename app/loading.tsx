export default function Loading() {
  return (
    <div
      className="flex min-h-[40vh] w-full flex-col items-center justify-center gap-4 p-8"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className="h-9 w-9 animate-spin rounded-full border-[3px] border-zinc-200 border-t-zinc-800 dark:border-zinc-600 dark:border-t-zinc-200"
        aria-hidden
      />
      <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
        불러오는 중…
      </p>
    </div>
  );
}
