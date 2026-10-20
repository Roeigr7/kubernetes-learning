export type NodeStatus = 'Ready' | 'NotReady'

export type WorkloadStatus = 'Running' | 'Pending' | 'CrashLoopBackOff' | 'Succeeded'

export interface Company {
  name: string
  environment: string
  region: string
  environments: string[]
  regions: string[]
}

export interface DashboardUser {
  name: string
  email: string
  role: string
  initials: string
}

export interface NotificationItem {
  id: string
  title: string
  detail: string
  time: string
}

export interface Cluster {
  name: string
  status: string
  kubernetesVersion: string
  provider: string
  nodes: number
  pods: number
  containers: number
  runningPods: number
  cpuUtilization: number
  updatedAt: string
}

export interface ClusterNode {
  id: string
  name: string
  type: string
  instanceType: string
  status: NodeStatus
  cpuUsage: number
  memoryUsage: number
  cpuCores?: number
  memoryGi?: number
  containerRuntime?: string
  pods: number
  region: string
}

export interface Workload {
  name: string
  namespace: string
  node: string
  pod: string
  containers: string[]
  cpu: number
  memory: number
  status: WorkloadStatus
  restarts: number
}

export interface WorkloadAmount {
  used: number
  request: number
  limit: number
  possible: number
}

export interface WorkloadResources {
  name: string
  cpu: WorkloadAmount
  memory: WorkloadAmount
}

export interface WorkloadHour {
  time: string
  userCpu: number
  userMemory: number
  feedCpu: number
  feedMemory: number
  [key: string]: string | number
}

export interface UsageSeries {
  key: string
  name: string
  color: string
  workload: string
  metric: 'cpu' | 'memory'
}

export type UsagePeriod = 'day' | 'week'

export interface ControlPlaneComponent {
  id: string
  name: string
  detail: string
}

export interface ControlPlane {
  name: string
  components: ControlPlaneComponent[]
}

export interface CpuSample {
  time: string
  usage: number
}

export interface PodDistributionItem {
  name: string
  pods: number
}

export interface InfrastructureData {
  company: Company
  user: DashboardUser
  notifications: NotificationItem[]
  cluster: Cluster
  nodes: ClusterNode[]
  workloads: Workload[]
  workloadResources: WorkloadResources[]
  workloadDay: WorkloadHour[]
  usageSeries?: UsageSeries[]
  usagePeriod?: UsagePeriod
  controlPlane?: ControlPlane
  cpuHistory: CpuSample[]
  podDistribution: PodDistributionItem[]
}
