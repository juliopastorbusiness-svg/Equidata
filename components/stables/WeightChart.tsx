"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { WeightEntry } from "@/lib/horses";

type WeightChartProps = {
  entries: WeightEntry[];
};

export function WeightChart({ entries }: WeightChartProps) {
  const data = entries.map((entry) => ({
    id: entry.id,
    date: entry.date.toDate().toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
    }),
    weightKg: Number(entry.weightKg.toFixed(1)),
  }));

  return (
    <div className="h-72 w-full rounded-3xl border border-brand-border bg-white p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid stroke="#e7e1d9" strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} width={52} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="weightKg"
            stroke="#7d5a32"
            strokeWidth={3}
            dot={{ r: 4, fill: "#7d5a32" }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
