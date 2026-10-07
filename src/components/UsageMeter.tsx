import { Box, LinearProgress, Stack, Typography } from '@mui/material'
import { colors } from '../colors.ts'
import { usageColor } from '../utils/usage.ts'

type UsageMeterProps = {
  value: number
  label?: string
}

export default function UsageMeter({ value, label }: UsageMeterProps) {
  const color = usageColor(value)

  return (
    <Stack spacing={0.5} sx={{ minWidth: 0, flex: 1 }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        {label ? (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {label}
          </Typography>
        ) : (
          <Box />
        )}
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary' }}>
          {value}%
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={Math.max(0, Math.min(100, value))}
        sx={{
          height: 6,
          borderRadius: 99,
          bgcolor: colors.track,
          '& .MuiLinearProgress-bar': {
            borderRadius: 99,
            bgcolor: color,
          },
        }}
      />
    </Stack>
  )
}
