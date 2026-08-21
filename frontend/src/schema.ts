import { z } from "zod";
import { AREAS, sellerTypesByArea } from "./config/sellerTypes";

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const loggerFormSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required."),
    lastName: z.string().trim().min(1, "Last name is required."),
    sid: z.string().trim().min(1, "SID is required."),
    area: z.enum(AREAS as [string, ...string[]], {
      errorMap: () => ({ message: "Please select an area." }),
    }),
    sellerType: z.string().min(1, "Please select a seller type."),
    proof: z
      .custom<FileList>((value) => value instanceof FileList)
      .refine((files) => files.length === 1, "Proof of OOP Login image is required.")
      .refine(
        (files) => files.length !== 1 || files[0].size <= MAX_FILE_SIZE_BYTES,
        "Image must be 5MB or smaller."
      )
      .refine(
        (files) => files.length !== 1 || ACCEPTED_IMAGE_TYPES.includes(files[0].type),
        "Only JPG, PNG, or WEBP images are allowed."
      ),
  })
  .superRefine((data, ctx) => {
    const validSellerTypes = sellerTypesByArea[data.area as keyof typeof sellerTypesByArea];
    if (validSellerTypes && !(validSellerTypes as readonly string[]).includes(data.sellerType)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please select a seller type valid for the chosen area.",
        path: ["sellerType"],
      });
    }
  });

export type LoggerFormValues = z.infer<typeof loggerFormSchema>;

// Same as loggerFormSchema, but the proof image is optional - editing a
// record doesn't require re-uploading proof if the existing one is kept.
export const editLogEntrySchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required."),
    lastName: z.string().trim().min(1, "Last name is required."),
    sid: z.string().trim().min(1, "SID is required."),
    area: z.enum(AREAS as [string, ...string[]], {
      errorMap: () => ({ message: "Please select an area." }),
    }),
    sellerType: z.string().min(1, "Please select a seller type."),
    proof: z
      .custom<FileList>((value) => value instanceof FileList)
      .refine(
        (files) => files.length === 0 || files[0].size <= MAX_FILE_SIZE_BYTES,
        "Image must be 5MB or smaller."
      )
      .refine(
        (files) => files.length === 0 || ACCEPTED_IMAGE_TYPES.includes(files[0].type),
        "Only JPG, PNG, or WEBP images are allowed."
      ),
  })
  .superRefine((data, ctx) => {
    const validSellerTypes = sellerTypesByArea[data.area as keyof typeof sellerTypesByArea];
    if (validSellerTypes && !(validSellerTypes as readonly string[]).includes(data.sellerType)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please select a seller type valid for the chosen area.",
        path: ["sellerType"],
      });
    }
  });

export type EditLogEntryValues = z.infer<typeof editLogEntrySchema>;
