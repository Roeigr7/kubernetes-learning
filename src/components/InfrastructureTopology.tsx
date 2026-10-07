import { Avatar, Box, Card, CardContent, Chip, Divider, Grid, Paper, Stack, Tooltip, Typography } from '@mui/material'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import CloudOutlinedIcon from '@mui/icons-material/CloudOutlined'
import DnsOutlinedIcon from '@mui/icons-material/DnsOutlined'
import HubOutlinedIcon from '@mui/icons-material/HubOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import type { Cluster, ClusterNode, Workload } from '../types/infrastructure.ts'
import StatusChip from './StatusChip.tsx'

type InfrastructureTopologyProps = {
  cluster: Cluster
  region: string
  nodes: ClusterNode[]
  workloads: Workload[]
}

export default function InfrastructureTopology({
  cluster,
  region,
  nodes,
  workloads,
}: InfrastructureTopologyProps) {
  return (
    <Card id="infrastructure-topology">
      <CardContent sx={{ p: { xs: 2, md: 2.5 }, '&:last-child': { pb: { xs: 2, md: 2.5 } } }}>
        <Typography sx={{ fontSize: 15, fontWeight: 600 }}>Infrastructure Topology</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, maxWidth: 760 }}>
          AWS runs the Kubernetes cluster. The cluster places pods on nodes. Each pod runs a container, and that container is the application.
        </Typography>

        <Stack sx={{ alignItems: 'center', mt: 3 }}>
          <Paper
            variant="outlined"
            sx={{
              width: '100%',
              maxWidth: 560,
              px: 2,
              py: 1.5,
              borderColor: '#D6E4FF',
              bgcolor: '#F5F8FF',
            }}
          >
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Avatar sx={{ bgcolor: '#fff', color: 'primary.main', border: '1px solid #D6E4FF' }}>
                <CloudOutlinedIcon />
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Cloud
                </Typography>
                <Typography sx={{ fontWeight: 700 }}>AWS Cloud</Typography>
              </Box>
              <Chip size="small" label={region} sx={{ bgcolor: '#fff' }} />
            </Stack>
          </Paper>

          <Connector />

          <Paper
            variant="outlined"
            sx={{
              width: '100%',
              maxWidth: 560,
              px: 2,
              py: 1.5,
              borderLeft: '3px solid',
              borderLeftColor: 'primary.main',
            }}
          >
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
              <Avatar sx={{ bgcolor: '#EFF4FF', color: 'primary.main' }}>
                <HubOutlinedIcon />
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Kubernetes cluster · {cluster.provider}
                </Typography>
                <Typography sx={{ fontWeight: 700 }}>{cluster.name}</Typography>
                <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap', mt: 1 }}>
                  <StatusChip status={cluster.status} />
                  <Chip size="small" variant="outlined" label={`v${cluster.kubernetesVersion}`} />
                  <Chip size="small" variant="outlined" label={`${cluster.nodes} nodes`} />
                  <Chip size="small" variant="outlined" label={`${cluster.pods} pods`} />
                  <Chip size="small" variant="outlined" label={`${cluster.containers} containers`} />
                </Stack>
              </Box>
            </Stack>
          </Paper>

          <Connector />
        </Stack>

        <Divider sx={{ mb: 2.5 }}>
          <Chip size="small" label="Nodes" sx={{ bgcolor: '#F8FAFC' }} />
        </Divider>

        <Grid container spacing={2}>
          {nodes.map((node) => {
            const nodeWorkloads = workloads.filter((workload) => workload.node === node.name)
            const additionalPods = Math.max(node.pods - nodeWorkloads.length, 0)

            return (
              <Grid key={node.id} size={{ xs: 12, md: 6, lg: 4 }}>
                <Card variant="outlined" sx={{ height: '100%', boxShadow: 'none' }}>
                  <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: '#EFF4FF', color: 'primary.main' }}>
                          <DnsOutlinedIcon sx={{ fontSize: 18 }} />
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontSize: 13, fontWeight: 700 }} noWrap>
                            {node.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {node.type} server · {node.region}
                          </Typography>
                        </Box>
                      </Stack>
                      <StatusChip status={node.status} />
                    </Stack>

                    <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 1.25 }}>
                      {node.pods} pods on this node
                    </Typography>

                    <Stack spacing={1.25} sx={{ mt: 1.5 }}>
                      {nodeWorkloads.map((workload) => (
                        <Paper key={workload.pod} variant="outlined" sx={{ p: 1.25, bgcolor: '#FCFCFD' }}>
                          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                            <Chip size="small" label="Pod" variant="outlined" color="primary" />
                            <Tooltip title={workload.pod}>
                              <Typography
                                noWrap
                                sx={{
                                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                                  fontSize: 12,
                                  fontWeight: 600,
                                }}
                              >
                                {workload.pod}
                              </Typography>
                            </Tooltip>
                            <Box sx={{ flex: 1 }} />
                            <StatusChip status={workload.status} />
                          </Stack>

                          <Stack direction="row" spacing={1} sx={{ alignItems: 'stretch', mt: 1, ml: 0.5 }}>
                            <Box
                              sx={{
                                width: 14,
                                borderLeft: '2px solid #D0D5DD',
                                borderBottom: '2px solid #D0D5DD',
                                borderBottomLeftRadius: 6,
                                mb: 1.5,
                                flexShrink: 0,
                              }}
                            />
                            <Paper variant="outlined" sx={{ flex: 1, p: 1, bgcolor: '#fff' }}>
                              <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                                <Inventory2OutlinedIcon sx={{ fontSize: 15, color: '#667085' }} />
                                <Chip size="small" label="Container" sx={{ bgcolor: '#F2F4F7' }} />
                                <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{workload.container}</Typography>
                              </Stack>
                              <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 0.5 }}>
                                Application · {workload.name}
                              </Typography>
                            </Paper>
                          </Stack>
                        </Paper>
                      ))}
                    </Stack>

                    {additionalPods > 0 ? (
                      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 1.25 }}>
                        +{additionalPods} additional pods
                      </Typography>
                    ) : null}
                  </CardContent>
                </Card>
              </Grid>
            )
          })}
        </Grid>
      </CardContent>
    </Card>
  )
}

function Connector() {
  return (
    <Stack sx={{ alignItems: 'center', color: '#98A2B3', py: 0.5 }}>
      <Box sx={{ width: 2, height: 18, bgcolor: '#D0D5DD' }} />
      <ArrowDownwardIcon sx={{ fontSize: 16, mt: -0.25 }} />
    </Stack>
  )
}
