import { Box, Card, Stack, Typography } from '@mui/material'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { colors, seriesColors } from '../colors.ts'
import type { PodDistributionItem } from '../types/infrastructure.ts'

type PodDistributionChartProps = {
  distribution: PodDistributionItem[]
}

export default function PodDistributionChart({ distribution }: PodDistributionChartProps) {
  const total = distribution.reduce((sum, item) => sum + item.pods, 0)

  return (
    <Card id="pod-distribution">
      <Box sx={{ px: 2.5, pt: 2, pb: 0.5 }}>
        <Typography sx={{ fontSize: 15, fontWeight: 600 }}>Pod Distribution</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
          node-1 runs 1 pod. node-2 and node-3 run 2 pods each.
        </Typography>
      </Box>

      <Box sx={{ position: 'relative', height: 240, mx: 1 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={distribution}
              dataKey="pods"
              nameKey="name"
              innerRadius={68}
              outerRadius={92}
              paddingAngle={2}
              stroke="#FFFFFF"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {distribution.map((item, index) => (
                <Cell key={item.name} fill={seriesColors[index % seriesColors.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [`${value ?? 0} pods`, name]}
              contentStyle={{
                borderRadius: 8,
                border: `1px solid ${colors.line}`,
                boxShadow: '0 8px 24px rgba(16, 24, 40, 0.08)',
                fontSize: 13,
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
