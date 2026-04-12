import { describe, expect, it, vi } from "vitest";
import { COOKIE_NAME } from "../shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import type { Request } from "express";

describe("OAuth Session Cookie Configuration", () => {
  describe("getSessionCookieOptions", () => {
    it("should set secure=true for HTTPS requests", () => {
      const req = {
        protocol: "https",
        hostname: "example.com",
        headers: {},
      } as unknown as Request;

      const options = getSessionCookieOptions(req);

      expect(options.secure).toBe(true);
      expect(options.sameSite).toBe("lax");
      expect(options.httpOnly).toBe(true);
      expect(options.path).toBe("/");
    });

    it("should set secure=true when x-forwarded-proto is https", () => {
      const req = {
        protocol: "http",
        hostname: "example.com",
        headers: {
          "x-forwarded-proto": "https",
        },
      } as unknown as Request;

      const options = getSessionCookieOptions(req);

      expect(options.secure).toBe(true);
      expect(options.sameSite).toBe("lax");
    });

    it("should set secure=true for localhost development", () => {
      const req = {
        protocol: "http",
        hostname: "localhost",
        headers: {},
      } as unknown as Request;

      const options = getSessionCookieOptions(req);

      expect(options.secure).toBe(true);
      expect(options.sameSite).toBe("lax");
    });

    it("should set secure=true for 127.0.0.1 development", () => {
      const req = {
        protocol: "http",
        hostname: "127.0.0.1",
        headers: {},
      } as unknown as Request;

      const options = getSessionCookieOptions(req);

      expect(options.secure).toBe(true);
      expect(options.sameSite).toBe("lax");
    });

    it("should handle x-forwarded-proto as comma-separated list", () => {
      const req = {
        protocol: "http",
        hostname: "example.com",
        headers: {
          "x-forwarded-proto": "http, https",
        },
      } as unknown as Request;

      const options = getSessionCookieOptions(req);

      expect(options.secure).toBe(true);
    });

    it("should use sameSite=lax for better compatibility", () => {
      const req = {
        protocol: "https",
        hostname: "example.com",
        headers: {},
      } as unknown as Request;

      const options = getSessionCookieOptions(req);

      // sameSite=lax allows same-site requests and top-level navigation
      // This is more compatible than sameSite=none which requires Secure=true
      expect(options.sameSite).toBe("lax");
    });

    it("should set httpOnly=true to prevent XSS attacks", () => {
      const req = {
        protocol: "https",
        hostname: "example.com",
        headers: {},
      } as unknown as Request;

      const options = getSessionCookieOptions(req);

      expect(options.httpOnly).toBe(true);
    });

    it("should set path=/ for app-wide cookie availability", () => {
      const req = {
        protocol: "https",
        hostname: "example.com",
        headers: {},
      } as unknown as Request;

      const options = getSessionCookieOptions(req);

      expect(options.path).toBe("/");
    });

    it("should set secure=false only for non-HTTPS, non-localhost requests", () => {
      const req = {
        protocol: "http",
        hostname: "example.com",
        headers: {},
      } as unknown as Request;

      const options = getSessionCookieOptions(req);

      // This should be false because it's not HTTPS, not localhost, and no forwarded proto
      expect(options.secure).toBe(false);
      expect(options.sameSite).toBe("lax");
    });
  });
});
