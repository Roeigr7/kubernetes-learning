import { Chip } from '@mui/material'

const statusStyles: Record<string, { color: string; background: string; border: string }> = {
  Running: { color: '#067647', background: '#ECFDF3', border: '#ABEFC6' },
  Ready: { color: '#067647', background: '#ECFDF3', border: '#ABEFC6' },
  Healthy: { color: '#067647', background: '#ECFDF3', border: '#ABEFC6' },
  Succeeded: { color: '#067647', background: '#ECFDF3', border: '#ABEFC6' },
  Pending: { color: '#B54708', background: '#FFFAEB', border: '#FEDF89' },
  CrashLoopBackOff: { color: '#B42318', background: '#FEF3F2', border: '#FECDCA' },
  NotReady: { color: '#B42318', background: '#FEF3F2', border: '#FECDCA' },
}

const fallbackStyle = { color: '#344054', background: '#F2F4F7', border: '#E4E7EC' }

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
