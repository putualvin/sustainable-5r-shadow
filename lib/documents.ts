import type { DocCategory } from "@prisma/client";

// Bahasa Indonesia labels for document categories (UI). Order = display order.
export const DOC_CATEGORIES: { key: DocCategory; label: string }[] = [
  { key: "PANDUAN", label: "Panduan" },
  { key: "SOP", label: "SOP" },
  { key: "STANDARD", label: "Standar Area" },
  { key: "TEMPLATE", label: "Template" },
  { key: "FORMULIR", label: "Formulir" },
];

export const DOC_CATEGORY_LABEL: Record<DocCategory, string> = {
  PANDUAN: "Panduan",
  SOP: "SOP",
  STANDARD: "Standar Area",
  TEMPLATE: "Template",
  FORMULIR: "Formulir",
};
