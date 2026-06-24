import { z } from "zod";

// Auditee fills the CAPA plan only. The closing status is NOT here — it is set
// separately by Komite Unit during verification (see verifyCapa).
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
  woScPoNumber: z.string().max(60).optional(),
  dueDate: z.string().optional(),
});

export type CapaInput = z.infer<typeof capaSchema>;

// Komite Unit verification: just the closing status.
export const verifyCapaSchema = z.object({
  findingId: z.string().min(1),
  status: z.enum(["DONE", "PROGRESS", "NO_PROGRESS"]),
});
