import { workloadTone } from '../colors.ts'
import type { InfrastructureData, UsageSeries, WorkloadHour, WorkloadResources } from '../types/infrastructure.ts'
import { adviceFor, keepValue, sizingFor, summarizeWeek, type Advice, type WeekStats } from '../utils/rightsizing.ts'

type Direction = 'raise' | 'lower' | 'keep'

export type ContainerRightsizing = {
  resources: WorkloadResources[]
  history: WorkloadHour[]
  series: UsageSeries[]
  containersByWorkload: Record<string, string[]>
}

export type PodInfo = {
  id: string
  containers: string[]
}

export type PodRightsizing = {
  resources: WorkloadResources[]
  history: WorkloadHour[]
  series: UsageSeries[]
  podsByWorkload: Record<string, PodInfo[]>
}

export function buildPodRightsizing(data: InfrastructureData): PodRightsizing {
  const containers = buildContainerRightsizing(data)
  const byName = new Map(containers.resources.map((item) => [item.name, item]))
  const podsByWorkload: Record<string, PodInfo[]> = {}
  for (const row of data.workloads) {
    const parent = row.name.replace(/ workload$/, '')
    const list = podsByWorkload[parent] ?? []
    if (!list.some((pod) => pod.id === row.pod)) list.push({ id: row.pod, containers: [...row.containers] })
    podsByWorkload[parent] = list
  }

  const sampleCache = new Map<string, { cpu: number[]; memory: number[] }>()
  const resources: WorkloadResources[] = []
  const series: UsageSeries[] = []

  for (const parent of Object.keys(podsByWorkload)) {
    for (const pod of podsByWorkload[parent]) {
      const seed = hash(pod.id)
      const cpu = mixPod(
        pod.containers.map((name) => valuesOf(containers.history, seriesKey(name, 'cpu'))),
        seed,
      )
      const memory = mixPod(
        pod.containers.map((name) => valuesOf(containers.history, seriesKey(name, 'memory'))),
        seed + 17,
      )
      sampleCache.set(pod.id, { cpu, memory })
      const tone = workloadTone(parent)
      series.push(
        { key: seriesKey(pod.id, 'cpu'), name: `${pod.id} CPU`, color: tone.cpu, workload: pod.id, metric: 'cpu' },
        { key: seriesKey(pod.id, 'memory'), name: `${pod.id} memory`, color: tone.memory, workload: pod.id, metric: 'memory' },
      )
      const parts = pod.containers.map((name) => byName.get(name)).filter((item): item is WorkloadResources => item !== undefined)
      resources.push({
        name: pod.id,
        cpu: podAmount(parts, 'cpu', cpu),
        memory: podAmount(parts, 'memory', memory),
      })
    }
  }

  const history = data.workloadDay.map((point, index) => {
    const next: WorkloadHour = { ...point }
    for (const [id, samples] of sampleCache) {
      next[seriesKey(id, 'cpu')] = samples.cpu[index] ?? 0
      next[seriesKey(id, 'memory')] = samples.memory[index] ?? 0
    }
    return next
  })

  return { resources, history, series, podsByWorkload }
}

function mixPod(parts: number[][], seed: number) {
  const count = parts[0]?.length ?? 0
  const rand = mulberry32(seed)
  const values: number[] = []
  for (let index = 0; index < count; index += 1) {
    const sum = parts.reduce((total, part) => total + (part[index] ?? 0), 0)
    const noise = 0.82 + rand() * 0.36
    values.push(round1(Math.max(0.2, sum * noise)))
  }
  return values
}

function podAmount(parts: WorkloadResources[], metric: 'cpu' | 'memory', values: number[]) {
  const stats = summarizeWeek(values)
  const sizing = sizingFor(metric, stats)
  let request = roundHalf(Math.max(0.5, parts.reduce((total, item) => total + item[metric].request, 0)))
  let limit = roundHalf(parts.reduce((total, item) => total + item[metric].limit, 0))
  limit = roundHalf(Math.max(limit, sizing.limit, stats.peak))
  if (limit <= request) limit = roundHalf(request + 0.5)
  while (request >= limit) request = roundHalf(Math.max(0.5, request - 0.5))
  const possible = Math.max(8, ...parts.map((item) => item[metric].possible), Math.ceil(limit + 2))
  return { used: round1(values[values.length - 1] ?? 0), request, limit, possible }
}

