import { Avatar, Box, Card, Chip, Stack, Typography } from '@mui/material'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import CloudOutlinedIcon from '@mui/icons-material/CloudOutlined'
import DnsOutlinedIcon from '@mui/icons-material/DnsOutlined'
import HubOutlinedIcon from '@mui/icons-material/HubOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import ViewInArIcon from '@mui/icons-material/ViewInAr'
import type { Cluster, ClusterNode, Workload } from '../types/infrastructure.ts'
import StatusChip from './StatusChip.tsx'
import UsageMeter from './UsageMeter.tsx'

type InfrastructureTopologyProps = {
  cluster: Cluster
  region: string
  nodes: ClusterNode[]
  workloads: Workload[]
}

const layers = ['AWS Cloud', 'Cluster', 'Node', 'Pod', 'Container']

export default function InfrastructureTopology({
  cluster,
  region,
  nodes,
  workloads,
}: InfrastructureTopologyProps) {
  return (
    <Card id="infrastructure-topology">
      <Box sx={{ px: 2.5, pt: 2, pb: 2 }}>
        <Typography sx={{ fontSize: 15, fontWeight: 600 }}>Infrastructure Topology</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25, maxWidth: 720 }}>
          A node is a server in the cluster. Kubernetes schedules pods onto nodes, and each pod runs the container for an application.
        </Typography>
        <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center', mt: 1.5 }}>
          {layers.map((layer, index) => (
            <Stack key={layer} direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
              <Chip
                size="small"
                label={layer}
                sx={{ bgcolor: index === 0 ? '#EFF4FF' : '#F8FAFC', color: 'text.primary', border: '1px solid #E4E7EC' }}
              />
              {index < layers.length - 1 ? (
                <ArrowDownwardIcon sx={{ fontSize: 14, color: '#98A2B3', transform: 'rotate(-90deg)' }} />
              ) : null}
            </Stack>
          ))}
        </Stack>
      </Box>

      <Stack spacing={0} sx={{ px: { xs: 2, md: 3 }, pb: 3, alignItems: 'center' }}>
        <LayerLabel>Cloud</LayerLabel>
        <Box
          sx={{
            width: '100%',
            maxWidth: 640,
            border: '1px solid #D6E4FF',
            bgcolor: '#F5F8FF',
            borderRadius: 2,
            px: 2,
            py: 1.5,
          }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Avatar sx={{ bgcolor: '#fff', color: 'primary.main', border: '1px solid #D6E4FF' }}>
              <CloudOutlinedIcon />
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Cloud provider
              </Typography>
              <Typography sx={{ fontWeight: 700 }}>AWS Cloud</Typography>
            </Box>
            <Chip size="small" label={region} sx={{ bgcolor: '#fff' }} />
          </Stack>
        </Box>

        <DownArrow />
        <LayerLabel>Kubernetes cluster</LayerLabel>
        <Box
          sx={{
            width: '100%',
            maxWidth: 640,
            border: '1px solid #E4E7EC',
            borderLeft: '3px solid #155EEF',
            bgcolor: '#fff',
            borderRadius: 2,
            px: 2,
            py: 1.5,
          }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
            <Avatar sx={{ bgcolor: '#EFF4FF', color: 'primary.main' }}>
              <HubOutlinedIcon />
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {cluster.provider}
              </Typography>
              <Typography sx={{ fontWeight: 700 }}>{cluster.name}</Typography>
              <Stack direction="row" useFlexGap spacing={0.75} sx={{ flexWrap: 'wrap', mt: 1 }}>
                <StatusChip status={cluster.status} />
                <MetaChip label={`v${cluster.kubernetesVersion}`} />
                <MetaChip label={`${cluster.nodes} nodes`} />
                <MetaChip label={`${cluster.pods} pods`} />
                <MetaChip label={`${cluster.containers} containers`} />
              </Stack>
            </Box>
          </Stack>
        </Box>

        <DownArrow />
        <LayerLabel>Nodes schedule pods</LayerLabel>

        <Box
          sx={{
            width: '100%',
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', lg: '1fr 1fr 1fr' },
          }}
        >
          {nodes.map((node) => {
            const nodeWorkloads = workloads.filter((workload) => workload.node === node.name)
            const additionalPods = Math.max(node.pods - nodeWorkloads.length, 0)

            return (
              <Box
                key={node.id}
                sx={{
                  border: '1px solid #E4E7EC',
                  borderRadius: 2,
                  overflow: 'hidden',
                  bgcolor: '#fff',
                }}
              >
                <Box sx={{ px: 1.75, py: 1.5, bgcolor: '#F8FAFC', borderBottom: '1px solid #EEF2F6' }}>
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
                          {node.type} · {node.instanceType} · {node.region}
                        </Typography>
                      </Box>
                    </Stack>
                    <StatusChip status={node.status} />
                  </Stack>
                  <Stack direction="row" spacing={1.5} sx={{ mt: 1.5 }}>
                    <UsageMeter label="CPU" value={node.cpuUsage} />
                    <UsageMeter label="Memory" value={node.memoryUsage} />
                  </Stack>
                  <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 1 }}>
                    {node.pods} pods scheduled on this node
                  </Typography>
                </Box>

                <Stack spacing={1} sx={{ p: 1.5 }}>
                  {nodeWorkloads.map((workload) => (
                    <Box
                      key={workload.pod}
                      sx={{
                        border: '1px solid #E4E7EC',
                        borderRadius: 1.5,
                        p: 1.25,
                        bgcolor: '#FCFCFD',
                      }}
                    >
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                        <ViewInArIcon sx={{ fontSize: 16, color: 'primary.main', mt: 0.25 }} />
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', lineHeight: 1.2 }}>
                            Pod · {workload.namespace}
                          </Typography>
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
                        </Box>
                        <StatusChip status={workload.status} />
                      </Stack>
                      <Box sx={{ ml: 0.75, mt: 1, pl: 1.25, borderLeft: '2px solid #D0D5DD' }}>
                        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                          <Inventory2OutlinedIcon sx={{ fontSize: 15, color: '#667085' }} />
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            Container
                          </Typography>
                          <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{workload.container}</Typography>
                        </Stack>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
                          Application · {workload.name}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                  {additionalPods > 0 ? (
                    <Typography variant="caption" sx={{ color: 'text.secondary', px: 0.5 }}>
                      +{additionalPods} additional pods on this node
                    </Typography>
                  ) : null}
                </Stack>
              </Box>
            )
          })}
        </Box>
      </Stack>
    </Card>
  )
}

function LayerLabel({ children }: { children: string }) {
  return (
    <Typography
      variant="caption"
      sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 0.6, mb: 0.75 }}
    >
      {children.toUpperCase()}
    </Typography>
  )
}

function DownArrow() {
  return (
    <Stack sx={{ alignItems: 'center', color: '#98A2B3', py: 0.75 }}>
      <Box sx={{ width: 2, height: 18, bgcolor: '#D0D5DD' }} />
      <ArrowDownwardIcon sx={{ fontSize: 16, mt: -0.25 }} />
    </Stack>
  )
}

function MetaChip({ label }: { label: string }) {
  return <Chip size="small" label={label} sx={{ bgcolor: '#F8FAFC', border: '1px solid #E4E7EC' }} />
}
