import "server-only";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// Append a record to the audit log. User identity is captured from the current
// session and denormalized onto the row (see schema). Best-effort: logging must
// never break the action it accompanies, so failures are swallowed.
export async function logAction(entry: {
  action: string;
  entity: string;
  summary: string;
}): Promise<void> {
  try {
    const user = await getCurrentUser();
    await db.auditLog.create({
      data: {
        action: entry.action,
        entity: entry.entity,
        summary: entry.summary,
        userName: user?.name ?? "Sistem",
        userEmail: user?.email ?? "-",
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("logAction failed", err);
  }
}
