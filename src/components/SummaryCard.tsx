import type { ReactNode } from 'react'
import { Avatar, Box, Card, CardContent, Stack, Tooltip, Typography } from '@mui/material'
import { colors } from '../colors.ts'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'

type SummaryCardProps = {
  label: string
  value: string
  helper: string
  icon: ReactNode
  iconColor: string
  iconBackground: string
  accent?: string
  trend?: number
  statusDot?: string
  hint?: string
}

export default function SummaryCard({
  label,
  value,
  helper,
  icon,
  iconColor,
  iconBackground,
  accent,
  trend,
  statusDot,
  hint,
}: SummaryCardProps) {
  const card = (
    <Card sx={{ borderTop: accent ? `3px solid ${accent}` : undefined, cursor: hint ? 'help' : undefined, height: '100%' }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
          <Avatar
            variant="rounded"
            sx={{
              width: 36,
              height: 36,
              bgcolor: iconBackground,
              color: iconColor,
            }}
          >
            {icon}
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: 0.4 }}
            >
              {label.toUpperCase()}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 0.25 }}>
              {statusDot ? (
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: statusDot,
                    flexShrink: 0,
                  }}
                />
              ) : null}
              <Typography sx={{ fontSize: 26, fontWeight: 600, letterSpacing: -0.4, lineHeight: 1.15 }}>
                {value}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 0.75 }}>
              {trend !== undefined ? <TrendIndicator trend={trend} /> : null}
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {helper}
              </Typography>
            </Stack>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  )

  if (!hint) return card

  return (
    <Tooltip
      title={hint}
      arrow
      placement="top"
      slotProps={{
        tooltip: {
          sx: { direction: 'rtl', textAlign: 'right', fontSize: 13, px: 1.25, py: 0.75 },
        },
      }}
    >
      {card}
    </Tooltip>
  )
}

function TrendIndicator({ trend }: { trend: number }) {
  const rising = trend > 0
  const flat = trend === 0
  const color = flat ? colors.slate : rising ? colors.warning : colors.healthy
  const Icon = rising ? TrendingUpIcon : TrendingDownIcon
  const label = `${rising ? '+' : ''}${trend} pts`

  return (
    <Stack
      direction="row"
      spacing={0.25}
      sx={{
        alignItems: 'center',
        color,
        bgcolor: rising ? colors.warningBg : flat ? colors.paperMuted : colors.healthyBg,
        borderRadius: 1,
        px: 0.75,
        py: 0.25,
      }}
    >
      {flat ? null : <Icon sx={{ fontSize: 14 }} />}
      <Typography variant="caption" sx={{ fontWeight: 700, color: 'inherit' }}>
        {label}
      </Typography>
    </Stack>
  )
}
