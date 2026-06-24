import "server-only";

// Serverless-safe uploads. The deploy filesystem is read-only, so we do NOT
// write to public/uploads. Photos are resized client-side (see PhotoInput) and
// arrive as a `data:image/...;base64,...` string; documents are converted to a
// data URL here. Both are stored as strings in the DB and rendered directly.

const MAX_PHOTO_CHARS = 6_000_000; // ~4.5 MB image (base64) — guard against bloat

// Validate & accept a client-provided image data URL (from PhotoInput).
export function photoDataUrl(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("data:image/")) return null;
  if (value.length > MAX_PHOTO_CHARS) return null;
  return value;
}

const DOC_ALLOWED = [
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "png", "jpg", "jpeg",
];
const MAX_DOC_BYTES = 4 * 1024 * 1024; // 4 MB

// Convert an uploaded document to a data URL (no filesystem). Returns null when
// missing, too large, or an unsupported type — prefer an external URL for big
// files (see the document form).
export async function saveDocumentFile(file: File): Promise<string | null> {
  if (!file || file.size === 0 || file.size > MAX_DOC_BYTES) return null;
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  if (!DOC_ALLOWED.includes(ext)) return null;
  const bytes = Buffer.from(await file.arrayBuffer());
  const mime = file.type || "application/octet-stream";
  return `data:${mime};base64,${bytes.toString("base64")}`;
}
