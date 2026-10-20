import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Box, Button, Card, LinearProgress, Stack, Typography } from '@mui/material'
import { colors, workloadTone } from '../colors.ts'
import { nextResourceValue } from '../utils/adjustResource.ts'
import { adviceFor, formulaDetail, formulaLine, readingHintsFor, sizingFor, type Advice, type WeekStats } from '../utils/rightsizing.ts'
import AppTooltip from './AppTooltip.tsx'
import { rightsizingBody, rightsizingExample, rightsizingGoal, rightsizingTitle } from './RightsizingIntro.tsx'
import type { UsagePeriod, WorkloadAmount, WorkloadResources } from '../types/infrastructure.ts'

type WorkloadReadings = Record<string, { cpu: WeekStats; memory: WeekStats }>

type WorkloadResourcesCardProps = {
  resources: WorkloadResources[]
  workload: string
  readings?: WorkloadReadings
  period?: UsagePeriod
  onAdjust: (name: string, metric: 'cpu' | 'memory', field: 'request' | 'limit', direction: 'raise' | 'lower') => void
  onReset: () => void
}

const baseFields: { key: keyof WorkloadAmount | keyof WeekStats; label: string; hint: string }[] = [
  { key: 'used', label: 'Used', hint: 'כמה בשימוש עכשיו' },
  { key: 'request', label: 'Request', hint: 'כמה ה-workload מבקש' },
  { key: 'limit', label: 'Limit', hint: 'התקרה שאסור לעבור' },
  { key: 'possible', label: 'Possible', hint: 'כמה יש בשרתים' },
]

function weekFields(period: UsagePeriod): { key: string; label: string; hint: string }[] {
  const hints = readingHintsFor(period)
  return [
    { key: 'used', label: 'Used', hint: 'כמה בשימוש עכשיו' },
    { key: 'average', label: 'Average', hint: hints.average },
    { key: 'peak', label: 'Peak', hint: hints.peak },
    { key: 'p95', label: 'P95', hint: hints.p95 },
    { key: 'p99', label: 'P99', hint: hints.p99 },
    { key: 'request', label: 'Request', hint: 'כמה ה-workload מבקש' },
    { key: 'limit', label: 'Limit', hint: 'התקרה שאסור לעבור' },
    {
      key: 'headroom',
      label: 'Headroom',
      hint: 'המרווח בין ה-limit לשיא. כמה נשאר מעל השימוש הגבוה ביותר לפני התקרה.',
    },
  ]
}

const tooltipSlotProps = {
  tooltip: {
    sx: { direction: 'rtl', textAlign: 'right', fontSize: 13, px: 1.25, py: 0.75, maxWidth: 320 },
  },
}

