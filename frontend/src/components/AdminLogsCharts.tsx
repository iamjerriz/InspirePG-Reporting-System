import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { LogEntry } from "../types";

interface AdminLogsChartsProps {
  entries: LogEntry[];
}

// Pulled from the active theme's CSS variables (see index.css) rather than
// hardcoded hex, so these automatically follow the admin cyberpunk palette -
// primary is the theme's magenta, accent is its teal.
const PRIMARY = "oklch(var(--primary))";
const ACCENT = "oklch(var(--accent))";
const GRID = "oklch(var(--border))";
const AXIS_TEXT = "oklch(var(--muted-foreground))";
const CURSOR_FILL = "oklch(var(--muted))";
const CARD_SURFACE = "oklch(var(--card))";

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function CountTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const value = Number(payload[0]?.value ?? 0);
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-popover-foreground">
        {value} record{value === 1 ? "" : "s"}
      </p>
    </div>
  );
}

function CountBarChart({
  data,
  dataKey,
  color,
}: {
  data: { name: string; count: number }[];
  dataKey: "name";
  color: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 38)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} stroke={GRID} />
        <XAxis
          type="number"
          allowDecimals={false}
          stroke={AXIS_TEXT}
          tickLine={false}
          axisLine={false}
          fontSize={12}
        />
        <YAxis
          type="category"
          dataKey={dataKey}
          stroke={AXIS_TEXT}
          tickLine={false}
          axisLine={false}
          fontSize={12}
          width={116}
        />
        <Tooltip content={CountTooltip} cursor={{ fill: CURSOR_FILL }} />
        <Bar dataKey="count" fill={color} radius={[0, 4, 4, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function AdminLogsCharts({ entries }: AdminLogsChartsProps) {
  const byArea = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of entries) counts.set(entry.area, (counts.get(entry.area) ?? 0) + 1);
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [entries]);

  const bySellerType = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of entries) {
      counts.set(entry.sellerType, (counts.get(entry.sellerType) ?? 0) + 1);
    }
    const sorted = [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    if (sorted.length <= 8) return sorted;
    const top = sorted.slice(0, 7);
    const otherCount = sorted.slice(7).reduce((sum, item) => sum + item.count, 0);
    return [...top, { name: "Other", count: otherCount }];
  }, [entries]);

  const byDay = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of entries) {
      const day = entry.timestamp.slice(0, 10);
      counts.set(day, (counts.get(day) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([day, count]) => ({ day, count }))
      .sort((a, b) => a.day.localeCompare(b.day));
  }, [entries]);

  const uniqueSids = useMemo(() => new Set(entries.map((entry) => entry.sid)).size, [entries]);
  const uniqueAreas = useMemo(() => new Set(entries.map((entry) => entry.area)).size, [entries]);
  const topArea = byArea[0]?.name ?? "—";

  if (entries.length === 0) {
    return <p className="py-8 text-center text-muted-foreground">No records yet.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Total records" value={entries.length} />
        <StatTile label="Unique SIDs" value={uniqueSids} />
        <StatTile label="Areas covered" value={uniqueAreas} />
        <StatTile label="Top area" value={topArea} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Records by area</CardTitle>
            <CardDescription>Total submissions per area</CardDescription>
          </CardHeader>
          <CardContent>
            <CountBarChart data={byArea} dataKey="name" color={PRIMARY} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Records by seller type</CardTitle>
            <CardDescription>Top seller types across all areas</CardDescription>
          </CardHeader>
          <CardContent>
            <CountBarChart data={bySellerType} dataKey="name" color={ACCENT} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Submissions over time</CardTitle>
          <CardDescription>Daily record count</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={byDay} margin={{ left: 0, right: 16, top: 8, bottom: 4 }}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="day" stroke={AXIS_TEXT} tickLine={false} axisLine={false} fontSize={12} />
              <YAxis allowDecimals={false} stroke={AXIS_TEXT} tickLine={false} axisLine={false} fontSize={12} width={32} />
              <Tooltip content={CountTooltip} cursor={{ stroke: GRID }} />
              <Line
                type="monotone"
                dataKey="count"
                stroke={PRIMARY}
                strokeWidth={2}
                dot={{ r: 4, fill: PRIMARY, strokeWidth: 2, stroke: CARD_SURFACE }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
