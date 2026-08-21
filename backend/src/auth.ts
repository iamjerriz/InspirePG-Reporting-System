import crypto from "crypto";
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "./config";

export const ADMIN_COOKIE_NAME = "logger_admin_session";

interface AdminTokenPayload {
  role: "admin";
}

function timingSafeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) {
    // Still run a comparison of equal length so failure timing doesn't leak length.
    crypto.timingSafeEqual(bufferA, bufferA);
    return false;
  }
  return crypto.timingSafeEqual(bufferA, bufferB);
}

export function verifyAdminCredentials(username: string, password: string): boolean {
  return (
    timingSafeEqual(username, config.adminUsername) &&
    timingSafeEqual(password, config.adminPassword)
  );
}

export function signAdminToken(): string {
  const payload: AdminTokenPayload = { role: "admin" };
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: `${config.sessionTtlHours}h`,
  });
}

export function getCookieMaxAgeMs(): number {
  return config.sessionTtlHours * 60 * 60 * 1000;
}

export function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.[ADMIN_COOKIE_NAME];
  if (!token) {
    res.status(401).json({ success: false, message: "Not authenticated." });
    return;
  }

  try {
    jwt.verify(token, config.jwtSecret);
    next();
  } catch {
    res.status(401).json({ success: false, message: "Session expired. Please log in again." });
  }
}

export function isAdminAuthenticated(req: Request): boolean {
  const token = req.cookies?.[ADMIN_COOKIE_NAME];
  if (!token) return false;
  try {
    jwt.verify(token, config.jwtSecret);
    return true;
  } catch {
    return false;
  }
}

// Basic in-memory brute-force protection for the login endpoint. Not shared
// across processes/instances, but enough to slow down naive password guessing
// against a single internal-tool deployment.
const MAX_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
const attemptsByIp = new Map<string, { count: number; firstAttemptAt: number }>();

export function isRateLimited(ip: string): boolean {
  const entry = attemptsByIp.get(ip);
  if (!entry) return false;
  if (Date.now() - entry.firstAttemptAt > LOCKOUT_WINDOW_MS) {
    attemptsByIp.delete(ip);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

export function recordFailedAttempt(ip: string): void {
  const entry = attemptsByIp.get(ip);
  if (!entry || Date.now() - entry.firstAttemptAt > LOCKOUT_WINDOW_MS) {
    attemptsByIp.set(ip, { count: 1, firstAttemptAt: Date.now() });
    return;
  }
  entry.count += 1;
}

export function clearFailedAttempts(ip: string): void {
  attemptsByIp.delete(ip);
}
