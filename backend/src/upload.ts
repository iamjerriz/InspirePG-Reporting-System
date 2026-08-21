import crypto from "crypto";
import { NextFunction, Request, Response } from "express";
import multer from "multer";
import { config } from "./config";
import { supabase } from "./supabaseClient";

// Only these types are accepted. The extension used on disk is derived from
// the detected mime type, never from the client-supplied filename.
const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export class InvalidFileTypeError extends Error {
  constructor() {
    super("INVALID_FILE_TYPE");
  }
}

// Matches exactly the filenames generated below - used to validate filenames
// requested back out (e.g. by the admin proof viewer) so nothing outside the
// expected pattern can ever be requested from storage.
export const PROOF_FILENAME_PATTERN = /^proof_\d+_[0-9a-f]{12}\.(jpg|png|webp)$/;

// Files are buffered in memory (not written to local disk) and handed
// straight to Supabase Storage - see uploadProofToStorage below.
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: config.maxFileSizeMb * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES[file.mimetype]) {
      cb(new InvalidFileTypeError());
      return;
    }
    cb(null, true);
  },
});

// Shared multer error handling for any route that accepts a single "proof"
// file upload, so the same 400 messages show up whether it's the public
// submit form or the admin edit form.
export function handleProofUpload(req: Request, res: Response, next: NextFunction): void {
  upload.single("proof")(req, res, (err: unknown) => {
    if (!err) {
      next();
      return;
    }

    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({
        success: false,
        message: `Image must be ${config.maxFileSizeMb}MB or smaller.`,
      });
      return;
    }

    if (err instanceof InvalidFileTypeError) {
      res.status(400).json({
        success: false,
        message: "Only JPG, PNG, or WEBP images are allowed.",
      });
      return;
    }

    res.status(400).json({
      success: false,
      message: "Unable to process the uploaded file.",
    });
  });
}

export async function uploadProofToStorage(file: Express.Multer.File): Promise<string> {
  const extension = ALLOWED_MIME_TYPES[file.mimetype] ?? "";
  const uniqueSuffix = `${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
  const filename = `proof_${uniqueSuffix}${extension}`;

  const { error } = await supabase.storage.from(config.supabaseStorageBucket).upload(filename, file.buffer, {
    contentType: file.mimetype,
    upsert: false,
  });

  if (error) {
    throw new Error(`Failed to upload proof image: ${error.message}`);
  }

  return filename;
}

export function deleteProofFile(filename: string): void {
  if (!filename) return;
  supabase.storage
    .from(config.supabaseStorageBucket)
    .remove([filename])
    .then(({ error }) => {
      if (error) {
        console.error(`Failed to delete proof file "${filename}" from storage:`, error.message);
      }
    });
}

export async function getProofSignedUrl(filename: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(config.supabaseStorageBucket)
    .createSignedUrl(filename, 60);

  if (error || !data) return null;
  return data.signedUrl;
}
