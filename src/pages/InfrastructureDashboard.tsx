import { useState } from 'react'
import { Box, Breadcrumbs, Chip, Stack, Typography } from '@mui/material'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import DnsOutlinedIcon from '@mui/icons-material/DnsOutlined'
import SpeedOutlinedIcon from '@mui/icons-material/SpeedOutlined'
import ViewInArIcon from '@mui/icons-material/ViewInAr'
import { getInfrastructure } from '../api/getInfrastructure.ts'
import CpuUsageChart from '../components/CpuUsageChart.tsx'
import DashboardHeader from '../components/DashboardHeader.tsx'
import InfrastructureTopology from '../components/InfrastructureTopology.tsx'
import PodDistributionChart from '../components/PodDistributionChart.tsx'
import SummaryCard from '../components/SummaryCard.tsx'
import WorkloadsTable from '../components/WorkloadsTable.tsx'
import { titleCase } from '../utils/format.ts'

export default function InfrastructureDashboard() {
  const data = getInfrastructure()
  const [environment, setEnvironment] = useState(data.company.environment)
  const [region, setRegion] = useState(data.company.region)

  const readyNodes = data.nodes.filter((node) => node.status === 'Ready').length
  const nodesHelper =
    readyNodes === data.nodes.length ? 'All nodes ready' : `${readyNodes} of ${data.nodes.length} ready`

  const history = data.cpuHistory
  const currentCpu = history[history.length - 1]?.usage ?? data.cluster.cpuUtilization
  const previousCpu = history[history.length - 2]?.usage ?? currentCpu
  const cpuDelta = currentCpu - previousCpu

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <DashboardHeader
        company={data.company}
        user={data.user}
        notifications={data.notifications}
        environment={environment}
        region={region}
        onEnvironmentChange={setEnvironment}
        onRegionChange={setRegion}
      />

      <Box sx={{ maxWidth: 1440, mx: 'auto', px: { xs: 2, md: 3 }, py: 3 }}>
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
                <Typography sx={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.3 }}>Infrastructure</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
                  {data.cluster.provider} · Kubernetes {data.cluster.kubernetesVersion} · {region} · Updated {data.cluster.updatedAt}
                </Typography>
              </Box>
              <Chip
                size="small"
                label={titleCase(environment)}
                sx={{ alignSelf: { xs: 'flex-start', sm: 'center' }, bgcolor: '#ECFDF3', color: '#067647', border: '1px solid #ABEFC6' }}
              />
            </Stack>
          </Stack>

          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' },
            }}
          >
            <SummaryCard
              label="Cluster status"
              value={data.cluster.status}
              helper={`Kubernetes ${data.cluster.kubernetesVersion}`}
              icon={<CheckCircleOutlinedIcon sx={{ fontSize: 20 }} />}
              iconColor="#067647"
              iconBackground="#ECFDF3"
              accent="#12B76A"
              statusDot="#12B76A"
            />
            <SummaryCard
              label="Nodes"
              value={String(data.cluster.nodes)}
              helper={nodesHelper}
              icon={<DnsOutlinedIcon sx={{ fontSize: 20 }} />}
              iconColor="#155EEF"
              iconBackground="#EFF4FF"
            />
            <SummaryCard
              label="Pods"
              value={String(data.cluster.pods)}
              helper={`${data.cluster.runningPods} running`}
              icon={<ViewInArIcon sx={{ fontSize: 20 }} />}
              iconColor="#6941C6"
              iconBackground="#F4F3FF"
            />
            <SummaryCard
              label="CPU utilization"
              value={`${currentCpu}%`}
              helper="vs prior sample"
              icon={<SpeedOutlinedIcon sx={{ fontSize: 20 }} />}
              iconColor="#B54708"
              iconBackground="#FFFAEB"
              trend={cpuDelta}
            />
          </Box>

          <Box
            sx={{
              display: 'grid',
              gap: 2.5,
              alignItems: 'start',
              gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 2fr) minmax(300px, 1fr)' },
            }}
          >
            <WorkloadsTable workloads={data.workloads} />
            <PodDistributionChart distribution={data.podDistribution} />
          </Box>

          <CpuUsageChart history={data.cpuHistory} />

          <InfrastructureTopology
            cluster={data.cluster}
            region={region}
            nodes={data.nodes}
            workloads={data.workloads}
          />

          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Snapshot loaded from local mock data for {data.company.name}. This dashboard is not connected to a live cluster.
          </Typography>
        </Stack>
      </Box>
    </Box>
  )
}
