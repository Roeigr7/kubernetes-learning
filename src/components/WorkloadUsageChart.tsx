import { Box, Card, Stack, Typography } from '@mui/material'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { colors } from '../colors.ts'
import type { UsagePeriod, UsageSeries, WorkloadHour, WorkloadResources } from '../types/infrastructure.ts'
import { readingHints, summarizeWeek, type WeekStats } from '../utils/rightsizing.ts'
import AppTooltip from './AppTooltip.tsx'

export const defaultUsageSeries: UsageSeries[] = [
  { key: 'userCpu', name: 'user CPU', color: colors.userCpu, workload: 'user', metric: 'cpu' },
  { key: 'userMemory', name: 'user memory', color: colors.userMemory, workload: 'user', metric: 'memory' },
  { key: 'feedCpu', name: 'feed CPU', color: colors.feedCpu, workload: 'feed', metric: 'cpu' },
  { key: 'feedMemory', name: 'feed memory', color: colors.feedMemory, workload: 'feed', metric: 'memory' },
]

const chartPalette: Record<'cpu' | 'memory', RoleColors & { usage: string }> = {
  cpu: {
    usage: '#2563EB',
    average: '#0F766E',
    peak: '#EA580C',
    p95: '#7C3AED',
    p99: '#0891B2',
    request: '#16A34A',
    limit: '#4338CA',
  },
  memory: {
    usage: '#DB2777',
    average: '#0F766E',
    peak: '#EA580C',
    p95: '#7C3AED',
    p99: '#0891B2',
    request: '#16A34A',
    limit: '#4338CA',
  },
}

type LinePattern = 'solid' | 'dashed' | 'dotted'

type WorkloadUsageChartProps = {
  history: WorkloadHour[]
  resources: WorkloadResources[]
  workload: string
  period?: UsagePeriod
  series?: UsageSeries[]
}

export default function WorkloadUsageChart({ history, resources, workload, period = 'day', series = defaultUsageSeries }: WorkloadUsageChartProps) {
  const stats = Object.fromEntries(series.map((item) => [item.key, summarizeWeek(valuesOf(history, item.key))])) as Record<string, WeekStats>

  return (
    <Box
      id="workload-usage"
      sx={{
        height: '100%',
        minWidth: 0,
        display: 'grid',
        gap: 2.5,
        alignItems: 'stretch',
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1fr) minmax(0, 1fr)' },
      }}
    >
      <MetricChart metric="cpu" title="CPU" history={history} resources={resources} series={series} stats={stats} period={period} workload={workload} />
      <MetricChart metric="memory" title="Memory" history={history} resources={resources} series={series} stats={stats} period={period} workload={workload} />
    </Box>
  )
}

