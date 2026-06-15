import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email wajib diisi")
    .email("Format email tidak valid"),
  // Mock auth: any password is accepted, but keep the field for realism.
  password: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
