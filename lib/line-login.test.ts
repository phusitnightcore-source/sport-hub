import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  lineLoginConfigured,
  lineRedirectUri,
  buildLineAuthorizeUrl,
  syntheticLineEmail,
} from "./line-login";

const ORIG = { ...process.env };

beforeEach(() => {
  process.env.LINE_LOGIN_CHANNEL_ID = "";
  process.env.LINE_LOGIN_CHANNEL_SECRET = "";
  process.env.NEXT_PUBLIC_APP_URL = "";
});
afterEach(() => {
  process.env = { ...ORIG };
});

describe("lineLoginConfigured", () => {
  it("false เมื่อไม่มี id/secret", () => {
    expect(lineLoginConfigured()).toBe(false);
  });
  it("false เมื่อมีแค่ id", () => {
    process.env.LINE_LOGIN_CHANNEL_ID = "123";
    expect(lineLoginConfigured()).toBe(false);
  });
  it("true เมื่อมีครบ", () => {
    process.env.LINE_LOGIN_CHANNEL_ID = "123";
    process.env.LINE_LOGIN_CHANNEL_SECRET = "abc";
    expect(lineLoginConfigured()).toBe(true);
  });
});

describe("lineRedirectUri", () => {
  it("ใช้ APP_URL + path callback (ตัด / ท้าย)", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://ex.com/";
    expect(lineRedirectUri()).toBe("https://ex.com/api/auth/line/callback");
  });
  it("fallback localhost เมื่อไม่ตั้ง APP_URL", () => {
    expect(lineRedirectUri()).toBe("http://localhost:3000/api/auth/line/callback");
  });
});

describe("buildLineAuthorizeUrl", () => {
  it("มี client_id, state, redirect_uri และ scope openid profile (ไม่ขอ email โดย default)", () => {
    process.env.LINE_LOGIN_CHANNEL_ID = "cid123";
    process.env.NEXT_PUBLIC_APP_URL = "https://ex.com";
    const url = buildLineAuthorizeUrl("st-42");
    expect(url).toContain("https://access.line.me/oauth2/v2.1/authorize");
    expect(url).toContain("client_id=cid123");
    expect(url).toContain("state=st-42");
    expect(url).toContain("scope=openid+profile");
    expect(url).not.toContain("email");
    expect(url).toContain(encodeURIComponent("https://ex.com/api/auth/line/callback"));
  });
  it("ขอ scope email เมื่อ LINE_LOGIN_SCOPE_EMAIL=true", () => {
    process.env.LINE_LOGIN_CHANNEL_ID = "cid";
    process.env.LINE_LOGIN_SCOPE_EMAIL = "true";
    expect(buildLineAuthorizeUrl("s")).toContain("scope=openid+profile+email");
  });
});

describe("syntheticLineEmail", () => {
  it("สร้างอีเมลสังเคราะห์จาก LINE userId", () => {
    expect(syntheticLineEmail("U123")).toBe("line_U123@line.sporthub.local");
  });
});
