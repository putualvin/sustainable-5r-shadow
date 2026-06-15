"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const STATUS_COLORS = ["#2E7D32", "#1976D2", "#D32F2F"]; // Done, Progress, No Progress

export function CapaPie({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0)
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Belum ada data CAPA.
      </p>
    );
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ScoreTrend({
  data,
}: {
  data: { period: string; score: number }[];
}) {
  if (data.length === 0)
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Belum ada riwayat skor.
      </p>
    );
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 12, right: 16, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="period" tick={{ fontSize: 11, fill: "#475569" }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#475569" }} />
        <Tooltip formatter={(v) => `${v}%`} />
        <Line
          type="monotone"
          dataKey="score"
          stroke="#C8102E"
          strokeWidth={2.5}
          dot={{ r: 4, fill: "#C8102E" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
