# X AUTO

**X（旧Twitter）専用 リサーチ × 分析 × 戦略 × 投稿生成 × 予約投稿 × 効果測定 × 学習の統合グロースOS**

X運用の「リサーチ → 競合発見 → ヒット投稿抽出 → 勝ちパターン分析 → ポジショニング → 投稿生成 → 予約投稿 → 効果測定 → AIによる改善」のサイクルを1つのシステムで完結させるツール。

## コンセプト

**MODEL → ORIGINAL → LEARN**

- **MODEL**：競合・市場の成功パターンを収集・分析する
- **ORIGINAL**：成功パターンの構造だけを利用し、本人の知識・経験・主張・商品に置き換える
- **LEARN**：投稿後の実績から「このユーザーの場合は何が伸びるのか」を学習する

## ドキュメント

| ドキュメント | 内容 |
|---|---|
| [X-AUTO要件定義書-v2.0.md](docs/X-AUTO要件定義書-v2.0.md) | **確定版の統合要件定義**。機能要件（F-01〜F-25）・非機能要件・システム構成・データモデル・APIコスト設計・開発フェーズ・受け入れ基準・リスク対応 |
| [comparison-analysis.md](docs/comparison-analysis.md) | 元になった2つの要件定義（Fable版 v1.0 / ChatGPT版）の比較分析と統合判断の記録 |

## セットアップ

### 必要なもの

- Node.js 22 以上
- PostgreSQL 16 以上

X API / Anthropic API の認証情報は**開発を始めるのに必須ではありません**。既定ではモックモードで動作し、認証情報なしで全画面を通しで確認できます。

### 手順

```bash
# 1. 依存関係のインストール
npm install

# 2. 環境変数の用意
cp .env.example .env
# AUTH_SECRET と TOKEN_ENCRYPTION_KEY は必ず自分で生成した値に置き換える
#   openssl rand -base64 32

# 3. データベースの用意（ローカル PostgreSQL の例）
createdb xauto
npx prisma migrate deploy

# 4. サンプルデータの投入（任意だが推奨）
npm run db:seed

# 5. 起動
npm run dev
```

`http://localhost:3000` を開き、シードで作られるデモアカウントでログインできます。

```
メールアドレス: demo@example.com
パスワード:     password1234
```

### 実データへの切り替え

`.env` の以下を変更すると、モックから実際の API 呼び出しに切り替わります。コードの変更は不要です。

| 変数 | 内容 |
|---|---|
| `X_API_MODE=real` | X API v2 を実際に呼び出す。`X_BEARER_TOKEN` などが必要 |
| `AI_MODE=real` | Anthropic API を実際に呼び出す。`ANTHROPIC_API_KEY` が必要 |

X API は従量課金です。**必ず X Developer Console 側でも spending limits を設定してください。** アプリ側の上限は設定画面（BUDGET LIMIT）から変更できます。

## 実装状況

### 完了：Phase 1 スライス1（土台＋リサーチ）

| 機能 | 内容 |
|---|---|
| F-01（一部） | メール+パスワード認証、セッション、ルート保護 |
| F-03 | ベンチマークリスト管理（リスト・アカウントのCRUD） |
| F-02 | ベンチマーク投稿リサーチ（取得・ランキング・10種のソート） |
| F-14 | **外れ値検出（Outlier Score）** |
| F-25 | API USAGE 記録・BUDGET LIMIT 強制・24時間キャッシュ |
| F-21（一部） | ダッシュボード（数値サマリー・次にやること・外れ値トップ3） |

### 未実装

- スライス2：X OAuth 2.0 PKCE 連携、F-04 投稿AI分析、F-16 MODEL LIBRARY、F-17 MY BRAND
- スライス3：F-05 モデリング再生成（類似度チェック）、F-06 3案生成
- スライス4：F-07 予約投稿・コンテンツカレンダー、F-10 自己投稿分析
- Phase 2 以降は要件定義 §10 を参照

## 設計上の要点

### 外部API抽象化層

X API と AI の呼び出しは、必ず `lib/x-api/` と `lib/ai/` のファサード経由で行います。ここで以下が漏れなく適用されます。

1. **BUDGET LIMIT の判定**（上限到達時は `BudgetExceededError` で停止）
2. **キャッシュ判定**（同一投稿を24時間以内に再取得しない）
3. **api_usage への記録**（種別・エンドポイント・件数・推定コスト）

呼び出し箇所ごとにコスト制御を書く必要がないため、機能追加時にコスト管理が抜けません。実装は `mock` / `real` の2種類があり、環境変数だけで切り替わります。

### 外れ値スコア（F-14）

`lib/metrics/outlier.ts`。「そのアカウントの通常成績と比べて何倍伸びたか」を計算します。

ベースラインには**平均ではなく中央値**を使っています。平均だと外れ値自身がベースラインを押し上げてしまい、本来検出したい投稿のスコアが下がるためです。

### AI出力の扱い

要件定義 §9 に従い、AIの出力は **DATA（確認できた事実）／ HYPOTHESIS（AIによる仮説）／ ACTION（次に行う行動）** を区別して表示します（`components/ui.tsx` の `DataNote` / `HypothesisNote` / `NextActionButton`）。

## スクリプト

| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | 本番ビルド |
| `npm run typecheck` | 型チェック |
| `npm run db:migrate` | マイグレーション作成・適用（開発用） |
| `npm run db:seed` | サンプルデータ投入 |
| `npm run db:studio` | Prisma Studio |
| `npx tsx scripts/verify-slice1.ts` | スライス1の受け入れ確認（キャッシュ・BUDGET LIMIT の動作を実地確認する開発用スクリプト） |

## 技術スタック

Next.js 16（App Router）/ React 19 / TypeScript / Tailwind CSS 4 / PostgreSQL 16 + Prisma 7 / Auth.js v5 / Anthropic API / X API v2
