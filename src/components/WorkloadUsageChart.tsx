import { useState } from 'react'
import { Box, Card, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { colors } from '../colors.ts'
import type { WorkloadHour, WorkloadResources } from '../types/infrastructure.ts'

type Filter = 'user' | 'feed' | 'both'
type SeriesKey = 'userCpu' | 'userMemory' | 'feedCpu' | 'feedMemory'

const series: { key: SeriesKey; name: string; color: string; workload: 'user' | 'feed'; metric: 'cpu' | 'memory' }[] = [
  { key: 'userCpu', name: 'user CPU', color: colors.userCpu, workload: 'user', metric: 'cpu' },
  { key: 'userMemory', name: 'user memory', color: colors.userMemory, workload: 'user', metric: 'memory' },
  { key: 'feedCpu', name: 'feed CPU', color: colors.feedCpu, workload: 'feed', metric: 'cpu' },
  { key: 'feedMemory', name: 'feed memory', color: colors.feedMemory, workload: 'feed', metric: 'memory' },
]

type WorkloadUsageChartProps = {
  history: WorkloadHour[]
  resources: WorkloadResources[]
}

export default function WorkloadUsageChart({ history, resources }: WorkloadUsageChartProps) {
  const averages = Object.fromEntries(series.map((item) => [item.key, average(history, item.key)])) as Record<SeriesKey, number>
  const top = chartTop(history, resources)

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
      <MetricChart metric="cpu" title="CPU" history={history} resources={resources} averages={averages} top={top} />
      <MetricChart metric="memory" title="Memory" history={history} resources={resources} averages={averages} top={top} />
    </Box>
  )
}

