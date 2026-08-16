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
          <h1 className="sr-only">X AUTO</h1>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/logo-lockup.svg"
            alt="X AUTO"
            width={320}
            height={92}
            className="h-16 w-auto"
          />
          <p className="mt-3 text-[13px] text-ink-400">
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
