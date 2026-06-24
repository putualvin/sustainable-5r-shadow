import { z } from "zod";

export const DOC_CATEGORY_VALUES = [
  "PANDUAN",
  "SOP",
  "STANDARD",
  "TEMPLATE",
  "FORMULIR",
] as const;

export const documentSchema = z.object({
  title: z
    .string()
    .min(3, "Judul dokumen minimal 3 karakter")
    .max(160, "Judul terlalu panjang"),
  category: z.enum(DOC_CATEGORY_VALUES, {
    message: "Pilih kategori dokumen",
  }),
  version: z.string().max(20).optional(),
  // Either an external URL or an uploaded file; validated in the action.
  url: z
    .string()
    .url("URL tidak valid")
    .optional()
    .or(z.literal("")),
  description: z.string().max(500).optional(),
});

export type DocumentInput = z.infer<typeof documentSchema>;
