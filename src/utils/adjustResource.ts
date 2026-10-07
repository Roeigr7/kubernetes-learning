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
  const taken = new Set<number>()
  for (const other of resources) {
    for (const key of ['cpu', 'memory'] as const) {
      for (const part of ['request', 'limit'] as const) {
        if (other.name === name && key === metric && part === field) continue
        taken.add(other[key][part])
      }
    }
  }
  const amount = item[metric]
  const fits = (value: number) => {
    if (value > amount.possible) return false
    if (field === 'request') return value >= 0.5 && value < amount.limit
    return value > amount.request
  }
  let next = roundHalf(amount[field] + step)
  for (let guard = 0; guard < 12 && (!fits(next) || taken.has(next)); guard += 1) {
    const nudged = roundHalf(next + step)
    if (nudged === next || !fits(nudged)) return null
    next = nudged
  }
  if (!fits(next) || taken.has(next)) return null
  return next
}

function roundHalf(value: number) {
  return Math.round(value * 2) / 2
}