function MetricChart({
  metric,
  title,
  history,
  resources,
  series,
  stats,
  period,
  workload,
}: {
  metric: 'cpu' | 'memory'
  title: string
  history: WorkloadHour[]
  resources: WorkloadResources[]
  series: UsageSeries[]
  stats: Record<string, WeekStats>
  period: UsagePeriod
  workload: string
}) {
  const visible = series.filter((item) => item.metric === metric && item.workload === workload)
  const selected = visible[0]
  const roleColors = chartPalette[metric]
  const statStyles = weekStyles(roleColors)
  const markers = referenceMarkers(resources, workload, metric, roleColors.request, roleColors.limit)
  const selectedStats = period === 'week' && selected ? stats[selected.key] : undefined
  const top = scaleTop(
    history,
    visible.map((item) => item.key),
    [
      ...markers.map((marker) => marker.y),
      ...(selectedStats ? [selectedStats.average, selectedStats.peak, selectedStats.p95, selectedStats.p99] : []),
    ],
    period,
  )

  return (
    <Card id={`workload-${metric}`} sx={{ height: '100%', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ px: 2.5, pt: 2, pb: 1 }}>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'baseline' }}>
          <Typography sx={{ fontSize: 15, fontWeight: 600 }}>{title}</Typography>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary' }}>{unitFor(metric)}</Typography>
        </Stack>
        <Stack direction="row" spacing={1.5} useFlexGap sx={{ flexWrap: 'wrap', mt: 1 }}>
          {visible.map((item) => (
            <Swatch key={item.key} color={roleColors.usage} label={item.name} />
          ))}
          {selectedStats
            ? statStyles.map((item) => (
                <Swatch
                  key={item.id}
                  color={item.color}
                  label={`${item.label} ${withUnit(selectedStats[item.id], metric)}`}
                  pattern={item.pattern}
                  title={item.hint}
                />
              ))
            : null}
          {markers.map((marker) => (
            <Swatch key={marker.label} color={marker.stroke} label={marker.label} pattern={patternOf(marker.dash)} />
          ))}
        </Stack>
      </Box>
      <Box sx={{ flex: 1, minHeight: 220, minWidth: 0, px: 1, pb: 1 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={history} margin={{ top: 18, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={colors.grid} />
            <XAxis
              dataKey="time"
              tick={{ fill: colors.tick, fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              dy={6}
              interval={period === 'week' ? 5 : 1}
              tickFormatter={(value) => (period === 'week' ? String(value).split(' ')[0] : String(value))}
            />
            <YAxis domain={[0, top]} ticks={ticksFor(top)} tick={{ fill: colors.tick, fontSize: 12 }} axisLine={false} tickLine={false} width={32} />
            <Tooltip
              allowEscapeViewBox={{ x: false, y: false }}
              content={(props) => (
                <DayTooltip
                  active={props.active}
                  payload={props.payload as unknown as DayTooltipProps['payload']}
                  label={props.label}
                  stats={stats}
                  resources={resources}
                  series={series}
                  period={period}
                />
              )}
            />
            {markers.map((marker) => (
              <ReferenceLine
                key={marker.label}
                y={marker.y}
                stroke={marker.stroke}
                strokeDasharray={marker.dash}
                strokeWidth={1.75}
                label={
                  period === 'week'
                    ? undefined
                    : {
                        value: marker.label,
                        position: marker.kind === 'request' ? 'insideTopLeft' : 'insideTopRight',
                        fill: marker.stroke,
                        fontSize: 11,
                      }
                }
              />
            ))}
            {selectedStats
              ? statStyles.map((item) => (
                  <ReferenceLine
                    key={item.id}
                    y={selectedStats[item.id]}
                    stroke={item.color}
                    strokeDasharray={item.dash}
                    strokeWidth={item.pattern === 'solid' ? 2 : 1.75}
                  />
                ))
              : null}
            {visible.map((item) => (
              <Line
                key={item.key}
                type="monotone"
                dataKey={item.key}
                name={item.name}
                stroke={roleColors.usage}
                strokeWidth={2.5}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </Card>
  )
}

type DayTooltipProps = {
  active?: boolean
  payload?: { dataKey?: string | number; name?: string; value?: number; color?: string }[]
  label?: string | number
  stats: Record<string, WeekStats>
  resources: WorkloadResources[]
  series: UsageSeries[]
  period: UsagePeriod
}

function DayTooltip({ active, payload, label, stats, resources, series, period }: DayTooltipProps) {
  if (!active || !payload?.length) return null

  return (
    <Box sx={{ bgcolor: '#fff', border: `1px solid ${colors.line}`, borderRadius: 1, boxShadow: '0 8px 24px rgba(16, 24, 40, 0.08)', px: 1.25, py: 1, minWidth: 0, maxWidth: 'min(260px, calc(100vw - 32px))' }}>
      <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 0.75 }}>{label}</Typography>
      <Stack spacing={0.75}>
        {payload.map((item) => {
          const key = String(item.dataKey)
          const match = series.find((entry) => entry.key === key)
          const amount = match ? resources.find((resource) => resource.name.startsWith(match.workload))?.[match.metric] : undefined
          const reading = stats[key]
          return (
            <Box key={key}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: item.color }}>{item.name}</Typography>
              <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                {period === 'week' ? 'This sample' : 'This hour'}: {withUnit(Number(item.value ?? 0), match?.metric ?? 'cpu')}
              </Typography>
              {period === 'week' && reading ? (
                <>
                  <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                    Average Usage: {withUnit(reading.average, match?.metric ?? 'cpu')}
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                    Peak Usage: {withUnit(reading.peak, match?.metric ?? 'cpu')}
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                    P95: {withUnit(reading.p95, match?.metric ?? 'cpu')} · P99: {withUnit(reading.p99, match?.metric ?? 'cpu')}
                  </Typography>
                </>
              ) : (
                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                  Day average: {withUnit(reading?.average ?? 0, match?.metric ?? 'cpu')}
                </Typography>
              )}
              {amount ? (
                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                  Request {withUnit(amount.request, match?.metric ?? 'cpu')} · Limit {withUnit(amount.limit, match?.metric ?? 'cpu')}
                </Typography>
              ) : null}
            </Box>
          )
        })}
      </Stack>
    </Box>
  )
}

function referenceMarkers(
  resources: WorkloadResources[],
  filter: string,
  metric: 'cpu' | 'memory',
  requestColor: string,
  limitColor: string,
) {
  const visible = resources.filter((resource) => resource.name.replace(/ workload$/, '') === filter)
  const metricLabel = metric === 'cpu' ? 'CPU' : 'memory'

  return visible.flatMap((resource) => {
    const who = resource.name.replace(/ workload$/, '')
    const amount = resource[metric]
    return [
      marker(who, metricLabel, 'request', amount.request, requestColor, undefined),
      marker(who, metricLabel, 'limit', amount.limit, limitColor, '9 4'),
    ]
  })
}

function marker(who: string, metric: string, kind: 'request' | 'limit', y: number, stroke: string, dash?: string) {
  const unitMetric = metric === 'CPU' ? 'cpu' : 'memory'
  return { y, stroke, kind, dash, label: `${who} ${metric} ${kind} ${withUnit(y, unitMetric)}` }
}

function valuesOf(history: WorkloadHour[], key: string) {
  return history.map((point) => {
    const value = point[key]
    return typeof value === 'number' ? value : 0
  })
}

function scaleTop(history: WorkloadHour[], keys: string[], extra: number[], period: UsagePeriod) {
  const values = history.flatMap((point) => keys.map((key) => {
    const value = point[key]
    return typeof value === 'number' ? value : 0
  }))
  const peak = Math.max(0, ...values, ...extra)
  const padded = Math.ceil(peak) + (period === 'week' ? 1 : 0)
  return Math.max(period === 'week' ? 4 : 10, padded)
}

function ticksFor(top: number) {
  const step = top > 16 ? 4 : 2
  const ticks = []
  for (let value = 0; value <= top; value += step) ticks.push(value)
  return ticks
}

function weekStyles(roleColors: RoleColors) {
  return [
    { id: 'average' as const, label: 'Average Usage', color: roleColors.average, dash: undefined, pattern: 'solid' as const, hint: readingHints.average },
    { id: 'peak' as const, label: 'Peak Usage', color: roleColors.peak, dash: '6 4', pattern: 'dashed' as const, hint: readingHints.peak },
    { id: 'p95' as const, label: 'P95', color: roleColors.p95, dash: undefined, pattern: 'solid' as const, hint: readingHints.p95 },
    { id: 'p99' as const, label: 'P99', color: roleColors.p99, dash: '1.5 3', pattern: 'dotted' as const, hint: readingHints.p99 },
  ]
}

type RoleColors = {
  average: string
  peak: string
  p95: string
  p99: string
  request: string
  limit: string
}

function patternOf(dash?: string): LinePattern {
  if (!dash) return 'solid'
  return dash.startsWith('1') ? 'dotted' : 'dashed'
}

function Swatch({
  color,
  label,
  pattern = 'solid',
  title,
}: {
  color: string
  label: string
  pattern?: LinePattern
  title?: string
}) {
  const borderStyle = pattern === 'dotted' ? 'dotted' : pattern === 'dashed' ? 'dashed' : 'solid'
  const row = (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', cursor: title ? 'help' : 'default' }}>
      <Box sx={{ width: 22, borderTop: `2px ${borderStyle} ${color}`, flexShrink: 0 }} />
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
        {label}
      </Typography>
    </Stack>
  )
  if (!title) return row
  return (
    <AppTooltip
      title={title}
      describeChild
      arrow
      placement="top"
      slotProps={{
        tooltip: {
          sx: { direction: 'rtl', textAlign: 'right', fontSize: 13, px: 1.25, py: 0.75, maxWidth: 260 },
        },
      }}
    >
      {row}
    </AppTooltip>
  )
}

function formatAmount(value: number) {
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : String(rounded)
}

function unitFor(metric: 'cpu' | 'memory') {
  return metric === 'cpu' ? 'cores' : 'Gi'
}

function withUnit(value: number, metric: 'cpu' | 'memory') {
  return `${formatAmount(value)} ${unitFor(metric)}`
}
