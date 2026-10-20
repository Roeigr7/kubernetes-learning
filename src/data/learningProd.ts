import { colors } from '../colors.ts'
import type { InfrastructureData, UsageSeries, WorkloadHour, WorkloadResources } from '../types/infrastructure.ts'
import { adviceFor, keepValue, limitTarget, requestTarget, summarizeWeek, type Advice, type WeekStats } from '../utils/rightsizing.ts'

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const hours = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00']

type Direction = 'raise' | 'lower' | 'keep'

type WorkloadSpec = {
  name: string
  workload: string
  cpuColor: string
  memoryColor: string
  cpuBase: number
  memBase: number
  cpuSeed: number
  memSeed: number
  cpuRequest: Direction
  cpuLimit: Direction
  memoryRequest: Direction
  memoryLimit: Direction
}

const specs: WorkloadSpec[] = [
  {
    name: 'user workload',
    workload: 'user',
    cpuColor: colors.userCpu,
    memoryColor: colors.userMemory,
    cpuBase: 1.8,
    memBase: 3.1,
    cpuSeed: 11,
    memSeed: 29,
    cpuRequest: 'raise',
    cpuLimit: 'lower',
    memoryRequest: 'lower',
    memoryLimit: 'raise',
  },
  {
    name: 'feed workload',
    workload: 'feed',
    cpuColor: colors.feedCpu,
    memoryColor: colors.feedMemory,
    cpuBase: 3.4,
    memBase: 5.2,
    cpuSeed: 47,
    memSeed: 53,
    cpuRequest: 'raise',
    cpuLimit: 'lower',
    memoryRequest: 'raise',
    memoryLimit: 'raise',
  },
  {
    name: 'checkout workload',
    workload: 'checkout',
    cpuColor: colors.checkoutCpu,
    memoryColor: colors.checkoutMemory,
    cpuBase: 2.2,
    memBase: 4,
    cpuSeed: 71,
    memSeed: 83,
    cpuRequest: 'raise',
    cpuLimit: 'lower',
    memoryRequest: 'lower',
    memoryLimit: 'keep',
  },
  {
    name: 'search workload',
    workload: 'search',
    cpuColor: colors.searchCpu,
    memoryColor: colors.searchMemory,
    cpuBase: 1.5,
    memBase: 2.7,
    cpuSeed: 97,
    memSeed: 113,
    cpuRequest: 'raise',
    cpuLimit: 'lower',
    memoryRequest: 'raise',
    memoryLimit: 'lower',
  },
  {
    name: 'billing workload',
    workload: 'billing',
    cpuColor: colors.billingCpu,
    memoryColor: colors.billingMemory,
    cpuBase: 0.9,
    memBase: 1.8,
    cpuSeed: 131,
    memSeed: 149,
    cpuRequest: 'keep',
    cpuLimit: 'lower',
    memoryRequest: 'lower',
    memoryLimit: 'lower',
  },
]

function seriesKey(workload: string, metric: 'cpu' | 'memory') {
  return `${workload}${metric === 'cpu' ? 'Cpu' : 'Memory'}`
}

