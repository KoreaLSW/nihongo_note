import { redirect } from "next/navigation";
import { LoginForm } from "./LoginForm";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Props = {
  searchParams?: Promise<{
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const qp = searchParams ? await searchParams : undefined;
  const next = qp?.next || "/";

  if (user) {
    redirect(next);
  }

  return (
    <div className="flex min-h-full items-center justify-center p-8">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/60">
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Supabase Auth
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          로그인
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          등록된 이메일과 비밀번호로 로그인하세요.
        </p>

        <LoginForm />
      </div>
    </div>
  );
}
