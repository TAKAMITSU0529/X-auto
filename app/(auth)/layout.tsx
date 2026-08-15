export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-ink-900">
            X AUTO
          </h1>
          <p className="mt-2 text-sm text-ink-500">
            調べる。考える。作る。投稿する。伸ばす。
          </p>
        </div>
        <div className="rounded-2xl border border-ink-200 bg-white p-8 shadow-sm">
          {children}
        </div>
      </div>
    </main>
  );
}
