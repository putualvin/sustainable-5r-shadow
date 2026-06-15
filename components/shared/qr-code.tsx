"use client";

import { QRCodeSVG } from "qrcode.react";

export function QrCode({ value, size = 128 }: { value: string; size?: number }) {
  return (
    <div className="inline-block rounded-md border bg-white p-2">
      <QRCodeSVG value={value} size={size} level="M" />
    </div>
  );
}
