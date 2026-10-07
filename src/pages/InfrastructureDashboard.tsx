import { useState } from 'react'
import { Box, Grid, Typography } from '@mui/material'
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

export default function InfrastructureDashboard() {
  const data = getInfrastructure()
  const [environment, setEnvironment] = useState(data.company.environment)
  const [region, setRegion] = useState(data.company.region)

  const readyNodes = data.nodes.filter((node) => node.status === 'Ready').length
  const nodesHelper =
    readyNodes === data.nodes.length ? 'All nodes ready' : `${readyNodes} of ${data.nodes.length} ready`

  const history = data.cpuHistory
  const previousCpu = history[history.length - 2]?.usage ?? data.cluster.cpuUtilization
  const cpuDelta = data.cluster.cpuUtilization - previousCpu

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
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          {data.cluster.provider} · {data.cluster.name} · Kubernetes {data.cluster.kubernetesVersion} · {region}
        </Typography>

        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
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
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <SummaryCard
              label="Nodes"
              value={String(data.cluster.nodes)}
              helper={nodesHelper}
              icon={<DnsOutlinedIcon sx={{ fontSize: 20 }} />}
              iconColor="#155EEF"
              iconBackground="#EFF4FF"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <SummaryCard
              label="Pods"
              value={String(data.cluster.pods)}
              helper={`${data.cluster.runningPods} running`}
              icon={<ViewInArIcon sx={{ fontSize: 20 }} />}
              iconColor="#6941C6"
              iconBackground="#F4F3FF"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <SummaryCard
              label="CPU utilization"
              value={`${data.cluster.cpuUtilization}%`}
              helper="vs prior sample"
              icon={<SpeedOutlinedIcon sx={{ fontSize: 20 }} />}
              iconColor="#B54708"
              iconBackground="#FFFAEB"
              trend={cpuDelta}
            />
          </Grid>

          <Grid size={{ xs: 12, lg: 8 }}>
            <WorkloadsTable workloads={data.workloads} />
          </Grid>
          <Grid size={{ xs: 12, lg: 4 }} sx={{ alignSelf: 'start' }}>
            <PodDistributionChart distribution={data.podDistribution} />
          </Grid>

          <Grid size={12}>
            <CpuUsageChart history={data.cpuHistory} />
          </Grid>

          <Grid size={12}>
            <InfrastructureTopology
              cluster={data.cluster}
              region={region}
              nodes={data.nodes}
              workloads={data.workloads}
            />
          </Grid>
        </Grid>

        <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 2.5 }}>
          Snapshot loaded from local mock data for {data.company.name}. Updated {data.cluster.updatedAt}.
        </Typography>
      </Box>
    </Box>
  )
}
