import { useState } from 'react'
import { Box, Breadcrumbs, Chip, Stack, Typography } from '@mui/material'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import DnsOutlinedIcon from '@mui/icons-material/DnsOutlined'
import SpeedOutlinedIcon from '@mui/icons-material/SpeedOutlined'
import ViewInArIcon from '@mui/icons-material/ViewInAr'
import { getInfrastructure } from '../api/getInfrastructure.ts'
import RightsizingIntro from '../components/RightsizingIntro.tsx'
import WorkloadResourcesCard from '../components/WorkloadResourcesCard.tsx'
import WorkloadUsageChart from '../components/WorkloadUsageChart.tsx'
import DashboardHeader from '../components/DashboardHeader.tsx'
import InfrastructureTopology from '../components/InfrastructureTopology.tsx'
import PodDistributionChart from '../components/PodDistributionChart.tsx'
import SummaryCard from '../components/SummaryCard.tsx'
import WorkloadsTable from '../components/WorkloadsTable.tsx'
import { colors } from '../colors.ts'
import { nextResourceValue } from '../utils/adjustResource.ts'
import { titleCase } from '../utils/format.ts'

export default function InfrastructureDashboard() {
  const data = getInfrastructure()
  const [environment, setEnvironment] = useState(data.company.environment)
  const [region, setRegion] = useState(data.company.region)
  const [resources, setResources] = useState(() => copyResources(data.workloadResources))

  function adjustResource(name: string, metric: 'cpu' | 'memory', field: 'request' | 'limit', direction: 'raise' | 'lower') {
    setResources((current) =>
      current.map((item) => {
        if (item.name !== name) return item
        const next = nextResourceValue(current, name, metric, field, direction)
        if (next === null) return item
        return { ...item, [metric]: { ...item[metric], [field]: next } }
      }),
    )
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
        onEnvironmentChange={setEnvironment}
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
                  production runs on every node. stage runs on node-1 and node-2.
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
            <WorkloadsTable workloads={data.workloads} resources={resources} />
            <PodDistributionChart workloads={data.workloads} nodes={data.nodes.map((node) => node.name)} />
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
                  CPU and memory per workload
                </Typography>
                <Typography sx={{ color: 'text.secondary', fontSize: { xs: 12, sm: 14 }, lineHeight: 1.15 }}>
                  Actual use across the day. Straight lines are request and limit.
                </Typography>
              </Box>
            </Box>
            <Box
              sx={{
                display: 'grid',
                gap: 2.5,
                alignItems: 'stretch',
                gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 9fr) minmax(280px, 3fr)' },
              }}
            >
              <Box sx={{ minWidth: 0, height: '100%', order: { xs: 2, lg: 1 } }}>
                <WorkloadUsageChart history={data.workloadDay} resources={resources} />
              </Box>
              <Box sx={{ minWidth: 0, height: '100%', order: { xs: 1, lg: 2 } }}>
                <WorkloadResourcesCard resources={resources} onAdjust={adjustResource} onReset={() => setResources(copyResources(data.workloadResources))} />
              </Box>
            </Box>
          </Stack>

          <InfrastructureTopology
            cluster={data.cluster}
            region={region}
            nodes={data.nodes}
            workloads={data.workloads}
          />

          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Practice snapshot for {data.company.name}. Two workloads, three nodes, six pods, eight containers. user-pod-1 and feed-pod-1 each run two containers. This dashboard is not connected to a live cluster.
          </Typography>
        </Stack>
      </Box>
    </Box>
  )
}

function copyResources(items: import('../types/infrastructure.ts').WorkloadResources[]) {
  return items.map((item) => ({
    name: item.name,
    cpu: { ...item.cpu },
    memory: { ...item.memory },
  }))
}
