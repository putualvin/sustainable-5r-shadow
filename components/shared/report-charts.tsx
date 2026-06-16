"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

// Horizontal bar of finding counts per 5R pillar (Module 6 report).
const PILLAR_COLORS = ["#C8102E", "#1976D2", "#2E7D32", "#ED6C02", "#7E57C2"];

export function CategoryBar({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0)
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Belum ada temuan pada periode ini.
      </p>
    );
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 44)}>
      <BarChart
        layout="vertical"
        data={data}
        margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#475569" }} />
        <YAxis
          type="category"
          dataKey="name"
          width={72}
          tick={{ fontSize: 12, fill: "#475569" }}
        />
        <Tooltip formatter={(v) => [`${v} temuan`, "Jumlah"]} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={PILLAR_COLORS[i % PILLAR_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