export default function WorkloadResourcesCard({ resources, workload, readings, period = 'week', onAdjust, onReset }: WorkloadResourcesCardProps) {
  const shown = resources.filter((resource) => resource.name.replace(/ workload$/, '') === workload)
  return (
    <Card id="workload-resources" sx={{ height: '100%' }}>
      <Stack direction="row" spacing={1} sx={{ px: 2, pt: 2, pb: 1, alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <AppTooltip
          describeChild
          arrow
          placement="top"
          title={
            <Box sx={{ direction: 'rtl', textAlign: 'right' }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 0.75 }}>{rightsizingTitle}</Typography>
              <Typography sx={{ fontSize: 13, lineHeight: 1.55 }}>{rightsizingBody}</Typography>
              <Typography sx={{ fontSize: 13, lineHeight: 1.55, mt: 0.75 }}>{rightsizingGoal}</Typography>
              <Typography sx={{ fontSize: 13, lineHeight: 1.55, mt: 0.75 }}>{rightsizingExample}</Typography>
            </Box>
          }
          slotProps={{
            tooltip: {
              sx: {
                direction: 'rtl',
                textAlign: 'right',
                maxWidth: 'min(340px, calc(100vw - 16px))',
                px: 1.5,
                py: 1.25,
              },
            },
          }}
        >
          <Box sx={{ cursor: 'help', width: 'fit-content' }}>
            <Typography sx={{ fontSize: 15, fontWeight: 600 }}>Requests and limits</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
              CPU in cores. Memory in Gi.
            </Typography>
          </Box>
        </AppTooltip>
        <Button size="small" variant="outlined" onClick={onReset} sx={{ flexShrink: 0 }}>
          Reset
        </Button>
      </Stack>

      <Stack spacing={2} sx={{ px: 2, pb: 2 }}>
        {shown.map((resource) => (
          <Box key={resource.name}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: workloadTone(resource.name).cpu }}>
                {resource.name}
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                Recommendations
              </Typography>
            </Stack>
            <ResourceLine
              resources={resources}
              name={resource.name}
              metric="cpu"
              kind="CPU"
              amount={resource.cpu}
              period={period}
              reading={readings?.[workload]?.cpu}
              color={workloadTone(resource.name).cpu}
              onAdjust={(field, direction) => onAdjust(resource.name, 'cpu', field, direction)}
            />
            <ResourceLine
              resources={resources}
              name={resource.name}
              metric="memory"
              kind="Memory"
              amount={resource.memory}
              period={period}
              reading={readings?.[workload]?.memory}
              color={workloadTone(resource.name).memory}
              onAdjust={(field, direction) => onAdjust(resource.name, 'memory', field, direction)}
            />
          </Box>
        ))}
      </Stack>
    </Card>
  )
}

function ResourceLine({
  resources,
  name,
  metric,
  kind,
  amount,
  reading,
  period,
  color,
  onAdjust,
}: {
  resources: WorkloadResources[]
  name: string
  metric: 'cpu' | 'memory'
  kind: string
  amount: WorkloadAmount
  reading?: WeekStats
  period: UsagePeriod
  color: string
  onAdjust: (field: 'request' | 'limit', direction: 'raise' | 'lower') => void
}) {
  const sizing = reading ? sizingFor(metric, reading) : undefined
  const requestGoal = sizing?.request
  const limitGoal = sizing?.limit
  const requestAdvice = actionableAdvice(
    resources,
    name,
    metric,
    'request',
    requestGoal === undefined ? recommendRequest(amount) : adviceFor(amount.request, requestGoal),
  )
  const limitAdvice = actionableAdvice(
    resources,
    name,
    metric,
    'limit',
    limitGoal === undefined ? recommendLimit(amount) : adviceFor(amount.limit, limitGoal),
  )
  const scale = reading ? amount.limit : amount.possible
  const width = scale > 0 ? Math.max(0, Math.min(100, (amount.used / scale) * 100)) : 0
  const fields = reading ? weekFields(period) : baseFields
  const numbers: Record<string, number> = { ...amount, ...reading }
  if (reading) numbers.headroom = Math.round((amount.limit - reading.peak) * 10) / 10
  const fieldRows = fields.length > 4 ? [fields.slice(0, 4), fields.slice(4)] : [fields]
  const columns = fields.length > 4 ? 4 : fields.length
  const unit = metric === 'cpu' ? 'cores' : 'Gi'

  return (
    <Box sx={{ mt: 1.25 }}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary' }}>{kind}</Typography>
        <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'flex-end' }}>
          <Stack spacing={0.4} sx={{ alignItems: 'center' }}>
            {requestGoal !== undefined && reading ? (
              <GoalMark value={requestGoal} unit={unit} hint={<FormulaHint metric={metric} field="request" target={requestGoal} raw={sizing?.requestRaw ?? requestGoal} peak={reading.peak} />} />
            ) : null}
            <AdviceButton
              field="Request"
              advice={requestAdvice}
              hint={requestGoal !== undefined && reading ? <FormulaHint metric={metric} field="request" target={requestGoal} raw={sizing?.requestRaw ?? requestGoal} peak={reading.peak} /> : undefined}
              onClick={() => onAdjust('request', requestAdvice === 'Raise' ? 'raise' : 'lower')}
            />
          </Stack>
          <Stack spacing={0.4} sx={{ alignItems: 'center' }}>
            {limitGoal !== undefined && reading ? (
              <GoalMark value={limitGoal} unit={unit} hint={<FormulaHint metric={metric} field="limit" target={limitGoal} raw={sizing?.limitRaw ?? limitGoal} peak={reading.peak} />} />
            ) : null}
            <AdviceButton
              field="Limit"
              advice={limitAdvice}
              hint={limitGoal !== undefined && reading ? <FormulaHint metric={metric} field="limit" target={limitGoal} raw={sizing?.limitRaw ?? limitGoal} peak={reading.peak} /> : undefined}
              onClick={() => onAdjust('limit', limitAdvice === 'Raise' ? 'raise' : 'lower')}
            />
          </Stack>
        </Stack>
      </Stack>
      <Stack spacing={1} sx={{ mt: 0.75 }}>
        {fieldRows.map((row) => (
          <Box key={row.map((field) => field.key).join('-')} sx={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, columnGap: 0.5 }}>
            {row.map((field) => (
              <AppTooltip key={field.key} title={field.hint} describeChild arrow placement="top" slotProps={tooltipSlotProps}>
                <Box sx={{ textAlign: 'center', cursor: 'help', minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 0.4 }}>
                    <Typography sx={{ fontSize: 15, fontWeight: 700, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
                      <CountValue value={numbers[field.key] ?? 0} />
                    </Typography>
                    <Typography component="span" sx={{ fontSize: 10, fontWeight: 400, color: 'text.secondary', lineHeight: 1 }}>
                      {unit}
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800, fontSize: 12, whiteSpace: 'nowrap' }}>
                    {field.label}
                  </Typography>
                </Box>
              </AppTooltip>
            ))}
            {Array.from({ length: columns - row.length }, (_, index) => (
              <Box key={`empty-${index}`} aria-hidden sx={{ borderRadius: 1, minHeight: 36 }} />
            ))}
          </Box>
        ))}
      </Stack>
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

