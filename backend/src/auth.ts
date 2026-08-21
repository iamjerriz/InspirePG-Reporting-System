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
