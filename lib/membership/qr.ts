import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

const PREFIX = "sport-hub:member:v1";
const TOKEN_TTL_SECONDS = 45;

function signingSecret(): string {
  const secret = process.env.MEMBER_QR_SECRET || process.env.CRON_SECRET;
  if (!secret) throw new Error("MEMBER_QR_SECRET_OR_CRON_SECRET_MISSING");
  return secret;
}

function signature(memberId: string, expiresAt: number): string {
  return createHmac("sha256", signingSecret())
    .update(`${memberId}.${expiresAt}`)
    .digest("base64url");
}

export function createMemberQrToken(memberId: string): {
  token: string;
  expiresAt: number;
} {
  const expiresAt = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  return {
    token: `${PREFIX}:${memberId}:${expiresAt}:${signature(memberId, expiresAt)}`,
    expiresAt,
  };
}

export function verifyMemberQrToken(token: string):
  | { valid: true; memberId: string }
  | { valid: false; reason: "format" | "expired" | "signature" } {
  const parts = token.split(":");
  if (parts.length !== 6 || parts.slice(0, 3).join(":") !== PREFIX) {
    return { valid: false, reason: "format" };
  }

  const memberId = parts[3];
  const expiresAt = Number(parts[4]);
  const supplied = parts[5];
  if (!memberId || !Number.isInteger(expiresAt) || !supplied) {
    return { valid: false, reason: "format" };
  }
  if (expiresAt < Math.floor(Date.now() / 1000)) {
    return { valid: false, reason: "expired" };
  }

  const expected = signature(memberId, expiresAt);
  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  if (
    expectedBuffer.length !== suppliedBuffer.length ||
    !timingSafeEqual(expectedBuffer, suppliedBuffer)
  ) {
    return { valid: false, reason: "signature" };
  }
  return { valid: true, memberId };
}
