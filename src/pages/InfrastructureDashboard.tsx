import { useMemo, useState } from 'react'
import { Box, Breadcrumbs, Chip, MenuItem, Select, Stack, Typography } from '@mui/material'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import DnsOutlinedIcon from '@mui/icons-material/DnsOutlined'
import SpeedOutlinedIcon from '@mui/icons-material/SpeedOutlined'
import ViewInArIcon from '@mui/icons-material/ViewInAr'
import { getInfrastructure } from '../api/getInfrastructure.ts'
import { buildContainerRightsizing } from '../data/containerRightsizing.ts'
import RightsizingIntro from '../components/RightsizingIntro.tsx'
import WorkloadResourcesCard from '../components/WorkloadResourcesCard.tsx'
import WorkloadUsageChart, { defaultUsageSeries } from '../components/WorkloadUsageChart.tsx'
import DashboardHeader from '../components/DashboardHeader.tsx'
import InfrastructureTopology from '../components/InfrastructureTopology.tsx'
import PodDistributionChart from '../components/PodDistributionChart.tsx'
import SummaryCard from '../components/SummaryCard.tsx'
import WorkloadsTable from '../components/WorkloadsTable.tsx'
import { colors } from '../colors.ts'
import { nextResourceValue } from '../utils/adjustResource.ts'
import { titleCase } from '../utils/format.ts'
import { summarizeWeek, type WeekStats } from '../utils/rightsizing.ts'
import type { UsageSeries, WorkloadHour } from '../types/infrastructure.ts'