function mulberry32(seed: number) {
  let state = seed
  return () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function weekSamples(seed: number, baseline: number) {
  const rand = mulberry32(seed)
  const shape = Math.floor(rand() * 3)
  const weights = shape === 0 ? [0.42, 0.58, 1.12, 1.38, 1.18, 0.66] : shape === 1 ? [0.72, 1.22, 1.34, 0.96, 0.78, 0.52] : [0.82, 0.9, 1.02, 1.08, 0.98, 0.86]
  const spikeAt = Math.floor(rand() * 42)
  const bumpAt = (spikeAt + 8 + Math.floor(rand() * 20)) % 42
  const trend = (rand() - 0.5) * 0.22
  const values: number[] = []
  for (let index = 0; index < 42; index += 1) {
    const day = Math.floor(index / 6)
    const hour = index % 6
    const weekend = day >= 5 ? 0.58 + rand() * 0.16 : 0.9 + rand() * 0.18
    const noise = 0.86 + rand() * 0.26
    const spike = index === spikeAt ? 1.32 + rand() * 0.38 : index === bumpAt ? 1.12 + rand() * 0.16 : 1
    const drift = 1 + trend * (day / 6)
    values.push(Math.round(Math.max(0.2, baseline * weights[hour] * weekend * noise * spike * drift) * 10) / 10)
  }
  return values
}

function roundHalf(value: number) {
  return Math.round(value * 2) / 2
}

function expectedAdvice(advice: Direction): Advice {
  if (advice === 'raise') return 'Raise'
  if (advice === 'lower') return 'Lower'
  return 'Keep'
}

function offsetsFor(advice: Direction, seed: number) {
  if (advice === 'keep') return [0]
  const base = advice === 'raise' ? [-0.5, -1, -1.5] : [0.5, 1, 1.5]
  const shift = Math.abs(seed) % base.length
  return [...base.slice(shift), ...base.slice(0, shift)]
}

const sampleMap = Object.fromEntries(
  specs.flatMap((spec) => [
    [seriesKey(spec.workload, 'cpu'), weekSamples(spec.cpuSeed, spec.cpuBase)],
    [seriesKey(spec.workload, 'memory'), weekSamples(spec.memSeed, spec.memBase)],
  ]),
) as Record<string, number[]>

const workloadDay: WorkloadHour[] = days.flatMap((day, dayIndex) =>
  hours.map((hour, hourIndex) => {
    const index = dayIndex * hours.length + hourIndex
    const point: WorkloadHour = {
      time: `${day} ${hour}`,
      userCpu: 0,
      userMemory: 0,
      feedCpu: 0,
      feedMemory: 0,
    }
    for (const spec of specs) {
      point[seriesKey(spec.workload, 'cpu')] = sampleMap[seriesKey(spec.workload, 'cpu')][index]
      point[seriesKey(spec.workload, 'memory')] = sampleMap[seriesKey(spec.workload, 'memory')][index]
    }
    return point
  }),
)

const usageSeries: UsageSeries[] = specs.flatMap((spec) => [
  {
    key: seriesKey(spec.workload, 'cpu'),
    name: `${spec.workload} CPU`,
    color: spec.cpuColor,
    workload: spec.workload,
    metric: 'cpu',
  },
  {
    key: seriesKey(spec.workload, 'memory'),
    name: `${spec.workload} memory`,
    color: spec.memoryColor,
    workload: spec.workload,
    metric: 'memory',
  },
])

type ResourceSlot = {
  key: string
  metric: 'cpu' | 'memory'
  requestAdvice: Direction
  limitAdvice: Direction
  requestGoal: number
  limitGoal: number
  peak: number
  seed: number
  used: number
}

function pairReason(slot: ResourceSlot, request: number, limit: number, requestKeep: number, limitKeep: number, ceiling: number) {
  if (request < 0.5 || limit <= request) return 'order'
  if (limit > Math.max(ceiling, limitKeep) + 1e-9) return 'ceiling'
  if (adviceFor(request, slot.requestGoal) !== expectedAdvice(slot.requestAdvice)) return `request ${adviceFor(request, slot.requestGoal)}`
  if (adviceFor(limit, slot.limitGoal) !== expectedAdvice(slot.limitAdvice)) return `limit ${adviceFor(limit, slot.limitGoal)}`
  if (Math.min(limit, limitKeep) < Math.max(request, requestKeep) + 0.5 - 1e-9) return 'overlap'
  return ''
}

function choosePair(slot: ResourceSlot) {
  const requestKeep = keepValue(slot.requestGoal)
  const limitKeep = keepValue(slot.limitGoal)
  const ceiling = roundHalf(Math.max(limitKeep + 1, slot.peak + 1))
  const rejected: string[] = []
  for (const requestOffset of offsetsFor(slot.requestAdvice, slot.seed)) {
    for (const limitOffset of offsetsFor(slot.limitAdvice, slot.seed + 1)) {
      const request = roundHalf(requestKeep + requestOffset)
      const limit = roundHalf(limitKeep + limitOffset)
      const reason = pairReason(slot, request, limit, requestKeep, limitKeep, ceiling)
      if (!reason) return { request, limit }
      rejected.push(`${request}/${limit} ${reason}`)
    }
  }
  throw new Error(`No rightsizing pair for ${slot.key} goal ${slot.requestGoal}/${slot.limitGoal} keep ${requestKeep}/${limitKeep} peak ${slot.peak}\n${rejected.join('\n')}`)
}

const resourceSlots: ResourceSlot[] = specs.flatMap((spec) =>
  (['cpu', 'memory'] as const).map((metric) => {
    const values = sampleMap[seriesKey(spec.workload, metric)]
    const stats: WeekStats = summarizeWeek(values)
    return {
      key: `${spec.name}:${metric}`,
      metric,
      requestAdvice: metric === 'cpu' ? spec.cpuRequest : spec.memoryRequest,
      limitAdvice: metric === 'cpu' ? spec.cpuLimit : spec.memoryLimit,
      requestGoal: requestTarget(metric, stats),
      limitGoal: limitTarget(metric, stats),
      peak: stats.peak,
      seed: metric === 'cpu' ? spec.cpuSeed : spec.memSeed,
      used: values[values.length - 1],
    }
  }),
)

const chosenResources = new Map<string, { request: number; limit: number; used: number }>()
for (const slot of resourceSlots) {
  chosenResources.set(slot.key, { ...choosePair(slot), used: slot.used })
}

const workloadResources: WorkloadResources[] = specs.map((spec) => ({
  name: spec.name,
  cpu: toAmount(chosenResources.get(`${spec.name}:cpu`)!),
  memory: toAmount(chosenResources.get(`${spec.name}:memory`)!),
}))

function toAmount(placed: { request: number; limit: number; used: number }) {
  return {
    used: placed.used,
    request: placed.request,
    limit: placed.limit,
    possible: Math.max(16, Math.ceil(placed.limit + 3)),
  }
}

export const learningProd: InfrastructureData = {
  company: {
    name: 'Kube-Learn (WRS)',
    environment: 'Learning Prod',
    region: 'us-east-1',
    environments: ['learning', 'Learning Prod'],
    regions: ['us-east-1'],
  },
  user: {
    name: 'Roei Grinshpan',
    email: 'roei.grinshpan@kube-learn.dev',
    role: 'Student',
    initials: 'RG',
  },
  notifications: [
    {
      id: 'prod-note-1',
      title: 'All 5 nodes are Ready',
      detail: 'node-1 through node-5 can run pods. node-3 is the larger server.',
      time: '8 min ago',
    },
    {
      id: 'prod-note-2',
      title: 'A week of usage is in',
      detail: 'Average, peak, P95, and P99 are ready for workload rightsizing.',
      time: '20 min ago',
    },
    {
      id: 'prod-note-3',
      title: 'Control plane is healthy',
      detail: 'API Server, etcd, Scheduler, and Controller Manager are up.',
      time: '1 hr ago',
    },
  ],
  cluster: {
    name: 'kube-learn-prod',
    status: 'Healthy',
    kubernetesVersion: '1.31',
    provider: 'Amazon EKS',
    nodes: 5,
    pods: 11,
    containers: 14,
    runningPods: 11,
    cpuUtilization: 49,
    updatedAt: '19 Oct 2026 · 16:10 UTC',
  },
  controlPlane: {
    name: 'Control Plane',
    components: [
      { id: 'scheduler', name: 'Scheduler', detail: 'kube-scheduler' },
      { id: 'api-server', name: 'API Server', detail: 'kube-apiserver' },
      { id: 'etcd', name: 'etcd', detail: 'cluster state' },
      { id: 'controller-manager', name: 'Controller Manager', detail: 'kube-controller-manager' },
    ],
  },
  nodes: [
    {
      id: 'node-1',
      name: 'node-1',
      type: 'Server',
      instanceType: 'm5.xlarge',
      status: 'Ready',
      cpuUsage: 62,
      memoryUsage: 71,
      cpuCores: 4,
      memoryGi: 16,
      containerRuntime: 'containerd',
      pods: 2,
      region: 'us-east-1',
    },
    {
      id: 'node-2',
      name: 'node-2',
      type: 'Server',
      instanceType: 'm5.xlarge',
      status: 'Ready',
      cpuUsage: 74,
      memoryUsage: 68,
      cpuCores: 4,
      memoryGi: 16,
      containerRuntime: 'containerd',
      pods: 3,
      region: 'us-east-1',
    },
    {
      id: 'node-3',
      name: 'node-3',
      type: 'Server',
      instanceType: 'm5.2xlarge',
      status: 'Ready',
      cpuUsage: 58,
      memoryUsage: 63,
      cpuCores: 8,
      memoryGi: 32,
      containerRuntime: 'containerd',
      pods: 2,
      region: 'us-east-1',
    },
    {
      id: 'node-4',
      name: 'node-4',
      type: 'Server',
      instanceType: 'm5.xlarge',
      status: 'Ready',
      cpuUsage: 41,
      memoryUsage: 49,
      cpuCores: 4,
      memoryGi: 16,
      containerRuntime: 'containerd',
      pods: 2,
      region: 'us-east-1',
    },
    {
      id: 'node-5',
      name: 'node-5',
      type: 'Server',
      instanceType: 'm5.large',
      status: 'Ready',
      cpuUsage: 77,
      memoryUsage: 81,
      cpuCores: 2,
      memoryGi: 8,
      containerRuntime: 'containerd',
      pods: 2,
      region: 'us-east-1',
    },
  ],
  workloads: [
    {
      name: 'user workload',
      namespace: 'production',
      node: 'node-1',
      pod: 'user-pod-1',
      containers: ['user', 'user-logger'],
      cpu: 34,
      memory: 48,
      status: 'Running',
      restarts: 0,
    },
    {
      name: 'checkout workload',
      namespace: 'production',
      node: 'node-1',
      pod: 'checkout-pod-1',
      containers: ['checkout'],
      cpu: 41,
      memory: 52,
      status: 'Running',
      restarts: 0,
    },
    {
      name: 'user workload',
      namespace: 'production',
      node: 'node-2',
      pod: 'user-pod-2',
      containers: ['user'],
      cpu: 38,
      memory: 44,
      status: 'Running',
      restarts: 0,
    },
    {
      name: 'feed workload',
      namespace: 'production',
      node: 'node-2',
      pod: 'feed-pod-1',
      containers: ['feed', 'feed-logger'],
      cpu: 66,
      memory: 71,
      status: 'Running',
      restarts: 1,
    },
    {
      name: 'search workload',
      namespace: 'production',
      node: 'node-2',
      pod: 'search-pod-1',
      containers: ['search'],
      cpu: 29,
      memory: 37,
      status: 'Running',
      restarts: 0,
    },
    {
      name: 'feed workload',
      namespace: 'production',
      node: 'node-3',
      pod: 'feed-pod-2',
      containers: ['feed'],
      cpu: 58,
      memory: 64,
      status: 'Running',
      restarts: 0,
    },
    {
      name: 'checkout workload',
      namespace: 'production',
      node: 'node-3',
      pod: 'checkout-pod-2',
      containers: ['checkout', 'checkout-cache'],
      cpu: 47,
      memory: 55,
      status: 'Running',
      restarts: 0,
    },
    {
      name: 'user workload',
      namespace: 'production',
      node: 'node-4',
      pod: 'user-pod-3',
      containers: ['user'],
      cpu: 31,
      memory: 40,
      status: 'Running',
      restarts: 0,
    },
    {
      name: 'search workload',
      namespace: 'production',
      node: 'node-4',
      pod: 'search-pod-2',
      containers: ['search'],
      cpu: 33,
      memory: 42,
      status: 'Running',
      restarts: 1,
    },
    {
      name: 'billing workload',
      namespace: 'production',
      node: 'node-5',
      pod: 'billing-pod-1',
      containers: ['billing'],
      cpu: 22,
      memory: 28,
      status: 'Running',
      restarts: 2,
    },
    {
      name: 'billing workload',
      namespace: 'production',
      node: 'node-5',
      pod: 'billing-pod-2',
      containers: ['billing'],
      cpu: 18,
      memory: 24,
      status: 'Running',
      restarts: 0,
    },
  ],
  workloadResources,
  workloadDay,
  usageSeries,
  usagePeriod: 'week',
  cpuHistory: [
    { time: 'Mon', usage: 46 },
    { time: 'Tue', usage: 51 },
    { time: 'Wed', usage: 58 },
    { time: 'Thu', usage: 63 },
    { time: 'Fri', usage: 61 },
    { time: 'Sat', usage: 44 },
    { time: 'Sun', usage: 49 },
  ],
  podDistribution: [
    { name: 'node-1', pods: 2 },
    { name: 'node-2', pods: 3 },
    { name: 'node-3', pods: 2 },
    { name: 'node-4', pods: 2 },
    { name: 'node-5', pods: 2 },
  ],
}
