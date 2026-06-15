import "server-only";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const ALLOWED = ["jpg", "jpeg", "png", "webp", "heic", "gif"];

// Save an uploaded image to public/uploads and return its public path.
// Shadow build only — production would use object storage.
export async function savePhoto(file: File): Promise<string | null> {
  if (!file || file.size === 0 || !file.type.startsWith("image/")) return null;

  const rawExt = (file.name.split(".").pop() ?? "jpg").toLowerCase();
  const ext = ALLOWED.includes(rawExt) ? rawExt : "jpg";
  const filename = `${randomUUID()}.${ext}`;

  await mkdir(UPLOAD_DIR, { recursive: true });
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, filename), bytes);

  return `/uploads/${filename}`;
}