export default function InfrastructureDashboard() {
  const [environment, setEnvironment] = useState(() => getInfrastructure().company.environment)
  const data = getInfrastructure(environment)
  const [region, setRegion] = useState(data.company.region)
  const [resources, setResources] = useState(() => copyResources(getInfrastructure().workloadResources))
  const [containerResources, setContainerResources] = useState(() => copyResources(buildContainerRightsizing(getInfrastructure()).resources))
  const [workload, setWorkload] = useState('user')
  const [container, setContainer] = useState('workload')
  const learningProd = environment === 'Learning Prod'
  const containerView = useMemo(() => buildContainerRightsizing(getInfrastructure(environment)), [environment])
  const workloadIds = resources.map((item) => item.name.replace(/ workload$/, ''))
  const containerIds = containerView.containersByWorkload[workload] ?? []
  const containerMode = container !== 'workload' && containerIds.includes(container)
  const activeResources = containerMode ? containerResources : resources
  const activeId = containerMode ? container : workload
  const activeHistory = containerMode ? containerView.history : data.workloadDay
  const activeSeries = containerMode ? containerView.series : data.usageSeries

  function adjustResource(name: string, metric: 'cpu' | 'memory', field: 'request' | 'limit', direction: 'raise' | 'lower') {
    const update = (current: typeof resources) =>
      current.map((item) => {
        if (item.name !== name) return item
        const next = nextResourceValue(current, name, metric, field, direction)
        if (next === null) return item
        return { ...item, [metric]: { ...item[metric], [field]: next } }
      })
    if (containerMode) setContainerResources(update)
    else setResources(update)
  }

  const readyNodes = data.nodes.filter((node) => node.status === 'Ready').length
  const nodesHelper =
    readyNodes === data.nodes.length ? 'All nodes ready' : `${readyNodes} of ${data.nodes.length} ready`

  const history = data.cpuHistory
  const currentCpu = history[history.length - 1]?.usage ?? data.cluster.cpuUtilization
  const previousCpu = history[history.length - 2]?.usage ?? currentCpu
  const cpuDelta = currentCpu - previousCpu

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', overflowX: 'clip' }}>
      <RightsizingIntro />
      <DashboardHeader
        company={data.company}
        user={data.user}
        notifications={data.notifications}
        environment={environment}
        region={region}
        onEnvironmentChange={(next) => {
          const nextData = getInfrastructure(next)
          const nextResources = copyResources(nextData.workloadResources)
          setEnvironment(next)
          setResources(nextResources)
          setContainerResources(copyResources(buildContainerRightsizing(nextData).resources))
          setContainer('workload')
          setWorkload(nextResources.some((item) => item.name.startsWith('user')) ? 'user' : nextResources[0]?.name.replace(/ workload$/, '') ?? 'user')
        }}
        onRegionChange={setRegion}
      />

      <Box sx={{ maxWidth: 1440, mx: 'auto', px: { xs: 2, md: 3 }, py: 3, minWidth: 0 }}>
        <Stack spacing={2.5}>
          <Stack spacing={0.75}>
            <Breadcrumbs aria-label="Infrastructure path" sx={{ '& .MuiTypography-root': { fontSize: 13 } }}>
              <Typography sx={{ color: 'text.secondary' }}>AWS Cloud</Typography>
              <Typography sx={{ color: 'text.secondary' }}>Kubernetes</Typography>
              <Typography sx={{ color: 'text.primary', fontWeight: 600 }}>{data.cluster.name}</Typography>
            </Breadcrumbs>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              sx={{ justifyContent: 'space-between', alignItems: { sm: 'flex-end' } }}
            >
              <Box>
                <Typography sx={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.3 }}>Kube-Learn (WRS)</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25, maxWidth: 760 }}>
                  {learningProd
                    ? 'Learning Prod runs user, feed, checkout, search, and billing across five nodes.'
                    : 'production runs on every node. stage runs on node-1 and node-2.'}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                  {data.cluster.provider} {data.cluster.kubernetesVersion} · {region}
                </Typography>
              </Box>
              <Chip
                size="small"
                label={titleCase(environment)}
                sx={{ alignSelf: { xs: 'flex-start', sm: 'center' }, bgcolor: colors.healthyBg, color: colors.healthy, border: '1px solid', borderColor: colors.healthyBorder }}
              />
            </Stack>
          </Stack>

          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'minmax(0, 1fr) minmax(0, 1fr)', lg: 'repeat(4, minmax(0, 1fr))' },
            }}
          >
            <SummaryCard
              label="Cluster status"
              value={data.cluster.status}
              helper={`Kubernetes ${data.cluster.kubernetesVersion}`}
              icon={<CheckCircleOutlinedIcon sx={{ fontSize: 20 }} />}
              iconColor={colors.healthy}
              iconBackground={colors.healthyBg}
              accent={colors.healthy}
              statusDot={colors.healthy}
              hint="מצב הבריאות של הקלאסטר"
            />
            <SummaryCard
              label="Nodes"
              value={String(data.cluster.nodes)}
              helper={nodesHelper}
              icon={<DnsOutlinedIcon sx={{ fontSize: 20 }} />}
              iconColor={colors.blue}
              iconBackground="#EFF6FF"
              hint="כמה שרתים יש בקלאסטר"
            />
            <SummaryCard
              label="Pods"
              value={String(data.cluster.pods)}
              helper={`${data.cluster.runningPods} running · ${data.cluster.containers} containers`}
              icon={<ViewInArIcon sx={{ fontSize: 20 }} />}
              iconColor={colors.navy}
              iconBackground={colors.paperMuted}
              hint="כמה pods רצים בקלאסטר"
            />
            <SummaryCard
              label="CPU utilization"
              value={`${currentCpu}%`}
              helper="vs prior sample"
              icon={<SpeedOutlinedIcon sx={{ fontSize: 20 }} />}
              iconColor={colors.warning}
              iconBackground={colors.warningBg}
              trend={cpuDelta}
              hint="אחוז השימוש ב-CPU של הקלאסטר"
            />
          </Box>

          <Box
            sx={{
              display: 'grid',
              gap: 2.5,
              alignItems: 'stretch',
              gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 2fr) minmax(280px, 1fr)' },
            }}
          >
            <WorkloadsTable key={`workloads-${environment}`} workloads={data.workloads} resources={containerResources} />
            <PodDistributionChart key={`pods-${environment}`} workloads={data.workloads} nodes={data.nodes.map((node) => node.name)} />
          </Box>

          <Stack spacing={1.5}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'stretch',
                columnGap: 2.5,
                rowGap: 1,
                flexWrap: 'wrap',
                minWidth: 0,
                '&&': { marginBlock: '8px' },
              }}
            >
              <Typography
                sx={{
                  flex: '0 0 auto',
                  fontSize: '32px',
                  marginTop: '-7px',
                  fontWeight: 700,
                  letterSpacing: -0.4,
                  lineHeight: 1.15,
                }}
              >
                Workload Rightsizing
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  flex: '1 1 420px',
                  minWidth: 0,
                }}
              >
                <Typography sx={{ fontSize: { xs: 13, sm: 15 }, fontWeight: 600, lineHeight: 1.15 }}>
                  {containerMode ? 'CPU and memory per container' : 'CPU and memory per workload'}
                </Typography>
                <Typography sx={{ color: 'text.secondary', fontSize: { xs: 12, sm: 14 }, lineHeight: 1.15 }}>
                  {learningProd
                    ? 'Measured across the last week. Average, peak, P95, and P99 are the rightsizing readings.'
                    : 'Measured across the day. Average, peak, P95, and P99 are the rightsizing readings.'}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} useFlexGap sx={{ alignSelf: 'center', ml: { sm: 'auto' }, flexWrap: 'wrap' }}>
                <Select
                  size="small"
                  value={workloadIds.includes(workload) ? workload : workloadIds[0]}
                  onChange={(event) => {
                    setWorkload(event.target.value)
                    setContainer('workload')
                  }}
                  aria-label="Workload rightsizing filter"
                  sx={{ minWidth: 140 }}
                >
                  {workloadIds.map((id) => (
                    <MenuItem key={id} value={id}>
                      {labelFor(id)}
                    </MenuItem>
                  ))}
                </Select>
                <Select
                  size="small"
                  value={containerMode ? container : 'workload'}
                  onChange={(event) => setContainer(event.target.value)}
                  aria-label="Container rightsizing filter"
                  sx={{ minWidth: 160 }}
                >
                  <MenuItem value="workload">Workload</MenuItem>
                  {containerIds.map((id) => (
                    <MenuItem key={id} value={id}>
                      {labelFor(id)}
                    </MenuItem>
                  ))}
                </Select>
              </Stack>
            </Box>
            <Box
              sx={{
                display: 'grid',
                gap: 2.5,
                alignItems: 'stretch',
                gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 2fr) minmax(280px, 1fr)' },
              }}
            >
              <Box sx={{ minWidth: 0, height: '100%', order: { xs: 2, lg: 1 } }}>
                <WorkloadUsageChart
                  key={`usage-${environment}-${containerMode ? container : 'workload'}`}
                  history={activeHistory}
                  resources={activeResources}
                  workload={activeId}
                  period={data.usagePeriod}
                  series={activeSeries}
                />
              </Box>
              <Box sx={{ minWidth: 0, height: '100%', order: { xs: 1, lg: 2 } }}>
                <WorkloadResourcesCard
                  key={`resources-${environment}-${containerMode ? container : 'workload'}`}
                  resources={activeResources}
                  workload={activeId}
                  period={data.usagePeriod ?? 'day'}
                  readings={weekReadings(activeHistory, activeSeries ?? defaultUsageSeries)}
                  onAdjust={adjustResource}
                  onReset={() => {
                    if (containerMode) setContainerResources(copyResources(buildContainerRightsizing(data).resources))
                    else setResources(copyResources(data.workloadResources))
                  }}
                />
              </Box>
            </Box>
          </Stack>

          <InfrastructureTopology
            cluster={data.cluster}
            region={region}
            nodes={data.nodes}
            workloads={data.workloads}
            controlPlane={data.controlPlane}
          />

          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {learningProd
              ? `Practice snapshot for ${data.company.name}. Learning Prod has five workloads, five nodes, eleven pods, and fourteen containers. Usage is a week of samples. This dashboard is not connected to a live cluster.`
              : `Practice snapshot for ${data.company.name}. Two workloads, three nodes, six pods, eight containers. user-pod-1 and feed-pod-1 each run two containers. This dashboard is not connected to a live cluster.`}
          </Typography>
        </Stack>
      </Box>
    </Box>
  )
}

function labelFor(id: string) {
  return id.charAt(0).toUpperCase() + id.slice(1)
}

function weekReadings(history: WorkloadHour[], series: UsageSeries[]) {
  const readings: Record<string, { cpu: WeekStats; memory: WeekStats }> = {}
  for (const item of series) {
    const values = history.map((point) => {
      const value = point[item.key]
      return typeof value === 'number' ? value : 0
    })
    const current = readings[item.workload] ?? { cpu: emptyReading(), memory: emptyReading() }
    current[item.metric] = summarizeWeek(values)
    readings[item.workload] = current
  }
  return readings
}

function emptyReading(): WeekStats {
  return { average: 0, peak: 0, p95: 0, p99: 0 }
}

function copyResources(items: import('../types/infrastructure.ts').WorkloadResources[]) {
  return items.map((item) => ({
    name: item.name,
    cpu: { ...item.cpu },
    memory: { ...item.memory },
  }))
}
