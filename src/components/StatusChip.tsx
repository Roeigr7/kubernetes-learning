import { Chip } from '@mui/material'
import { colors } from '../colors.ts'

const statusStyles: Record<string, { color: string; background: string; border: string }> = {
  Running: { color: colors.healthy, background: colors.healthyBg, border: colors.healthyBorder },
  Ready: { color: colors.healthy, background: colors.healthyBg, border: colors.healthyBorder },
  Healthy: { color: colors.healthy, background: colors.healthyBg, border: colors.healthyBorder },
  Succeeded: { color: colors.healthy, background: colors.healthyBg, border: colors.healthyBorder },
  Pending: { color: colors.warning, background: colors.warningBg, border: colors.warningBorder },
  CrashLoopBackOff: { color: colors.critical, background: colors.criticalBg, border: colors.criticalBorder },
  NotReady: { color: colors.critical, background: colors.criticalBg, border: colors.criticalBorder },
}

const fallbackStyle = { color: colors.ink, background: colors.paperMuted, border: colors.line }

type StatusChipProps = {
  status: string
}

export default function StatusChip({ status }: StatusChipProps) {
  const style = statusStyles[status] ?? fallbackStyle

  return (
    <Chip
      size="small"
      label={status}
      sx={{
        color: style.color,
        bgcolor: style.background,
        border: '1px solid',
        borderColor: style.border,
        height: 22,
      }}
    />
  )
}
