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

# 6. (別ターミナル) 予約投稿とメトリクス取得の worker
npm run worker
```

worker を起動しない場合でも、予約投稿画面の「期限が来た予約を今すぐ処理」・自己分析画面の「メトリクスを今すぐ取得」ボタンで手動実行できます。

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

### 完了：Phase 1（MVP）全スライス

| 機能 | 内容 |
|---|---|
| F-01 | メール+パスワード認証、セッション、ルート保護、**X OAuth 2.0（PKCE）連携**（トークンはAES-256-GCMで暗号化保存、自動リフレッシュ。モックモードではモック連携ボタン） |
| F-03 | ベンチマークリスト管理（リスト・アカウントのCRUD） |
| F-02 | ベンチマーク投稿リサーチ（取得・ランキング・10種のソート） |
| F-14 | **外れ値検出（Outlier Score）** |
| F-04 | **投稿AI分析**（テーマ・ターゲット・インサイト・構成・HOOK・キーワード・感情・具体性・CTA・反応理由の10項目。AI推定として明示表示） |
| F-16 | **MODEL LIBRARY**（分類タグ付き保存・タグフィルタ一覧） |
| F-17 | **MY BRAND 軽量版**（基本情報・発信スタイル・禁止事項） |
| F-05 | **モデリング再生成＋コピー防止**（構造だけ転用。文字3-gram Jaccard＋最長共通部分文字列で類似度判定し、酷似した生成文に警告・丸写しの保存は拒否） |
| F-06 | **3案生成**（A反応重視／B専門性重視／C共感重視。MY BRAND を参照し、選択・編集・下書き保存） |
| F-07 | **投稿管理＋予約投稿**（日時指定でXへ自動投稿。worker による30秒間隔の処理、指数バックオフの自動リトライ、同一コンテンツの再投稿ブロック、キャンセル） |
| F-10 | **自己投稿分析**（投稿後 1h/6h/24h/3d/7d/14d/30d の定期スナップショットで非公開指標の30日制限に対応。投稿一覧・ER・プロフィール/URLクリック表示） |
| F-25 | API USAGE 記録・BUDGET LIMIT 強制・24時間キャッシュ |
| F-21 | ダッシュボード（数値サマリー・今日の予約投稿・失敗アラート・次にやること・外れ値トップ3） |

### 完了：Phase 2 スライスA〜C

| 機能 | 内容 |
|---|---|
| F-15 | **X AUTO IMPACT SCORE**（外れ値・量・ER・反応の質・新しさの加重合成 0〜100。ランキングのソート軸に追加） |
| F-04 一括 | **複数投稿の一括分析**（外れ値上位20件を横断分析：共通構造・HOOK・テーマ・感情・CTA・形式） |
| F-16 自動生成 | **WINNING PATTERN 自動抽出**（一括分析から勝ちパターンを保存。ライブラリから「この型で作る」で生成に転用） |
| F-06 予測スコア | **AI予測反応スコア**（10軸評価＋総合点を3案それぞれに付与。強み/弱みの表示。保証ではなくAI推定として明示） |
| F-10 拡張 | **TIME/HOOK/FORMAT分析**（曜日×時間帯ヒートマップ・書き出しタイプ別/形式別の平均ER。分類はルールベース＝DATA扱い、日本時間） |
| F-19 初版 | **Learning Loop**（INPUT[HOOK・形式・時間帯]→RESULT[ER]の集計から「このアカウントで伸びる要素」を算出） |
| F-20 | **週次AIレポート＋NEXT BEST ACTION**（直近7日の実測集計→AI総括・増やす/減らす・次の具体的行動。保存・再生成可） |
| F-21 完成 | **AI INSIGHT**（ダッシュボードに実測傾向（DATA）とNEXT BEST ACTION（AI推定）を表示） |
| F-19 補正 | **Personal Growth Model 補正**（本人実績3件以上で、伸びているHOOK/形式に一致する案の予測スコアを加点。補正理由と基礎点を明示） |
| F-02 出力 | **CSVエクスポート**（ランキングをBOM付きUTF-8でダウンロード） |

### 完了：Phase 3 全スライス（A〜E）

| 機能 | 内容 |
|---|---|
| F-11 | **ジャンル・トレンド分析＋TREND RADAR**（直近7日検索→AIが Rising/Evergreen/Saturated/Opportunity に4分類。投稿ネタ候補から「この内容で3案生成」へワンクリック連携） |
| F-24 | **検索/フィルタ**（取得済み投稿の横断検索：キーワード・アカウント・いいね数・保存済み。DB内検索でAPIコスト0） |
| F-08 | **競合発見エンジン＋COMPETITOR SCORE**（キーワード検索で同ジャンル発信者を発見→AIが0〜100で採点・理由付き→ワンクリックでベンチマーク追加。Follow Graph探索はコスト過大のため非実装） |
| F-12 | **ポジショニング分析＋プロフィール生成**（登録済み競合を2軸マップに配置、空きポジション仮説、POSITIONING SCORE、名前欄/bio/固定ポスト/ヘッダーコピーの3案生成。DB内の公開プロフィールのみ使用でAPIコスト0） |
| F-09 | **マーケティング戦略AI**（WHO/WHAT/WHY/HOW 設定ウィザード・CUSTOMER INSIGHT（本音9項目の仮説化。必ず「マーケティング仮説」表示）・MARKETING PLAYBOOK（原則別アドバイス＋リスト動線＋CUSTOMER JOURNEY）。投稿生成が常に参照し、投稿ごとにJOURNEY段階を指定可能） |
| F-17 | **KNOWLEDGE BASE**（考え方・経験・失敗談・事例・商品情報の蓄積。生成時は競合投稿より本人の一次情報を優先参照。関連度はバイグラム一致で自動選択） |
| F-18 | **CONTENT PILLARS・投稿比率設計**（発信テーマの柱（最大6本）と目標比率＋目的別比率（Reach/Authority/Trust/Education/Conversion）を設計。直近の自己投稿をキーワード一致で分類＝DATA扱い・AIコスト0でズレを可視化し、不足テーマから生成へワンクリック連携） |
| F-13 | **競合マネタイズ動線分析＋FUNNEL MAP**（登録済み競合の公開情報（bio・URL・投稿内CTA）から収益タイプと導線を分析。「確認済み」と「推定」を必ず区別表示、収益額等の非公開情報は推測しない。「自分が転用するならこの動線」の提案付き。外部サイトのクロールはせずDB内データのみでX APIコスト0） |

### 未実装（以降）

- テーマ別分析・コンテンツカレンダー（月表示）・画像/スレッド投稿・投稿前AIチェック・Phase 4（AI CHAT・SaaS化等）は要件定義 §10 参照

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
| `npx tsx scripts/verify-slice2.ts` | スライス2の受け入れ確認（トークン暗号化・PKCE/認可URL） |
| `npx tsx scripts/verify-slice3.ts` | スライス3の受け入れ確認（類似度チェック・3案生成・丸写し拒否） |
| `npx tsx scripts/verify-slice4.ts` | スライス4の受け入れ確認（予約→投稿→自己投稿化→スナップショット・重複ブロック） |
| `npx tsx scripts/verify-phase2a.ts` | Phase 2 スライスAの受け入れ確認（IMPACT SCORE・一括分析・勝ちパターン・予測スコア） |
| `npx tsx scripts/verify-phase2b.ts` | Phase 2 スライスBの受け入れ確認（HOOK/形式/時間帯分析・週次レポート） |
| `npx tsx scripts/verify-phase2c.ts` | Phase 2 スライスCの受け入れ確認（Personal Growth Model 補正・CSV） |
| `npx tsx scripts/verify-phase3a.ts` | Phase 3 スライスAの受け入れ確認（トレンド分析・検索） |
| `npx tsx scripts/verify-phase3b.ts` | Phase 3 スライスBの受け入れ確認（競合発見・COMPETITOR SCORE） |
| `npx tsx scripts/verify-phase3c.ts` | Phase 3 スライスCの受け入れ確認（ポジショニング・プロフィール3案） |
| `npx tsx scripts/verify-phase3d.ts` | Phase 3 スライスDの受け入れ確認（マーケティング戦略AI・KNOWLEDGE BASE） |
| `npx tsx scripts/verify-phase3e.ts` | Phase 3 スライスEの受け入れ確認（CONTENT PILLARS・動線分析） |
| `npm run worker` | 予約投稿（30秒間隔）とメトリクススナップショット（5分間隔）のバックグラウンド処理 |

## 技術スタック

Next.js 16（App Router）/ React 19 / TypeScript / Tailwind CSS 4 / PostgreSQL 16 + Prisma 7 / Auth.js v5 / Anthropic API / X API v2
