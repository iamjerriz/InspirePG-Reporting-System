import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const usingDefaultAdminPassword = !process.env.ADMIN_PASSWORD;
const usingDefaultJwtSecret = !process.env.JWT_SECRET;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `[logger-backend] Missing required env var ${name}. Copy backend/.env.example to backend/.env and fill in your Supabase project's values.`
    );
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT) || 3001,
  maxFileSizeMb: Number(process.env.MAX_FILE_SIZE_MB) || 5,
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",

  supabaseUrl: requireEnv("SUPABASE_URL"),
  supabaseServiceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  supabaseStorageBucket: process.env.SUPABASE_STORAGE_BUCKET || "proofs",

  adminUsername: process.env.ADMIN_USERNAME || "admin",
  adminPassword: process.env.ADMIN_PASSWORD || "admin123",
  usingDefaultAdminPassword,
  // Falls back to a random secret so the app still runs with zero config in
  // dev, but that means sessions won't survive a server restart. Set
  // JWT_SECRET explicitly in production.
  jwtSecret: process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex"),
  usingDefaultJwtSecret,
  sessionTtlHours: Number(process.env.SESSION_TTL_HOURS) || 8,
};

if (usingDefaultAdminPassword) {
  console.warn(
    "[logger-backend] WARNING: ADMIN_PASSWORD is not set - using the default admin/admin123 credentials. Set ADMIN_USERNAME/ADMIN_PASSWORD in .env before deploying."
  );
}
if (usingDefaultJwtSecret) {
  console.warn(
    "[logger-backend] WARNING: JWT_SECRET is not set - using a randomly generated secret for this process only. Admin sessions will be invalidated on every restart. Set JWT_SECRET in .env for production."
  );
}
