import { z } from "zod";

export const logFieldsSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required."),
  lastName: z.string().trim().min(1, "Last name is required."),
  sid: z.string().trim().min(1, "SID is required."),
  area: z.string().trim().min(1, "Area is required."),
  sellerType: z.string().trim().min(1, "Seller type is required."),
});
