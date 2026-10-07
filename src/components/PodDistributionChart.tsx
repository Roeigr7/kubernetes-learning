import { useMemo, useState } from 'react'
import { Box, Card, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { colors, seriesColors } from '../colors.ts'
import type { Workload } from '../types/infrastructure.ts'

type Filter = 'user' | 'feed' | 'both'

type PodDistributionChartProps = {
  workloads: Workload[]
  nodes: string[]
}

export default function PodDistributionChart({ workloads, nodes }: PodDistributionChartProps) {
  const [filter, setFilter] = useState<Filter>('both')
  const distribution = useMemo(
    () =>
      nodes.map((name) => ({
        name,
        pods: workloads.filter((workload) => workload.node === name && (filter === 'both' || workload.name.startsWith(filter))).length,
      })),
    [filter, nodes, workloads],
  )
  const total = distribution.reduce((sum, item) => sum + item.pods, 0)
  const slices = distribution.filter((item) => item.pods > 0)

  return (
    <Card id="pod-distribution" sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <Box sx={{ px: 2.5, pt: 2, pb: 0.5 }}>
        <Stack direction="row" useFlexGap spacing={1} sx={{ alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Typography sx={{ fontSize: 15, fontWeight: 600 }}>Pod Distribution</Typography>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={filter}
            onChange={(_event, next: Filter | null) => {
              if (next) setFilter(next)
            }}
            aria-label="Pod distribution workload filter"
            sx={{ flexShrink: 0 }}
          >
            <ToggleButton value="user">User</ToggleButton>
            <ToggleButton value="feed">Feed</ToggleButton>
            <ToggleButton value="both">Both</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
          {distribution.map((item) => `${item.name} runs ${item.pods} ${item.pods === 1 ? 'pod' : 'pods'}.`).join(' ')}
        </Typography>
      </Box>

      <Box sx={{ position: 'relative', height: 300, mx: 1 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="pods"
              nameKey="name"
              innerRadius={86}
              outerRadius={118}
              paddingAngle={2}
              stroke="#FFFFFF"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {slices.map((item) => (
                <Cell key={item.name} fill={seriesColors[nodes.indexOf(item.name) % seriesColors.length]} />
              ))}
            </Pie>
            <Tooltip
              allowEscapeViewBox={{ x: false, y: false }}
              formatter={(value, name) => [`${value ?? 0} pods`, name]}
              contentStyle={{
                borderRadius: 8,
                border: `1px solid ${colors.line}`,
                boxShadow: '0 8px 24px rgba(16, 24, 40, 0.08)',
                fontSize: 13,
                maxWidth: 'min(220px, calc(100vw - 32px))',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <Box sx={{ textAlign: 'center' }}>
            <Typography sx={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.4, lineHeight: 1 }}>
              {total}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Pods
            </Typography>
          </Box>
        </Box>
      </Box>

      <Stack spacing={1} sx={{ px: 2.5, pb: 2.5, mt: 0.5 }}>
        {distribution.map((item, index) => (
          <Stack key={item.name} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: seriesColors[index % seriesColors.length],
                flexShrink: 0,
              }}
            />
            <Typography variant="body2" sx={{ flex: 1 }}>
              {item.name}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              {item.pods} {item.pods === 1 ? 'pod' : 'pods'}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Card>
  )
}