export function buildContainerRightsizing(data: InfrastructureData): ContainerRightsizing {
  const week = data.usagePeriod === 'week'
  const containersByWorkload: Record<string, string[]> = {}
  for (const workload of data.workloads) {
    const parent = workload.name.replace(/ workload$/, '')
    const names = containersByWorkload[parent] ?? []
    for (const container of workload.containers) {
      if (!names.includes(container)) names.push(container)
    }
    containersByWorkload[parent] = names
  }

  const parents = Object.keys(containersByWorkload)
  const sampleCache = new Map<string, { cpu: number[]; memory: number[] }>()
  const resources: WorkloadResources[] = []
  const series: UsageSeries[] = []

  for (const parent of parents) {
    const containers = containersByWorkload[parent]
    const parentCpu = valuesOf(data.workloadDay, seriesKey(parent, 'cpu'))
    const parentMemory = valuesOf(data.workloadDay, seriesKey(parent, 'memory'))
    const parentResource = data.workloadResources.find((item) => item.name.replace(/ workload$/, '') === parent)
    containers.forEach((container, index) => {
      const alone = containers.length === 1
      const main = container === parent
      const seed = hash(`${parent}:${container}`)
      const cpu = alone ? parentCpu : main ? scaleSamples(parentCpu, seed) : sidecarSamples(parentCpu.length, 0.45, seed)
      const memory = alone ? parentMemory : main ? scaleSamples(parentMemory, seed + 17) : sidecarSamples(parentMemory.length, 0.9, seed + 29)
      sampleCache.set(container, { cpu, memory })
      const tone = workloadTone(container)
      series.push(
        { key: seriesKey(container, 'cpu'), name: `${container} CPU`, color: tone.cpu, workload: container, metric: 'cpu' },
        { key: seriesKey(container, 'memory'), name: `${container} memory`, color: tone.memory, workload: container, metric: 'memory' },
      )
      if (alone && parentResource) {
        resources.push({
          name: container,
          cpu: { ...parentResource.cpu },
          memory: { ...parentResource.memory },
        })
        return
      }
      const stance = stances[(seed + index) % stances.length]
      resources.push({
        name: container,
        cpu: toAmount(cpu, 'cpu', week, stance[0], stance[1], seed),
        memory: toAmount(memory, 'memory', week, stance[1], stance[0], seed + 3),
      })
    })
  }

  const history = data.workloadDay.map((point, index) => {
    const next: WorkloadHour = { ...point }
    for (const [container, samples] of sampleCache) {
      next[seriesKey(container, 'cpu')] = samples.cpu[index] ?? 0
      next[seriesKey(container, 'memory')] = samples.memory[index] ?? 0
    }
    return next
  })

  return { resources, history, series, containersByWorkload }
}

const stances: [Direction, Direction][] = [
  ['raise', 'lower'],
  ['lower', 'raise'],
  ['raise', 'raise'],
  ['lower', 'lower'],
  ['keep', 'lower'],
  ['raise', 'keep'],
]

function toAmount(values: number[], metric: 'cpu' | 'memory', week: boolean, requestAdvice: Direction, limitAdvice: Direction, seed: number) {
  const used = values[values.length - 1] ?? 0
  if (!week) return dayAmount(used, requestAdvice, limitAdvice)
  const stats = summarizeWeek(values)
  const placed = choosePair(metric, stats, requestAdvice, limitAdvice, seed)
  return {
    used,
    request: placed.request,
    limit: placed.limit,
    possible: Math.max(8, Math.ceil(Math.max(placed.limit, placed.limitGoal) + 2)),
  }
}

function dayAmount(used: number, requestAdvice: Direction, limitAdvice: Direction) {
  let request = roundHalf(Math.max(0.5, used))
  if (requestAdvice === 'raise') request = roundHalf(Math.max(0.5, used - 0.5))
  if (requestAdvice === 'lower') request = roundHalf(Math.max(request + 0.5, used / 0.55))
  let limit = roundHalf(Math.max(request + 0.5, used + 1))
  if (limitAdvice === 'raise') limit = roundHalf(Math.max(request + 0.5, used / 0.9))
  if (limitAdvice === 'lower') limit = roundHalf(Math.max(request + 1, used / 0.35))
  if (limit <= request) limit = roundHalf(request + 0.5)
  return { used: round1(used), request, limit, possible: Math.max(8, Math.ceil(limit + 2)) }
}

