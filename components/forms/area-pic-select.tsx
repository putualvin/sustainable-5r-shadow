"use client";

import { useRef } from "react";

import { setAreaPic } from "@/lib/actions/admin";

type Pic = { id: string; name: string };

const selectClass =
  "h-9 w-full min-w-[180px] max-w-[230px] rounded-md border border-input bg-background px-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function AreaPicSelect({
  areaId,
  currentPicId,
  pics,
  blockedUserId,
}: {
  areaId: string;
  currentPicId: string | null;
  pics: Pic[];
  blockedUserId?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const options = pics.filter(
    (pic) => pic.id !== blockedUserId || pic.id === currentPicId
  );

  return (
    <form ref={formRef} action={setAreaPic}>
      <input type="hidden" name="areaId" value={areaId} />
      <select
        name="picId"
        defaultValue={currentPicId ?? ""}
        className={selectClass}
        onChange={() => formRef.current?.requestSubmit()}
        aria-label="Ubah PIC area"
      >
        <option value="">Belum ditetapkan</option>
        {options.map((pic) => (
          <option key={pic.id} value={pic.id}>
            {pic.name}
          </option>
        ))}
      </select>
    </form>
  );
}
