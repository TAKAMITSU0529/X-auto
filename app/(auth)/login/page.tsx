import Link from "next/link";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <>
      <div className="mb-6 border-b border-ink-100 pb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-600">
          アカウント
        </p>
        <h2 className="mt-1 text-[20px] font-bold leading-tight text-ink-900">
          ログイン
        </h2>
      </div>

      <LoginForm callbackUrl={callbackUrl ?? "/dashboard"} />

      <p className="mt-6 border-t border-ink-100 pt-5 text-center text-[13px] text-ink-500">
        アカウントをお持ちでない場合は{" "}
        <Link
          href="/signup"
          className="font-semibold text-brand-600 underline-offset-4 transition duration-200 hover:text-brand-700 hover:underline"
        >
          新規登録
        </Link>
      </p>
    </>
  );
}
