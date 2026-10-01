"use client";

import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency, fromPaise } from "@/lib/money";
import { monthLabel } from "@/lib/time";
import type { MemberDTO } from "@/types/domain";

const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

interface SeriesPoint {
  month: string;
  saved: number;
  spent: number;
  byUser: Record<string, number>;
}

function useFormatters(currency: string) {
  return {
    axis: (v: number) => formatCurrency(v * 100, { currency, compact: true }),
    tooltip: (v: unknown) => formatCurrency(Math.round(Number(v) * 100), { currency }),
  };
}

const tooltipStyle = {
  contentStyle: {
    borderRadius: 16,
    border: "1px solid var(--border)",
    background: "var(--popover)",
    color: "var(--popover-foreground)",
    fontSize: 12,
  },
  cursor: { fill: "var(--muted)", opacity: 0.5 },
};

export function SavedSpentChart({ series, currency }: { series: SeriesPoint[]; currency: string }) {
  const f = useFormatters(currency);
  const data = series.map((p) => ({ label: monthLabel(p.month), Saved: fromPaise(p.saved), Spent: fromPaise(p.spent) }));
  return (
    <div className="h-60 w-full" role="img" aria-label="Saved and spent per month">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 4, left: -8, bottom: 0 }} barGap={4}>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
          <YAxis tickFormatter={f.axis} tickLine={false} axisLine={false} fontSize={11} width={56} stroke="var(--muted-foreground)" />
          <Tooltip formatter={f.tooltip} {...tooltipStyle} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="Saved" fill="var(--success)" radius={[6, 6, 0, 0]} maxBarSize={22} />
          <Bar dataKey="Spent" fill="var(--violet)" radius={[6, 6, 0, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Stacked contributions per month: framed as "built together", not a competition. */
export function TogetherChart({ series, members, currency }: { series: SeriesPoint[]; members: MemberDTO[]; currency: string }) {
  const f = useFormatters(currency);
  const data = series.map((p) => {
    const row: Record<string, string | number> = { label: monthLabel(p.month) };
    for (const m of members) row[m.isMe ? "You" : m.name] = fromPaise(p.byUser[m.id] ?? 0);
    return row;
  });
  return (
    <div className="h-52 w-full" role="img" aria-label="Contributions per month by member">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
          <YAxis tickFormatter={f.axis} tickLine={false} axisLine={false} fontSize={11} width={56} stroke="var(--muted-foreground)" />
          <Tooltip formatter={f.tooltip} {...tooltipStyle} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
          {members.map((m, i) => (
            <Bar
              key={m.id}
              dataKey={m.isMe ? "You" : m.name}
              stackId="together"
              fill={m.avatarColor || CHART_COLORS[i % CHART_COLORS.length]}
              radius={i === members.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}
              maxBarSize={28}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CategoryChart({ categories, currency }: { categories: { category: string; amount: number }[]; currency: string }) {
  const f = useFormatters(currency);
  const data = categories.map((c) => ({ name: c.category, value: fromPaise(c.amount) }));
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="h-44 w-44 shrink-0" role="img" aria-label="Spending by category">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="100%" paddingAngle={2} stroke="none">
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={f.tooltip} {...tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="w-full space-y-2 text-sm">
        {categories.slice(0, 6).map((c, i) => (
          <li key={c.category} className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
            <span className="flex-1 truncate">{c.category}</span>
            <span className="tabular font-medium">{formatCurrency(c.amount, { currency })}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
