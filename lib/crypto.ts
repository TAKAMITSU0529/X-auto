import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";
import { env } from "@/lib/env";

/**
 * X の OAuth トークンを DB に保存するための暗号化 (要件定義 §4 セキュリティ)。
 * AES-256-GCM。鍵は TOKEN_ENCRYPTION_KEY (base64 32バイト)。
 *
 * 保存形式: base64(iv) . base64(authTag) . base64(ciphertext)
 */

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey(): Buffer {
  if (!env.TOKEN_ENCRYPTION_KEY) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY が設定されていません。openssl rand -base64 32 で生成して .env に設定してください。",
    );
  }
  const key = Buffer.from(env.TOKEN_ENCRYPTION_KEY, "base64");
  if (key.length !== 32) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY は base64 エンコードした32バイトの鍵である必要があります。",
    );
  }
  return key;
}

export function encryptToken(plain: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString("base64"),
    tag.toString("base64"),
    encrypted.toString("base64"),
  ].join(".");
}

export function decryptToken(stored: string): string {
  const [ivB64, tagB64, dataB64] = stored.split(".");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("暗号化トークンの形式が不正です。");
  }
  const decipher = createDecipheriv(
    ALGO,
    getKey(),
    Buffer.from(ivB64, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
