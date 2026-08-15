import { Card, formatDateTime } from "@/components/ui";
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
  return (
    <Card>
      <h2 className="mb-1 text-sm font-semibold text-ink-900">X アカウント連携</h2>
      <p className="mb-4 text-xs text-ink-500">
        OAuth 2.0（PKCE）で接続します。X の ID・パスワードをこのアプリに入力することはありません。
        トークンは暗号化して保存されます。
      </p>

      {status === "connected" ? (
        <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          X アカウントを連携しました。
        </p>
      ) : null}
      {status === "error" ? (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          連携に失敗しました{reason ? `（${reason}）` : ""}。もう一度お試しください。
        </p>
      ) : null}
      {status === "mock-only" ? (
        <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          モックモードでは実際の X 連携は実行できません。下の「モック連携」を使うか、
          .env の X_API_MODE=real と X_CLIENT_ID 等を設定してください。
        </p>
      ) : null}

      {accounts.length > 0 ? (
        <ul className="mb-4 divide-y divide-ink-100">
          {accounts.map((account) => (
            <li
              key={account.id}
              className="flex items-center justify-between gap-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-ink-900">
                  {account.displayName ?? account.handle}
                  <span className="ml-1.5 font-normal text-ink-400">
                    @{account.handle}
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-ink-500">
                  接続 {formatDateTime(new Date(account.connectedAt))}
                  {account.lastSyncedAt
                    ? ` · 最終同期 ${formatDateTime(new Date(account.lastSyncedAt))}`
                    : ""}
                  {" · トークン: "}
                  {account.hasToken
                    ? account.tokenExpiresAt &&
                      new Date(account.tokenExpiresAt) < new Date()
                      ? "期限切れ（自動更新されます）"
                      : "有効"
                    : "なし（モック）"}
                </p>
              </div>
              <form action={disconnectXAccountAction}>
                <input type="hidden" name="accountId" value={account.id} />
                <button
                  type="submit"
                  className="rounded-md border border-ink-200 px-3 py-1.5 text-xs text-ink-500 transition hover:bg-red-50 hover:text-red-600"
                >
                  接続解除
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-4 rounded-lg bg-ink-50 px-3 py-3 text-center text-xs text-ink-500">
          連携済みのアカウントはありません。予約投稿と自己投稿分析には連携が必要です。
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {mockMode ? (
          <form action={connectMockXAccountAction}>
            <button
              type="submit"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              モック連携（開発用）
            </button>
          </form>
        ) : (
          <a
            href="/api/x/connect"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            X と連携する
          </a>
        )}
      </div>
    </Card>
  );
}
