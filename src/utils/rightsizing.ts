export type WeekStats = {
  average: number
  peak: number
  p95: number
  p99: number
}

export type Advice = 'Raise' | 'Lower' | 'Keep'

export function readingHintsFor(period: 'day' | 'week' = 'week') {
  const when = period === 'week' ? 'בשבוע האחרון' : 'ביום'
  const window = period === 'week' ? 'בשבוע' : 'ביום'
  return {
    average: `שימוש ממוצע. הממוצע של כל מדידות השימוש ${when}.`,
    peak: `השימוש הגבוה ביותר שנמדד ${when}.`,
    p95: `הערך שמתחתיו נמצאו 95% ממדידות השימוש ${window}.`,
    p99: `הערך שמתחתיו נמצאו 99% ממדידות השימוש ${window}.`,
  }
}

export const readingHints = readingHintsFor('week')

export function summarizeWeek(values: number[]): WeekStats {
  if (values.length === 0) return { average: 0, peak: 0, p95: 0, p99: 0 }
  const sorted = [...values].sort((a, b) => a - b)
  const average = values.reduce((sum, value) => sum + value, 0) / values.length
  return {
    average: round1(average),
    peak: round1(sorted[sorted.length - 1]),
    p95: round1(percentile(sorted, 95)),
    p99: round1(percentile(sorted, 99)),
  }
}

export type Sizing = {
  request: number
  limit: number
  requestRaw: number
  limitRaw: number
}

/** Request = (0.2×Average + 0.5×P95 + 0.3×P99) × 1.1 for both CPU and memory. */
export function requestTarget(metric: 'cpu' | 'memory', stats: WeekStats) {
  return sizingFor(metric, stats).request
}

/**
 * CPU limit = (0.2×P95 + 0.5×P99 + 0.3×Peak) × 1.1, and never under the measured peak.
 * Memory limit = Peak × 1.2, and never under the measured peak.
 */
export function limitTarget(metric: 'cpu' | 'memory', stats: WeekStats) {
  return sizingFor(metric, stats).limit
}

export function sizingFor(metric: 'cpu' | 'memory', stats: WeekStats): Sizing {
  const requestRaw = round1((0.2 * stats.average + 0.5 * stats.p95 + 0.3 * stats.p99) * 1.1)
  const limitRaw = metric === 'memory'
    ? round1(stats.peak * 1.2)
    : round1((0.2 * stats.p95 + 0.5 * stats.p99 + 0.3 * stats.peak) * 1.1)
  let limit = round1(Math.max(limitRaw, stats.peak))
  const request = requestRaw
  if (request >= limit) limit = round1(Math.max(stats.peak, request + 0.5))
  while (keepValue(request) >= keepValue(limit)) limit = round1(limit + 0.5)
  return { request, limit, requestRaw, limitRaw }
}

/** The half-step that counts as Keep for a target. */
export function keepValue(target: number) {
  const lower = Math.round(Math.ceil((target - 0.25) * 2 - 1e-9) / 2 * 2) / 2
  if (lower < target + 0.25 - 1e-9) return lower
  return Math.round((target - 0.25) * 2) / 2
}

export function formulaLine(metric: 'cpu' | 'memory', field: 'request' | 'limit') {
  if (field === 'request') return 'Request = (0.2×Average + 0.5×P95 + 0.3×P99) × 1.1'
  if (metric === 'cpu') return 'Limit = (0.2×P95 + 0.5×P99 + 0.3×Peak) × 1.1'
  return 'Limit = Peak × 1.2'
}

export function formulaDetail(metric: 'cpu' | 'memory', field: 'request' | 'limit', target: number, raw: number, peak: number) {
  const unit = metric === 'cpu' ? 'cores' : 'Gi'
  const amount = `${formatAmount(target)} ${unit}`
  const rawAmount = `${formatAmount(raw)} ${unit}`
  const peakAmount = `${formatAmount(peak)} ${unit}`
  if (field === 'request') {
    const base = `יעד ${amount}. מרווח ביטחון של 10% מעל שילוב של הממוצע, ה-P95 וה-P99.`
    if (Math.abs(target - raw) < 0.05) return base
    return `${base} הנוסחה נתנה ${rawAmount}, והיעד הותאם כדי שה-request יישאר מתחת ל-limit.`
  }
  if (metric === 'memory') {
    return `יעד ${amount}. 20% מעל שיא הזיכרון (${peakAmount}). Limit מתחת לשיא אמיתי עלול לגרום ל-OOM.`
  }
  const base = `יעד ${amount}. מרווח ביטחון של 10% מעל שילוב של P95, P99 והשיא.`
  if (raw < peak - 0.05) return `${base} הנוסחה נתנה ${rawAmount}, מתחת לשיא ${peakAmount}, לכן לא מיישמים אותה והיעד נשאר לפחות בגובה השיא.`
  if (target > raw + 0.05) return `${base} הנוסחה נתנה ${rawAmount}, והיעד עלה כדי להשאיר את ה-request מתחת ל-limit.`
  return base
}

export function adviceFor(current: number, target: number): Advice {
  const delta = round1(current - target)
  if (delta <= -0.25) return 'Raise'
  if (delta >= 0.25) return 'Lower'
  return 'Keep'
}

export function targetHint(metric: 'cpu' | 'memory', field: 'request' | 'limit', target: number, raw = target, peak = target) {
  return `${formulaLine(metric, field)}. ${formulaDetail(metric, field, target, raw, peak)}`
}

function percentile(sorted: number[], p: number) {
  const rank = (p / 100) * (sorted.length - 1)
  const low = Math.floor(rank)
  const high = Math.ceil(rank)
  if (low === high) return sorted[low]
  const weight = rank - low
  return sorted[low] * (1 - weight) + sorted[high] * weight
}

function round1(value: number) {
  return Math.round(value * 10) / 10
}

function formatAmount(value: number) {
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : String(rounded)
}