function GoalMark({ value, unit, hint }: { value: number; unit: string; hint: ReactNode }) {
  return (
    <AppTooltip title={hint} describeChild arrow placement="top" slotProps={tooltipSlotProps}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 0.35, cursor: 'help' }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{formatAmount(value)}</Typography>
        <Typography component="span" sx={{ fontSize: 10, fontWeight: 400, color: 'text.secondary', lineHeight: 1 }}>
          {unit}
        </Typography>
      </Box>
    </AppTooltip>
  )
}

function FormulaHint({
  metric,
  field,
  target,
  raw,
  peak,
}: {
  metric: 'cpu' | 'memory'
  field: 'request' | 'limit'
  target: number
  raw: number
  peak: number
}) {
  return (
    <Box>
      <Typography sx={{ direction: 'ltr', textAlign: 'left', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: 12, fontWeight: 700, lineHeight: 1.45 }}>
        {formulaLine(metric, field)}
      </Typography>
      <Typography sx={{ direction: 'rtl', textAlign: 'right', fontSize: 13, lineHeight: 1.5, mt: 0.5 }}>{formulaDetail(metric, field, target, raw, peak)}</Typography>
    </Box>
  )
}

function AdviceButton({ field, advice, hint, onClick }: { field: string; advice: Advice; hint?: ReactNode; onClick: () => void }) {
  const color = adviceColor(advice)
  const button = (
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
  if (!hint) return button
  return (
    <AppTooltip title={hint} describeChild arrow placement="top" slotProps={tooltipSlotProps}>
      <span>{button}</span>
    </AppTooltip>
  )
}

function actionableAdvice(
  resources: WorkloadResources[],
  name: string,
  metric: 'cpu' | 'memory',
  field: 'request' | 'limit',
  advice: Advice,
): Advice {
  if (advice === 'Keep') return 'Keep'
  const direction = advice === 'Raise' ? 'raise' : 'lower'
  return nextResourceValue(resources, name, metric, field, direction) === null ? 'Keep' : advice
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
