import { z } from "zod";

export const redTagSchema = z.object({
  areaId: z.string().min(1, "Pilih area"),
  name: z.string().min(2, "Nama barang wajib diisi").max(200),
  category: z.string().min(1, "Pilih kategori"),
  reason: z.string().min(3, "Alasan minimal 3 karakter").max(500),
  location: z.enum(["IN_AREA", "RT_AREA"]),
});

export type RedTagInput = z.infer<typeof redTagSchema>;

export const redTagDecisionSchema = z.object({
  id: z.string().min(1),
  decision: z.enum(["INTERNAL", "EXTERNAL", "DISPOSED"]),
});
