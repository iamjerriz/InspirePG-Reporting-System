import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Request, Response } from "express";
import adminRoutes from "./adminRoutes";
import { config } from "./config";
import { appendLogRow } from "./db";
import { AREAS, isValidArea, isValidSellerType } from "./sellerTypes";
import { deleteProofFile, handleProofUpload, uploadProofToStorage } from "./upload";
import { logFieldsSchema } from "./validation";

const app = express();
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use("/api/admin", adminRoutes);

app.post(
  "/api/log",
  handleProofUpload,
  async (req: Request, res: Response) => {
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

    if (!req.file) {
      res.status(400).json({
        success: false,
        message: "Proof of OOP Login image is required.",
      });
      return;
    }

    let proofFilename: string | null = null;
    try {
      proofFilename = await uploadProofToStorage(req.file);

      const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19);

      await appendLogRow({
        timestamp,
        firstName,
        lastName,
        sid,
        area,
        sellerType,
        proofFilename,
      });

      res.json({ success: true, message: "Logger entry successfully saved." });
    } catch (err) {
      console.error("Failed to save logger entry:", err);
      if (proofFilename) {
        deleteProofFile(proofFilename);
      }
      res.status(500).json({
        success: false,
        message: "Unable to save the record. Please try again.",
      });
    }
  }
);

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", areas: AREAS });
});

app.listen(config.port, () => {
  console.log(`Logger backend listening on http://localhost:${config.port}`);
});
