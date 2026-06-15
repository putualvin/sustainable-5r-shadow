import { z } from "zod";

export const findingSchema = z.object({
  auditId: z.string().min(1),
  guidingQuestionId: z.string().min(1, "Pilih sub-kategori temuan"),
  locationDetail: z.string().max(200).optional(),
  description: z
    .string()
    .min(3, "Deskripsi temuan minimal 3 karakter")
    .max(1000, "Deskripsi terlalu panjang"),
});

export type FindingInput = z.infer<typeof findingSchema>;