function MetricChart({
  metric,
  title,
  history,
  resources,
  averages,
  top,
}: {
  metric: 'cpu' | 'memory'
  title: string
  history: WorkloadHour[]
  resources: WorkloadResources[]
  averages: Record<SeriesKey, number>
  top: number
}) {
  const [filter, setFilter] = useState<Filter>('user')
  const visible = series.filter((item) => item.metric === metric && (filter === 'both' || item.workload === filter))
  const markers = referenceMarkers(resources, filter, metric)

  return (
    <Card id={`workload-${metric}`} sx={{ height: '100%', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ px: 2.5, pt: 2, pb: 1 }}>
        <Stack direction="row" useFlexGap spacing={1} sx={{ alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Typography sx={{ fontSize: 15, fontWeight: 600 }}>{title}</Typography>
          <WorkloadFilter value={filter} onChange={setFilter} label={`${title} workload filter`} />
        </Stack>
        <Stack direction="row" spacing={1.5} useFlexGap sx={{ flexWrap: 'wrap', mt: 1 }}>
          {visible.map((item) => (
            <Swatch key={item.key} color={item.color} label={item.name} />
          ))}
          {markers.map((marker) => (
            <Swatch key={marker.label} color={marker.stroke} label={marker.label} dashed={marker.kind === 'request'} dotted={marker.kind === 'limit'} />
          ))}
        </Stack>
      </Box>
      <Box sx={{ flex: 1, minHeight: 220, minWidth: 0, px: 1, pb: 1 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={history} margin={{ top: 18, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={colors.grid} />
            <XAxis dataKey="time" tick={{ fill: colors.tick, fontSize: 12 }} axisLine={false} tickLine={false} dy={6} interval={1} />
            <YAxis domain={[0, top]} ticks={ticksFor(top)} tick={{ fill: colors.tick, fontSize: 12 }} axisLine={false} tickLine={false} width={32} />
            <Tooltip
              allowEscapeViewBox={{ x: false, y: false }}
              content={(props) => (
                <DayTooltip
                  active={props.active}
                  payload={props.payload as unknown as DayTooltipProps['payload']}
                  label={props.label}
                  averages={averages}
                  resources={resources}
                />
              )}
            />
            {markers.map((marker) => (
              <ReferenceLine
                key={marker.label}
                y={marker.y}
                stroke={marker.stroke}
                strokeDasharray={marker.kind === 'request' ? '6 4' : '2 3'}
                strokeWidth={1.5}
                label={{
                  value: marker.label,
                  position: marker.kind === 'request' ? 'insideTopLeft' : 'insideTopRight',
                  fill: marker.stroke,
                  fontSize: 11,
                }}
              />
            ))}
            {visible.map((item) => (
              <Line
                key={item.key}
                type="monotone"
                dataKey={item.key}
                name={item.name}
                stroke={item.color}
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
  averages: Record<SeriesKey, number>
  resources: WorkloadResources[]
}

function DayTooltip({ active, payload, label, averages, resources }: DayTooltipProps) {
  if (!active || !payload?.length) return null

  return (
    <Box sx={{ bgcolor: '#fff', border: `1px solid ${colors.line}`, borderRadius: 1, boxShadow: '0 8px 24px rgba(16, 24, 40, 0.08)', px: 1.25, py: 1, minWidth: 0, maxWidth: 'min(240px, calc(100vw - 32px))' }}>
      <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 0.75 }}>{label}</Typography>
      <Stack spacing={0.75}>
        {payload.map((item) => {
          const key = String(item.dataKey) as SeriesKey
          const match = series.find((entry) => entry.key === key)
          const amount = match ? resources.find((resource) => resource.name.startsWith(match.workload))?.[match.metric] : undefined
          return (
            <Box key={key}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: item.color }}>{item.name}</Typography>
              <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                This hour: {formatAmount(Number(item.value ?? 0))}
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                Day average: {formatAmount(averages[key])}
              </Typography>
              {amount ? (
                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                  Request {formatAmount(amount.request)} · Limit {formatAmount(amount.limit)}
                </Typography>
              ) : null}
            </Box>
          )
        })}
      </Stack>
    </Box>
  )
}

function referenceMarkers(resources: WorkloadResources[], filter: Filter, metric: 'cpu' | 'memory') {
  const visible = resources.filter((resource) => filter === 'both' || resource.name.startsWith(filter))
  const metricLabel = metric === 'cpu' ? 'CPU' : 'memory'

  return visible.flatMap((resource) => {
    const who = resource.name.startsWith('feed') ? 'feed' : 'user'
    const stroke = who === 'feed' ? (metric === 'cpu' ? colors.feedCpu : colors.feedMemory) : metric === 'cpu' ? colors.userCpu : colors.userMemory
    const amount = resource[metric]
    return [marker(who, metricLabel, 'request', amount.request, stroke), marker(who, metricLabel, 'limit', amount.limit, stroke)]
  })
}

function marker(who: string, metric: string, kind: 'request' | 'limit', y: number, stroke: string) {
  return { y, stroke, kind, label: `${who} ${metric} ${kind} ${formatAmount(y)}` }
}

function average(history: WorkloadHour[], key: SeriesKey) {
  const total = history.reduce((sum, point) => sum + point[key], 0)
  return Math.round((total / history.length) * 10) / 10
}

function chartTop(history: WorkloadHour[], resources: WorkloadResources[]) {
  const values = history.flatMap((point) => [point.userCpu, point.userMemory, point.feedCpu, point.feedMemory])
  const caps = resources.flatMap((resource) => [resource.cpu.limit, resource.memory.limit, resource.cpu.request, resource.memory.request])
  return Math.max(10, Math.ceil(Math.max(...values, ...caps)))
}

function ticksFor(top: number) {
  const ticks = []
  for (let value = 0; value <= top; value += 2) ticks.push(value)
  return ticks
}

function WorkloadFilter({ value, onChange, label }: { value: Filter; onChange: (value: Filter) => void; label: string }) {
  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={value}
      onChange={(_event, next: Filter | null) => {
        if (next) onChange(next)
      }}
      aria-label={label}
      sx={{ flexShrink: 0 }}
    >
      <ToggleButton value="user">User</ToggleButton>
      <ToggleButton value="feed">Feed</ToggleButton>
      <ToggleButton value="both">Both</ToggleButton>
    </ToggleButtonGroup>
  )
}

function Swatch({ color, label, dashed, dotted }: { color: string; label: string; dashed?: boolean; dotted?: boolean }) {
  const borderStyle = dotted ? 'dotted' : dashed ? 'dashed' : 'solid'
  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
      <Box sx={{ width: 16, borderTop: `2px ${borderStyle} ${color}` }} />
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
        {label}
      </Typography>
    </Stack>
  )
}

function formatAmount(value: number) {
  return Number.isInteger(value) ? String(value) : String(value)
}
