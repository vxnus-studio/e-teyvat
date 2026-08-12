"use client";

import {
  Area,
  AreaChart,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

export function WaitDistributionChart({ data }: { data: { wait: number, count: number }[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-500">
        No statistics data available.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{
          top: 20,
          right: 30,
          left: 0,
          bottom: 20,
        }}
      >
        <defs>
          <linearGradient id="waitBars" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9aebc7" />
            <stop offset="100%" stopColor="#2d8060" />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="2 6" stroke="#bedded14" vertical={false} />
        <XAxis 
          dataKey="wait" 
          stroke="#53675e"
          tick={{ fill: '#72877d', fontSize: 10 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis 
          stroke="#53675e"
          tick={{ fill: '#72877d', fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip 
          cursor={{ fill: '#62d5a30d' }}
          contentStyle={{ backgroundColor: '#0d1714', border: '1px solid rgba(190,220,205,.17)', borderRadius: 8, color: '#eff7f3', fontSize: 11 }}
          formatter={(value) => [`${value} characters`, 'Frequency']}
          labelFormatter={(label) => `Waiting ${label} phases`}
        />
        <Bar dataKey="count" fill="url(#waitBars)" radius={[4, 4, 1, 1]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PressureCurve({ data }: { data: { rank: number; score: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
        <defs>
          <linearGradient id="pressureArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e2b96a" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#e2b96a" stopOpacity={0} />
          </linearGradient>
        </defs>
        <YAxis domain={[0, 100]} hide />
        <Area type="monotone" dataKey="score" stroke="#e2b96a" strokeWidth={2} fill="url(#pressureArea)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
