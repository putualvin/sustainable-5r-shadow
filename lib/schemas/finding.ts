import { z } from "zod";

export const findingSchema = z.object({
  auditId: z.string().min(1),
  guidingQuestionId: z.string().min(1, "Pilih sub-kategori temuan"),
  locationDetail: z.string().max(200).optional(),
  description: z
    .string()
    .min(3, "Deskripsi temuan minimal 3 karakter")
    .max(1000, "Deskripsi terlalu panjang"),
  // Auditor assigns the category (§5.1) — NOT the closing status.
  kategori: z.enum(["LOW", "HIGH"], { message: "Pilih kategori Low/High" }),
  isRecurring: z.boolean().optional(),
});

export type FindingInput = z.infer<typeof findingSchema>;
