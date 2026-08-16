# X AUTO デザインシステム

画面数が18あるため、見た目の判断を各画面でやると必ずばらつく。
このドキュメントを唯一の基準とし、画面側は**ここで決めた語彙だけ**を使う。

## 1. 原則

1. **色数を増やさない。** 高級感は色の多さではなく、余白・階層・質感で出す。
   アクセントは `brand` 1色。意味色は要件定義 §9 の区分にだけ使う。
2. **区分は色だけに頼らない。** DATA / AI推定 / ACTION は必ずラベル文字を伴う。
3. **情報の順序は「数字 → 解説 → 次の行動」**（要件定義 §8.1）。
   分析系の画面には必ず次の行動への導線を置く。
4. **密度を保つ。** 業務ツールなので、余白のために情報を削らない。
   1画面で判断できることを増やす方向で整える。

## 2. ロゴ・アイコン

| ファイル | 用途 |
|---|---|
| `public/assets/logo-lockup.svg` | 横組みロゴ。サイドバー・ログイン画面 |
| `public/assets/app-icon.svg` | 正方形アイコンの原本 |
| `public/assets/app-icon-maskable.svg` | Android のアダプティブアイコン用（Xマークのみ） |
| `app/icon.png` / `app/apple-icon.png` | favicon / iOS ホーム画面アイコン |
| `public/assets/icon-192.png` / `icon-512.png` / `icon-maskable-512.png` | PWA マニフェスト用 |

- ロゴはシルバーのグラデーションを含むため、**暗い背景に置く**。
  明るい面に置くときは `bg-ink-950` の下地を敷く（モバイルのトップバーがこの扱い）
- 彩色はAの抜きとOの光の2点だけ。ロゴ内に他の色を足さない
- PNG は SVG から生成している。ロゴを変更したら SVG を直してから
  PNG を作り直すこと（`app-icon.svg` → 各サイズへ書き出し）

## 3. 色

| 用途 | トークン |
|---|---|
| 背景 | `bg-ink-50` (ページ) / `bg-white` (カード) / `bg-ink-25` (沈めた面) |
| 本文 | `text-ink-800` / 見出し `text-ink-900` / 補足 `text-ink-500` / 弱い補足 `text-ink-400` |
| 罫線 | `border-ink-200/70` (カード) / `border-ink-100` (カード内の区切り) |
| アクセント | `brand-50` 〜 `brand-950`。主要CTA・アクティブ状態・強調数値 |
| DATA (実測) | `ink` 系 + `Tag tone="data"` |
| HYPOTHESIS (AI推定) | `violet` 系 + `Tag tone="hypothesis"` |
| ACTION (次の行動) | `emerald` 系 + `Tag tone="action"` |
| 注意 | `amber` 系 / 危険・失敗 | `rose` 系 |

`brand` を「重要そうだから」という理由で使わない。**押せるもの・現在地・主要指標**に限る。

## 4. 影・角丸

- カード: `rounded-card shadow-card`（`components/ui.tsx` の `Card` を使う）
- 小要素: `rounded-lg` + `shadow-xs`
- 押し上げ: `shadow-md` / `shadow-lg`。多層シャドウなので単層の `shadow` は使わない

## 5. タイポグラフィ

| 役割 | クラス |
|---|---|
| ページ見出し | `PageHeader` に任せる（`text-[26px] font-bold`） |
| カード見出し | `text-[13px] font-semibold text-ink-900`（`CardHeader` 推奨） |
| セクション小見出し | `text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500` |
| 本文 | `text-[13px] leading-relaxed` |
| 補足 | `text-xs text-ink-500` |
| 数値 | `tabular-nums` を必ず付ける |

日本語が主なので `text-sm` より `text-[13px]` を基準にする。

## 6. 共通コンポーネント（`components/ui.tsx`）

| 名前 | 用途 |
|---|---|
| `PageHeader` | ページ見出し。`eyebrow` に機能群名、`action` に右上ボタン |
| `Card` / `CardHeader` | カードとその見出し。`interactive` でホバー時に浮く |
| `SectionHeading` | カード内の小見出し |
| `EmptyState` | 空状態。必ず「次に何をすればよいか」を書く。カード内は `size="sm"` |
| `StatTile` | 数値タイル。`accent` は1画面につき最大1つ |
| `DataNote` / `HypothesisNote` / `ActionNote` | §9 の3区分。`items` に配列を渡すと箇条書きになる |
| `Tag` | §9 の区分ラベル (`data` / `hypothesis` / `action` / `brand` / `neutral`) |
| `StatusBadge` | 状態バッジ (`ok` / `warn` / `danger` / `info` / `neutral`)。**§9 とは別物なので `Tag` と混ぜない** |
| `ScoreBadge` | 0〜100 のスコア (COMPETITOR / POSITIONING SCORE) |
| `OutlierBadge` | 外れ値スコア (F-14) |
| `Button` | 通常のボタン。クライアント状態で `loading` を制御する場合に使う |
| `LinkButton` | リンク型ボタン。`external` / `download` で素の `<a>` になる |
| `buttonClassName()` | ボタンの見た目だけが欲しいとき |
| `NextActionButton` | 「次にやること」への導線。矢印付き |
| `FilterChip` | 絞り込み・並び替えのチップ (リンク型) |
| `MeterBar` | 比率バー。`targetRatio` で目標の目盛りを重ねられる |
| `Spinner` | 処理中表示 |

フォームは `components/form.tsx` の `Field` / `TextArea` / `CheckboxField` /
`SubmitButton` / `FormError` / `FormSuccess` / `controlClassName` を使う。
`<select>` や `min`/`max` 付きの `<input>` を直接書くときは
`className={controlClassName}` を付ける。

### 使い分けの注意

- **`Tag` と `StatusBadge` を混同しない。** `Tag` は要件定義 §9 の
  DATA / AI推定 / ACTION 専用。「連携済み」「期限切れ」のような状態は
  `StatusBadge`
- **`Button` と `SubmitButton`。** フォーム送信は `SubmitButton`
  (`useFormStatus` が pending を自動で拾う)。それ以外は `Button`

## 7. レイアウト

- ページ全体の左右余白と最大幅は `app/(app)/layout.tsx` が持つ。画面側で `max-w-*` を足さない
- 2カラムは `grid gap-6 lg:grid-cols-2 items-start`。
  **`items-start` を忘れると背の低いカードが引き伸ばされて間延びする**
- カード内の縦積みは `space-y-4`、密な一覧は `divide-y divide-ink-100`
- 表は `overflow-x-auto` で包み、`text-[13px]`、ヘッダは
  `text-[11px] font-medium text-ink-500`

## 8. 状態

- ローディング: `Spinner` を伴うテキスト（「生成中...」など何をしているか書く）
- 空: `EmptyState`
- エラー: `FormError`（フォーム内）/ `rose` 系のカード（画面全体）
- 無効: `opacity-50 cursor-not-allowed`

## 9. モーション

- `transition duration-200`（通常）/ `duration-300`（カードの浮き上がり）
- イージングは `ease-[cubic-bezier(0.22,1,0.36,1)]`
- 動かすのは `transform` と `opacity`、`box-shadow` まで。レイアウトを動かさない
- `prefers-reduced-motion` は `globals.css` で無効化済み

## 10. やらないこと

- 新しい色・影・角丸をページ側で発明しない（必要なら `ui.tsx` に足す）
- 絵文字をUIラベルに使わない（アイコンは `components/icons.tsx`）
- `shadow-sm` の付いた白カードを直接書かない（`Card` を使う）
- 情報を減らして「きれいにする」ことをしない
