import { z } from "zod";

export const capaSchema = z.object({
  findingId: z.string().min(1),
  rootCause: z.string().min(3, "Akar masalah minimal 3 karakter").max(1000),
  correctiveAction: z
    .string()
    .min(3, "Tindakan korektif minimal 3 karakter")
    .max(1000),
  preventiveAction: z
    .string()
    .min(3, "Tindakan preventif minimal 3 karakter")
    .max(1000),
  status: z.enum(["DONE", "PROGRESS", "NO_PROGRESS"]),
  dueDate: z.string().optional(),
});

export type CapaInput = z.infer<typeof capaSchema>;
