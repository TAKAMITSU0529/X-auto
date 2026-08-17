import { Card, CardHeader, EmptyState, formatDateTime } from "@/components/ui";
import { SubmitButton } from "@/components/form";
import {
  connectMockXAccountAction,
  disconnectXAccountAction,
} from "./x-actions";

type XAccountView = {
  id: string;
  handle: string;
  displayName: string | null;
  connectedAt: string;
  lastSyncedAt: string | null;
  tokenExpiresAt: string | null;
  hasToken: boolean;
};

/**
 * X アカウント連携セクション (F-01 / 要件定義 §4)。
 * OAuth 2.0 (PKCE) で接続する。ID・パスワードは扱わない。
 */
export function XConnectSection({
  accounts,
  mockMode,
  status,
  reason,
}: {
  accounts: XAccountView[];
  mockMode: boolean;
  status?: string;
  reason?: string;
}) {
  const connected = accounts.length > 0;

  return (
    <Card>
      <CardHeader
        title="X アカウント連携"
        description="OAuth 2.0（PKCE）で接続します。X の ID・パスワードをこのアプリに入力することはありません。トークンは暗号化して保存されます。"
        action={
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              connected
                ? "bg-emerald-100 text-emerald-800"
                : "bg-ink-100 text-ink-600"
            }`}
          >
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 rounded-full ${
                connected ? "bg-emerald-500" : "bg-ink-400"
              }`}
            />
            {connected ? (
              <>
                連携済み <span className="tabular-nums">{accounts.length}</span>
                件
              </>
            ) : (
              "未連携"
            )}
          </span>
        }
      />

      {status === "connected" ? (
        <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[13px] leading-relaxed text-emerald-800">
          X アカウントを連携しました。
        </p>
      ) : null}
      {status === "error" ? (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-[13px] leading-relaxed text-rose-800"
        >
          連携に失敗しました{reason ? `（${reason}）` : ""}
          。もう一度お試しください。
        </p>
      ) : null}
      {status === "mock-only" ? (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13px] leading-relaxed text-amber-900">
          モックモードでは実際の X 連携は実行できません。下の「モック連携」を使うか、
          .env の X_API_MODE=real と X_CLIENT_ID 等を設定してください。
        </p>
      ) : null}

      {connected ? (
        <ul className="mb-5 divide-y divide-ink-100 border-y border-ink-100">
          {accounts.map((account) => {
            const expired =
              account.hasToken &&
              account.tokenExpiresAt !== null &&
              new Date(account.tokenExpiresAt) < new Date();

            return (
              <li
                key={account.id}
                className="flex flex-wrap items-center justify-between gap-4 py-3.5"
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-ink-900">
                    {account.displayName ?? account.handle}
                    <span className="ml-1.5 font-normal text-ink-400">
                      @{account.handle}
                    </span>
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-500">
                    <span className="tabular-nums">
                      接続 {formatDateTime(new Date(account.connectedAt))}
                    </span>
                    {account.lastSyncedAt ? (
                      <span className="tabular-nums">
                        · 最終同期{" "}
                        {formatDateTime(new Date(account.lastSyncedAt))}
                      </span>
                    ) : null}
                    <span>· トークン:</span>
                    <span
                      className={`rounded-full px-2 py-0.5 font-semibold ${
                        !account.hasToken
                          ? "bg-ink-100 text-ink-600"
                          : expired
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {account.hasToken
                        ? expired
                          ? "期限切れ（自動更新されます）"
                          : "有効"
                        : "なし（モック）"}
                    </span>
                  </p>
                </div>
                <form action={disconnectXAccountAction}>
                  <input type="hidden" name="accountId" value={account.id} />
                  <button
                    type="submit"
                    className="rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs font-medium text-ink-500 shadow-xs transition duration-200 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                  >
                    接続解除
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mb-5">
          <EmptyState
            title="連携済みのアカウントはありません"
            description="予約投稿と自己投稿分析には連携が必要です。下のボタンから接続してください。"
          />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {mockMode ? (
          <form action={connectMockXAccountAction}>
            <SubmitButton pendingLabel="連携中..." fullWidth={false}>
              モック連携（開発用）
            </SubmitButton>
          </form>
        ) : (
          <a
            href="/api/x/connect"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-b from-brand-500 to-brand-600 px-4 py-2 text-[13px] font-semibold text-white shadow-[0_1px_2px_rgba(16,24,40,0.08),0_6px_16px_-8px_rgba(43,79,230,0.7)] transition duration-200 hover:from-brand-600 hover:to-brand-700"
          >
            X と連携する
          </a>
        )}
      </div>
    </Card>
  );
}
