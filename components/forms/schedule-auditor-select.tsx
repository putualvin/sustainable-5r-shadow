"use client";

import { useRef } from "react";

import { setScheduleAuditor } from "@/lib/actions/schedule";

type Auditor = { id: string; name: string; areaId: string | null };

const selectClass =
  "h-9 w-full max-w-[200px] rounded-md border border-input bg-background px-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

// Inline auditor assignment for one schedule row. Excludes the area's own PIC
// (no self-audit); changing the value submits the server action.
export function ScheduleAuditorSelect({
  scheduleId,
  areaId,
  currentAuditorId,
  auditors,
}: {
  scheduleId: string;
  areaId: string;
  currentAuditorId: string;
  auditors: Auditor[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const options = auditors.filter((a) => a.areaId !== areaId);

  return (
    <form ref={formRef} action={setScheduleAuditor}>
      <input type="hidden" name="scheduleId" value={scheduleId} />
      <select
        name="auditorId"
        defaultValue={currentAuditorId}
        className={selectClass}
        onChange={() => formRef.current?.requestSubmit()}
        aria-label="Ubah auditor"
      >
        {options.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>
    </form>
  );
}
