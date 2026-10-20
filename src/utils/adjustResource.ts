import type { WorkloadResources } from '../types/infrastructure.ts'

export function nextResourceValue(
  resources: WorkloadResources[],
  name: string,
  metric: 'cpu' | 'memory',
  field: 'request' | 'limit',
  direction: 'raise' | 'lower',
): number | null {
  const item = resources.find((resource) => resource.name === name)
  if (!item) return null
  const step = direction === 'raise' ? 0.5 : -0.5
  const amount = item[metric]
  const next = roundHalf(amount[field] + step)
  if (next > amount.possible) return null
  if (field === 'request' && (next < 0.5 || next >= amount.limit)) return null
  if (field === 'limit' && next <= amount.request) return null
  return next
}

function roundHalf(value: number) {
  return Math.round(value * 2) / 2
}
