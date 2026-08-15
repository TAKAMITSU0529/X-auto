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
      <h2 className="mb-6 text-xl font-semibold text-ink-900">ログイン</h2>
      <LoginForm callbackUrl={callbackUrl ?? "/dashboard"} />
      <p className="mt-6 text-center text-sm text-ink-500">
        アカウントをお持ちでない場合は{" "}
        <Link
          href="/signup"
          className="font-medium text-brand-600 hover:underline"
        >
          新規登録
        </Link>
      </p>
    </>
  );
}
