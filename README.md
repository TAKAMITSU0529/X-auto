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

## ステータス

- [x] 要件定義（v2.0 確定）
- [ ] Phase 1（MVP）実装：認証・X OAuth・ベンチマークリサーチ・外れ値検出・AI分析・モデリング・3案生成・予約投稿・自己分析・APIコスト管理
- [ ] Phase 2：一括分析・予測スコア・カレンダー・IMPACT SCORE・学習ループ・週次レポート
- [ ] Phase 3：競合発見・マーケティング戦略AI・トレンド分析・ポジショニング・Knowledge Base
- [ ] Phase 4：AI CHAT・自動コンテンツプラン・SaaS化

## 技術スタック（予定）

Next.js + Tailwind CSS / PostgreSQL + Prisma / ジョブキュー（BullMQ 等）/ Anthropic API（Claude）/ X API v2（OAuth 2.0 PKCE・従量課金）

詳細は要件定義書 §5 参照。
