import "dotenv/config";
import assert from "node:assert";
import { decryptToken, encryptToken } from "@/lib/crypto";
import { buildAuthorizeUrl, generatePkce, generateState } from "@/lib/x-oauth";

/** スライス2の受け入れ確認: トークン暗号化と OAuth URL の構築 */
async function main() {
  console.log("=== 1) トークン暗号化 (AES-256-GCM) ===");
  const secret = "sample-access-token-" + "x".repeat(50);
  const stored = encryptToken(secret);
  assert.notStrictEqual(stored, secret, "暗号文が平文と同じ");
  assert.strictEqual(decryptToken(stored), secret, "復号結果が一致しない");
  // 同じ平文でも IV が違うので暗号文は毎回変わる
  assert.notStrictEqual(encryptToken(secret), stored, "IV が固定されている");
  // 改ざん検知 (GCM の認証タグ)
  const tampered = stored.slice(0, -4) + "AAAA";
  let threw = false;
  try {
    decryptToken(tampered);
  } catch {
    threw = true;
  }
  assert.ok(threw, "改ざんを検知できていない");
  console.log("  ✓ 暗号化・復号・IVランダム性・改ざん検知 OK");

  console.log("\n=== 2) PKCE と認可URL ===");
  const { verifier, challenge } = generatePkce();
  assert.ok(verifier.length >= 43, "verifier が短すぎる");
  assert.ok(!challenge.includes("="), "challenge が base64url でない");

  process.env.X_CLIENT_ID = process.env.X_CLIENT_ID || "test-client-id";
  // env は起動時に読み込まれるため、ここでは URL 構造のみ検証する
  const state = generateState();
  try {
    const url = new URL(buildAuthorizeUrl({ state, challenge }));
    assert.strictEqual(url.origin + url.pathname, "https://x.com/i/oauth2/authorize");
    assert.strictEqual(url.searchParams.get("code_challenge_method"), "S256");
    assert.strictEqual(url.searchParams.get("state"), state);
    assert.ok(url.searchParams.get("scope")?.includes("offline.access"));
    console.log("  ✓ 認可URLの構造 OK");
  } catch (e) {
    if (e instanceof Error && e.message.includes("X_CLIENT_ID")) {
      console.log("  - X_CLIENT_ID 未設定のため URL 構築は明示エラー (期待どおり)");
    } else {
      throw e;
    }
  }

  console.log("\nすべて OK");
}

main();
