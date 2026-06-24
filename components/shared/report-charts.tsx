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
  PieChart,
  Pie,
  Legend,
  LabelList,
} from "recharts";

const PILLAR_COLORS = ["#C8102E", "#1976D2", "#2E7D32", "#ED6C02", "#7E57C2"];

// Horizontal bar of finding counts per 5R pillar.
export function CategoryBar({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0)
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Belum ada temuan pada periode ini.
      </p>
    );
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 44)}>
      <BarChart layout="vertical" data={data} margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#475569" }} />
        <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 12, fill: "#475569" }} />
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

// Pie of findings per 5R pillar (Level R) — dashboard #2.
export function PillarPie({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0)
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Belum ada temuan pada periode ini.
      </p>
    );
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" outerRadius={88} paddingAngle={1}>
          {data.map((_, i) => (
            <Cell key={i} fill={PILLAR_COLORS[i % PILLAR_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v) => {
            const n = Number(v);
            return [`${n} temuan (${total ? Math.round((n / total) * 100) : 0}%)`, "Jumlah"];
          }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

// Vertical bar of final score per area — dashboard #4.
export function AreaScoreBar({ data }: { data: { name: string; score: number }[] }) {
  if (data.length === 0)
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">Belum ada data skor.</p>
    );
  const min = Math.min(...data.map((d) => d.score));
  const domainMin = Math.max(0, Math.floor(min) - 2);
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 20, right: 8, left: -16, bottom: 56 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="name" interval={0} angle={-35} textAnchor="end" height={60} tick={{ fontSize: 9, fill: "#475569" }} />
        <YAxis domain={[domainMin, 100]} tick={{ fontSize: 10, fill: "#475569" }} />
        <Tooltip formatter={(v) => [`${v}%`, "Score Akhir"]} />
        <Bar dataKey="score" fill="#8BC972" radius={[3, 3, 0, 0]}>
          <LabelList dataKey="score" position="top" formatter={(v) => String(v)} style={{ fontSize: 10, fill: "#334155" }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
