import { Request, Response, Router } from "express";
import { z } from "zod";
import {
  ADMIN_COOKIE_NAME,
  getCookieMaxAgeMs,
  isAdminAuthenticated,
  requireAdminAuth,
  signAdminToken,
  verifyAdminCredentials,
} from "./auth";
import { deleteLogRow, readAllLogRows, readLogRowById, updateLogRow } from "./db";
import { isValidArea, isValidSellerType } from "./sellerTypes";
import {
  deleteProofFile,
  getProofSignedUrl,
  handleProofUpload,
  PROOF_FILENAME_PATTERN,
  uploadProofToStorage,
} from "./upload";
import { logFieldsSchema } from "./validation";

const router = Router();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};

router.post("/login", (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: "Username and password are required." });
    return;
  }

  const { username, password } = parsed.data;
  if (!verifyAdminCredentials(username, password)) {
    res.status(401).json({ success: false, message: "Invalid username or password." });
    return;
  }

  const token = signAdminToken();
  res.cookie(ADMIN_COOKIE_NAME, token, {
    ...COOKIE_OPTIONS,
    maxAge: getCookieMaxAgeMs(),
  });
  res.json({ success: true, message: "Logged in." });
});

router.post("/logout", (_req, res) => {
  res.clearCookie(ADMIN_COOKIE_NAME, COOKIE_OPTIONS);
  res.json({ success: true, message: "Logged out." });
});

router.get("/session", (req, res) => {
  res.json({ authenticated: isAdminAuthenticated(req) });
});

router.get("/logs", requireAdminAuth, async (_req, res) => {
  try {
    const rows = await readAllLogRows();
    res.json({ success: true, rows });
  } catch (err) {
    console.error("Failed to read log entries:", err);
    res.status(500).json({ success: false, message: "Unable to read logger records." });
  }
});

router.get("/proof/:filename", requireAdminAuth, async (req, res) => {
  const { filename } = req.params;

  if (!PROOF_FILENAME_PATTERN.test(filename)) {
    res.status(400).json({ success: false, message: "Invalid filename." });
    return;
  }

  const signedUrl = await getProofSignedUrl(filename);
  if (!signedUrl) {
    res.status(404).json({ success: false, message: "Image not found." });
    return;
  }

  res.redirect(signedUrl);
});

function parseId(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  return Number(raw);
}

router.put(
  "/logs/:id",
  requireAdminAuth,
  handleProofUpload,
  async (req: Request, res: Response) => {
    const id = parseId(req.params.id);
    if (id === null) {
      res.status(400).json({ success: false, message: "Invalid record reference." });
      return;
    }

    const existing = await readLogRowById(id).catch(() => null);
    if (!existing) {
      res.status(404).json({ success: false, message: "Record not found." });
      return;
    }

    const parsed = logFieldsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: parsed.error.issues[0]?.message ?? "Invalid form data.",
      });
      return;
    }

    const { firstName, lastName, sid, area, sellerType } = parsed.data;

    if (!isValidArea(area)) {
      res.status(400).json({ success: false, message: "Invalid area selected." });
      return;
    }

    if (!isValidSellerType(area, sellerType)) {
      res.status(400).json({
        success: false,
        message: "Invalid seller type for the selected area.",
      });
      return;
    }

    let newProofFilename: string | null = null;
    try {
      if (req.file) {
        newProofFilename = await uploadProofToStorage(req.file);
      }
      const proofFilename = newProofFilename ?? existing.proofFilename;

      const updated = await updateLogRow(id, {
        timestamp: existing.timestamp,
        firstName,
        lastName,
        sid,
        area,
        sellerType,
        proofFilename,
      });

      if (!updated) {
        if (newProofFilename) deleteProofFile(newProofFilename);
        res.status(404).json({ success: false, message: "Record not found." });
        return;
      }

      // A new proof image replaced the old one - remove the now-orphaned file.
      if (newProofFilename && existing.proofFilename) {
        deleteProofFile(existing.proofFilename);
      }

      res.json({ success: true, message: "Record updated." });
    } catch (err) {
      console.error("Failed to update logger entry:", err);
      if (newProofFilename) deleteProofFile(newProofFilename);
      res.status(500).json({ success: false, message: "Unable to update the record. Please try again." });
    }
  }
);

router.delete("/logs/:id", requireAdminAuth, async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({ success: false, message: "Invalid record reference." });
    return;
  }

  try {
    const removed = await deleteLogRow(id);
    if (!removed) {
      res.status(404).json({ success: false, message: "Record not found." });
      return;
    }

    if (removed.proofFilename) {
      deleteProofFile(removed.proofFilename);
    }

    res.json({ success: true, message: "Record deleted." });
  } catch (err) {
    console.error("Failed to delete logger entry:", err);
    res.status(500).json({ success: false, message: "Unable to delete the record. Please try again." });
  }
});

export default router;
