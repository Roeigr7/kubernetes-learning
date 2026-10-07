import { useEffect, useRef, useState } from 'react'
import { Box, Button, Card, LinearProgress, Stack, Tooltip, Typography } from '@mui/material'
import { colors } from '../colors.ts'
import type { WorkloadAmount, WorkloadResources } from '../types/infrastructure.ts'

type WorkloadResourcesCardProps = {
  resources: WorkloadResources[]
  onAdjust: (name: string, metric: 'cpu' | 'memory', field: 'request' | 'limit', direction: 'raise' | 'lower') => void
  onReset: () => void
}

type Advice = 'Raise' | 'Lower' | 'Keep'

const fields: { key: keyof WorkloadAmount; label: string; hint: string }[] = [
  { key: 'used', label: 'Used', hint: 'כמה בשימוש עכשיו' },
  { key: 'request', label: 'Request', hint: 'כמה ה-workload מבקש' },
  { key: 'limit', label: 'Limit', hint: 'התקרה שאסור לעבור' },
  { key: 'possible', label: 'Possible', hint: 'כמה יש בשרתים' },
]

const tooltipSlotProps = {
  tooltip: {
    sx: { direction: 'rtl', textAlign: 'right', fontSize: 13, px: 1.25, py: 0.75, maxWidth: 220 },
  },
}

export default function WorkloadResourcesCard({ resources, onAdjust, onReset }: WorkloadResourcesCardProps) {
  return (
    <Card id="workload-resources" sx={{ height: '100%' }}>
      <Stack direction="row" spacing={1} sx={{ px: 2, pt: 2, pb: 1, alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box>
          <Typography sx={{ fontSize: 15, fontWeight: 600 }}>Requests and limits</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
            CPU in cores. Memory in Gi.
          </Typography>
        </Box>
        <Button size="small" variant="outlined" onClick={onReset} sx={{ flexShrink: 0 }}>
          Reset
        </Button>
      </Stack>

      <Stack spacing={2} sx={{ px: 2, pb: 2 }}>
        {resources.map((resource) => (
          <Box key={resource.name}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: resource.name.startsWith('feed') ? colors.feedCpu : colors.userCpu }}>
                {resource.name}
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                Recommendations
              </Typography>
            </Stack>
            <ResourceLine
              kind="CPU"
              amount={resource.cpu}
              color={resource.name.startsWith('feed') ? colors.feedCpu : colors.userCpu}
              onAdjust={(field, direction) => onAdjust(resource.name, 'cpu', field, direction)}
            />
            <ResourceLine
              kind="Memory"
              amount={resource.memory}
              color={resource.name.startsWith('feed') ? colors.feedMemory : colors.userMemory}
              onAdjust={(field, direction) => onAdjust(resource.name, 'memory', field, direction)}
            />
          </Box>
        ))}
      </Stack>
    </Card>
  )
}

function ResourceLine({
  kind,
  amount,
  color,
  onAdjust,
}: {
  kind: string
  amount: WorkloadAmount
  color: string
  onAdjust: (field: 'request' | 'limit', direction: 'raise' | 'lower') => void
}) {
  const requestAdvice = recommendRequest(amount)
  const limitAdvice = recommendLimit(amount)
  const width = Math.max(0, Math.min(100, (amount.used / amount.possible) * 100))

  return (
    <Box sx={{ mt: 1.25 }}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary' }}>{kind}</Typography>
        <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <AdviceButton field="Request" advice={requestAdvice} onClick={() => onAdjust('request', requestAdvice === 'Raise' ? 'raise' : 'lower')} />
          <AdviceButton field="Limit" advice={limitAdvice} onClick={() => onAdjust('limit', limitAdvice === 'Raise' ? 'raise' : 'lower')} />
        </Stack>
      </Stack>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', mt: 0.5 }}>
        {fields.map((field) => (
          <Tooltip key={field.key} title={field.hint} describeChild arrow placement="top" slotProps={tooltipSlotProps}>
            <Box sx={{ textAlign: 'center', cursor: 'help' }}>
              <Typography sx={{ fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
                <CountValue value={amount[field.key]} />
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                {field.label}
              </Typography>
            </Box>
          </Tooltip>
        ))}
      </Box>
      <LinearProgress
        variant="determinate"
        value={width}
        sx={{
          mt: 0.75,
          height: 5,
          borderRadius: 99,
          bgcolor: colors.track,
          '& .MuiLinearProgress-bar': { borderRadius: 99, bgcolor: color },
        }}
      />
    </Box>
  )
}

function AdviceButton({ field, advice, onClick }: { field: string; advice: Advice; onClick: () => void }) {
  const color = adviceColor(advice)
  return (
    <Button
      size="small"
      variant="contained"
      disableElevation
      disabled={advice === 'Keep'}
      onClick={onClick}
      sx={{
        minWidth: 0,
        minHeight: 28,
        px: 1.25,
        py: 0.5,
        borderRadius: '14px',
        fontSize: 11,
        fontWeight: 700,
        lineHeight: 1.2,
        bgcolor: color,
        color: '#fff',
        '&:hover': { bgcolor: color, filter: 'brightness(0.92)' },
        '&.Mui-disabled': { bgcolor: colors.slate, color: '#fff' },
      }}
    >
      {field} {advice}
    </Button>
  )
}

function recommendRequest(amount: WorkloadAmount): Advice {
  if (amount.used > amount.request) return 'Raise'
  if (amount.used <= amount.request * 0.6) return 'Lower'
  return 'Keep'
}

function recommendLimit(amount: WorkloadAmount): Advice {
  if (amount.used >= amount.limit * 0.85) return 'Raise'
  if (amount.used <= amount.limit * 0.4) return 'Lower'
  return 'Keep'
}

function adviceColor(advice: Advice) {
  if (advice === 'Raise') return colors.warning
  if (advice === 'Lower') return colors.blue
  return colors.slate
}

function CountValue({ value }: { value: number }) {
  const [shown, setShown] = useState(value)
  const shownRef = useRef(value)

  useEffect(() => {
    const from = shownRef.current
    if (from === value) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      shownRef.current = value
      setShown(value)
      return
    }

    const start = performance.now()
    const duration = 640
    const timer = window.setInterval(() => {
      const progress = Math.min(1, (performance.now() - start) / duration)
      const eased = 1 - (1 - progress) ** 3
      const next = progress === 1 ? value : Math.round((from + (value - from) * eased) * 10) / 10
      shownRef.current = next
      setShown(next)
      if (progress === 1) window.clearInterval(timer)
    }, 16)
    return () => window.clearInterval(timer)
  }, [value])

  return formatAmount(shown)
}

function formatAmount(value: number) {
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : String(rounded)
}
