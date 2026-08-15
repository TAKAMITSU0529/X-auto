import Link from "next/link";
import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <>
      <h2 className="mb-6 text-xl font-semibold text-ink-900">新規登録</h2>
      <SignupForm />
      <p className="mt-6 text-center text-sm text-ink-500">
        すでにアカウントをお持ちの場合は{" "}
        <Link href="/login" className="font-medium text-brand-600 hover:underline">
          ログイン
        </Link>
      </p>
    </>
  );
}
