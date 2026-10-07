import { Box, Card, Stack, Typography } from '@mui/material'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { PodDistributionItem } from '../types/infrastructure.ts'

const podColors = ['#155EEF', '#12B76A', '#7A5AF8', '#F79009', '#EE46BC', '#0BA5EC']

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
          How pods are spread across the {distribution.length} worker nodes.
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
                <Cell key={item.name} fill={podColors[index % podColors.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [`${value ?? 0} pods`, name]}
              contentStyle={{
                borderRadius: 8,
                border: '1px solid #E4E7EC',
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

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 1,
          px: 2.5,
          pb: 2.5,
          mt: 0.5,
        }}
      >
        {distribution.map((item, index) => (
          <Stack key={item.name} direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: podColors[index % podColors.length],
                  flexShrink: 0,
                }}
              />
              <Typography variant="body2" noWrap>
                {item.name}
              </Typography>
            </Stack>
            <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              {item.pods}
            </Typography>
          </Stack>
        ))}
      </Box>
    </Card>
  )
}