function choosePair(metric: 'cpu' | 'memory', stats: WeekStats, requestAdvice: Direction, limitAdvice: Direction, seed: number) {
  const sizing = sizingFor(metric, stats)
  const requestKeep = keepValue(sizing.request)
  const limitKeep = keepValue(sizing.limit)
  const ceiling = roundHalf(Math.max(limitKeep + 1, stats.peak + 1))
  const options = directionsFor(limitKeep - requestKeep)
  const shift = Math.abs(seed) % options.length
  const ordered = [...options.slice(shift), ...options.slice(0, shift)]
  if (!ordered.some(([request, limit]) => request === requestAdvice && limit === limitAdvice)) ordered.unshift([requestAdvice, limitAdvice])
  for (const [requestSide, limitSide] of ordered) {
    for (const requestOffset of offsetsFor(requestSide, seed)) {
      for (const limitOffset of offsetsFor(limitSide, seed + 1)) {
        const request = roundHalf(requestKeep + requestOffset)
        const limit = roundHalf(limitKeep + limitOffset)
        if (request < 0.5 || limit <= request) continue
        if (limit > Math.max(ceiling, limitKeep) + 1e-9) continue
        if (adviceFor(request, sizing.request) !== expectedAdvice(requestSide)) continue
        if (adviceFor(limit, sizing.limit) !== expectedAdvice(limitSide)) continue
        if (Math.min(limit, limitKeep) < Math.max(request, requestKeep) + 0.5 - 1e-9) continue
        return { request, limit, limitGoal: sizing.limit }
      }
    }
  }
  return { request: Math.max(0.5, requestKeep), limit: roundHalf(Math.max(limitKeep, requestKeep + 0.5)), limitGoal: sizing.limit }
}

function directionsFor(gap: number): [Direction, Direction][] {
  const safe: [Direction, Direction][] = [
    ['raise', 'lower'],
    ['raise', 'keep'],
    ['keep', 'lower'],
    ['keep', 'keep'],
  ]
  if (gap >= 1) safe.push(['raise', 'raise'], ['lower', 'lower'], ['lower', 'keep'], ['keep', 'raise'])
  if (gap >= 1.5) safe.push(['lower', 'raise'])
  return safe
}

function offsetsFor(advice: Direction, seed: number) {
  if (advice === 'keep') return [0]
  const base = advice === 'raise' ? [-0.5, -1, -1.5] : [0.5, 1, 1.5]
  const shift = Math.abs(seed) % base.length
  return [...base.slice(shift), ...base.slice(0, shift)]
}

function expectedAdvice(advice: Direction): Advice {
  if (advice === 'raise') return 'Raise'
  if (advice === 'lower') return 'Lower'
  return 'Keep'
}

function scaleSamples(values: number[], seed: number) {
  const rand = mulberry32(seed)
  return values.map((value) => round1(Math.max(0.2, value * (0.76 + rand() * 0.14))))
}

function sidecarSamples(count: number, baseline: number, seed: number) {
  const rand = mulberry32(seed)
  const values: number[] = []
  for (let index = 0; index < count; index += 1) {
    const hour = index % 6
    const day = Math.floor(index / 6)
    const weights = [0.72, 0.86, 1.15, 1.28, 1.05, 0.78]
    const weekend = count > 24 && day % 7 >= 5 ? 0.66 : 1
    const noise = 0.86 + rand() * 0.28
    const spike = rand() > 0.93 ? 1.4 : 1
    values.push(round1(Math.max(0.2, baseline * weights[hour] * weekend * noise * spike)))
  }
  return values
}

function valuesOf(history: WorkloadHour[], key: string) {
  return history.map((point) => {
    const value = point[key]
    return typeof value === 'number' ? value : 0
  })
}

function seriesKey(id: string, metric: 'cpu' | 'memory') {
  const camel = id.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())
  return `${camel}${metric === 'cpu' ? 'Cpu' : 'Memory'}`
}

function hash(text: string) {
  let value = 0
  for (const char of text) value = (value * 33 + char.charCodeAt(0)) >>> 0
  return value || 1
}

function mulberry32(seed: number) {
  let state = seed
  return () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let next = Math.imul(state ^ (state >>> 15), 1 | state)
    next = (next + Math.imul(next ^ (next >>> 7), 61 | next)) ^ next
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296
  }
}

function roundHalf(value: number) {
  return Math.round(value * 2) / 2
}

function round1(value: number) {
  return Math.round(value * 10) / 10
}
