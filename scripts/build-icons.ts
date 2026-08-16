import { readFileSync, mkdirSync } from "node:fs";
import { chromium } from "playwright";

/**
 * ブランドアイコンの書き出し。
 *
 * 原本は public/assets/*.svg。PNG はここから生成する。
 * ロゴを変更したら SVG を直してから `npx tsx scripts/build-icons.ts` を実行する
 * (手作業でPNGを差し替えるとSVGとズレるため)。
 *
 * playwright は常用しない書き出し専用の依存なので package.json には入れず、
 * 必要なときだけ入れて実行する:
 *   npm i -D playwright && npx playwright install chromium
 *   npx tsx scripts/build-icons.ts
 *
 * この依存の都合で型チェックの対象外にしている (tsconfig.json の exclude)。
 */

const ROOT = new URL("..", import.meta.url).pathname;

type Target = {
  svg: string;
  size: number;
  out: string;
};

const TARGETS: Target[] = [
  // favicon (Next.js の app/icon.png 規約)
  { svg: "public/assets/app-icon.svg", size: 64, out: "app/icon.png" },
  // iOS のホーム画面アイコン (Next.js の app/apple-icon.png 規約)
  { svg: "public/assets/app-icon.svg", size: 180, out: "app/apple-icon.png" },
  // PWA マニフェスト用
  {
    svg: "public/assets/app-icon.svg",
    size: 192,
    out: "public/assets/icon-192.png",
  },
  {
    svg: "public/assets/app-icon.svg",
    size: 512,
    out: "public/assets/icon-512.png",
  },
  // Android のアダプティブアイコン (切り抜かれるため中央の安全領域のみ)
  {
    svg: "public/assets/app-icon-maskable.svg",
    size: 512,
    out: "public/assets/icon-maskable-512.png",
  },
];

async function main() {
  const browser = await chromium.launch();

  for (const target of TARGETS) {
    const svg = readFileSync(`${ROOT}${target.svg}`, "utf8");
    const sized = svg.replace(
      "<svg ",
      `<svg width="${target.size}" height="${target.size}" `,
    );

    const page = await browser.newPage({
      viewport: { width: target.size, height: target.size },
      deviceScaleFactor: 1,
    });
    await page.setContent(
      `<!doctype html><html><body style="margin:0;width:${target.size}px;height:${target.size}px;overflow:hidden">${sized}</body></html>`,
    );
    // グラデーションとフィルタの描画完了を待つ
    await page.waitForTimeout(250);

    mkdirSync(`${ROOT}${target.out}`.replace(/\/[^/]+$/, ""), {
      recursive: true,
    });
    await page.screenshot({ path: `${ROOT}${target.out}` });
    await page.close();

    console.log(`  ✓ ${target.out} (${target.size}x${target.size})`);
  }

  await browser.close();
  console.log("\nアイコンを書き出しました。");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
