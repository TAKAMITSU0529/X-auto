export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink-950 px-4 py-12">
      {/* 背景の光。単色の暗背景よりも奥行きが出る */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60rem 40rem at 50% -10%, rgba(66,109,242,0.28), transparent 60%), radial-gradient(40rem 30rem at 85% 110%, rgba(43,79,230,0.16), transparent 65%)",
        }}
      />

      <div className="relative w-full max-w-[400px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-700 text-lg font-bold text-white shadow-[0_8px_24px_-8px_rgba(43,79,230,0.9)]">
            X
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            X AUTO
          </h1>
          <p className="mt-2 text-[13px] text-ink-400">
            調べる。考える。作る。投稿する。伸ばす。
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white p-7 shadow-[0_24px_64px_-24px_rgba(0,0,0,0.6)]">
          {children}
        </div>

        <p className="mt-6 text-center text-[11px] leading-relaxed text-ink-500">
          X運用のリサーチから効果測定までを1つで完結させるグロースOS
        </p>
      </div>
    </main>
  );
}
