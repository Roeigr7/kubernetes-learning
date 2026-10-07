import { Box, Card, Divider, Stack, Typography } from '@mui/material'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { colors } from '../colors.ts'
import type { CpuSample } from '../types/infrastructure.ts'
import { formatPercent } from '../utils/format.ts'

type CpuUsageChartProps = {
  history: CpuSample[]
}

export default function CpuUsageChart({ history }: CpuUsageChartProps) {
  const values = history.map((point) => point.usage)
  const average = values.reduce((sum, value) => sum + value, 0) / values.length
  const peakPoint = history.reduce((best, point) => (point.usage > best.usage ? point : best), history[0])
  const currentPoint = history[history.length - 1]

  return (
    <Card id="cpu-utilization">
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{ px: 2.5, pt: 2, pb: 1, justifyContent: 'space-between', alignItems: { sm: 'flex-start' } }}
      >
        <Box>
          <Typography sx={{ fontSize: 15, fontWeight: 600 }}>Cluster CPU Utilization</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
            How busy the cluster CPU was across the last day.
          </Typography>
        </Box>
      </Stack>

      <Box sx={{ height: 280, px: 1, pt: 1 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={history} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="cpuFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.pink} stopOpacity={0.7} />
                <stop offset="45%" stopColor={colors.blue} stopOpacity={0.18} />
                <stop offset="100%" stopColor={colors.green} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={colors.grid} />
            <XAxis
              dataKey="time"
              tick={{ fill: colors.tick, fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              dy={8}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tick={{ fill: colors.tick, fontSize: 12 }}
              tickFormatter={(value) => `${value}%`}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <Tooltip
              formatter={(value) => [formatPercent(Number(value ?? 0)), 'CPU']}
              cursor={{ stroke: colors.line, strokeWidth: 1 }}
              contentStyle={{
                borderRadius: 8,
                border: `1px solid ${colors.line}`,
                boxShadow: '0 8px 24px rgba(16, 24, 40, 0.08)',
                fontSize: 13,
              }}
            />
            <Area
              type="monotone"
              dataKey="usage"
              name="CPU"
              stroke={colors.blue}
              strokeWidth={2.5}
              fill="url(#cpuFill)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: colors.blue }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>

      <Divider />
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
        }}
      >
        <Stat label="Average CPU" value={formatPercent(average)} helper="Across the series" />
        <Stat label="Peak CPU" value={formatPercent(peakPoint.usage)} helper={`At ${peakPoint.time}`} />
        <Stat label="Current CPU" value={formatPercent(currentPoint.usage)} helper={`Sample ${currentPoint.time}`} />
      </Box>
    </Card>
  )
}

function Stat({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <Box
      sx={{
        px: 2.5,
        py: 1.75,
        borderTop: { xs: `1px solid ${colors.grid}`, sm: 'none' },
        borderLeft: { sm: `1px solid ${colors.grid}` },
        '&:first-of-type': { borderLeft: 'none', borderTop: 'none' },
      }}
    >
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.3, mt: 0.25 }}>{value}</Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {helper}
      </Typography>
    </Box>
  )
}
