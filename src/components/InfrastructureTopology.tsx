import { Box, Card, Stack, Typography } from '@mui/material'
import CloudOutlinedIcon from '@mui/icons-material/CloudOutlined'
import DnsOutlinedIcon from '@mui/icons-material/DnsOutlined'
import HubOutlinedIcon from '@mui/icons-material/HubOutlined'
import AppsOutlinedIcon from '@mui/icons-material/AppsOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined'
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined'
import ViewInArIcon from '@mui/icons-material/ViewInAr'
import type { ReactElement, ReactNode } from 'react'
import { colors } from '../colors.ts'
import AppTooltip from './AppTooltip.tsx'
import type { Cluster, ClusterNode, Workload } from '../types/infrastructure.ts'
import StatusChip from './StatusChip.tsx'

type InfrastructureTopologyProps = {
  cluster: Cluster
  region: string
  nodes: ClusterNode[]
  workloads: Workload[]
}

const connector = '#93C5FD'

const workloadTones = {
  user: {
    color: colors.userWorkload,
    border: '#FDBA74',
    bg: '#FFF7ED',
    hint: 'אפליקציית המשתמשים. רצה ב-namespace production, עם pod על כל שרת.',
  },
  feed: {
    color: colors.feedWorkload,
    border: '#DDD6FE',
    bg: '#F5F3FF',
    hint: 'אפליקציית הפיד. רצה ב-namespace stage, על node-1 ו-node-2.',
  },
} as const

function toneFor(name: string) {
  return name.startsWith('feed') ? workloadTones.feed : workloadTones.user
}

const hints = {
  Cloud: 'הענן שבו יושב הקלאסטר',
  Cluster: 'קבוצת השרתים של Kubernetes',
  Node: 'שרת אחד בקלאסטר',
  Workload: 'האפליקציה. היא מריצה pods, וה-pods רצים על השרתים.',
  'workload user': workloadTones.user.hint,
  'workload feed': workloadTones.feed.hint,
  Pod: 'היחידה הקטנה ש-Kubernetes מריץ. היא יושבת על שרת, ובתוכה רצים קונטיינר אחד או יותר ביחד.',
  Container: 'הרצה של image בתוך ה-pod. ה-image הוא החבילה של התוכנה, והקונטיינר הוא ההרצה שלה.',
  Image: 'החבילה של התוכנה. הקונטיינר הוא ההרצה של ה-image.',
  Registry: 'המחסן שבו נשמרים ה-images. Kubernetes מושך משם את ה-image.',
} as const

const imageColor = '#0F766E'
const registryColor = '#475569'

const layers = [
  { label: 'Cloud' as const, color: colors.navy },
  { label: 'Cluster' as const, color: colors.green },
  { label: 'Node' as const, color: colors.blue },
  { label: 'workload user' as const, color: workloadTones.user.color },
  { label: 'workload feed' as const, color: workloadTones.feed.color },
  { label: 'Pod' as const, color: colors.ink },
  { label: 'Container' as const, color: colors.pink },
  { label: 'Image' as const, color: imageColor },
  { label: 'Registry' as const, color: registryColor },
]

export default function InfrastructureTopology({
  cluster,
  region,
  nodes,
  workloads,
}: InfrastructureTopologyProps) {
  return (
    <Card id="infrastructure-topology">
      <Box sx={{ px: 2.5, pt: 2, pb: 1.5 }}>
        <Typography sx={{ fontSize: 15, fontWeight: 600 }}>Infrastructure Topology</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
          From the cloud down to each image in the registry.
        </Typography>
        <Stack direction="row" spacing={1.5} useFlexGap sx={{ flexWrap: 'wrap', mt: 1.5 }}>
          {layers.map((layer) => (
            <Hint key={layer.label} label={layer.label}>
              <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', cursor: 'help' }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: layer.color }} />
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  {layer.label}
                </Typography>
              </Stack>
            </Hint>
          ))}
        </Stack>
      </Box>

      <Box
        sx={{
          mx: { xs: 2, md: 3 },
          mb: 3,
          px: { xs: 1.5, md: 3 },
          py: { xs: 2.5, md: 3 },
          borderRadius: 2,
          border: '1px solid',
          borderColor: colors.line,
          bgcolor: '#FBFCFE',
          backgroundImage: `radial-gradient(${colors.line} 1.15px, transparent 1.15px)`,
          backgroundSize: '16px 16px',
          overflow: 'hidden',
        }}
      >
        <Stack sx={{ alignItems: 'center' }}>
          <DiagramBox tone="navy" icon={<CloudOutlinedIcon sx={{ fontSize: 18 }} />} kicker="Cloud" title="AWS Cloud" detail={region} />
          <Stem />
          <DiagramBox
            tone="cluster"
            icon={<HubOutlinedIcon sx={{ fontSize: 18 }} />}
            kicker="Cluster"
            title={cluster.name}
            detail={`${cluster.provider} · v${cluster.kubernetesVersion}`}
            status={cluster.status}
            wide
          />
        </Stack>

        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
          <Stem />
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: `repeat(${nodes.length}, minmax(0, 1fr))`,
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: `${50 / nodes.length}%`,
                right: `${50 / nodes.length}%`,
                height: 2,
                bgcolor: connector,
              },
            }}
          >
            {nodes.map((node) => (
              <Box key={node.id} sx={{ minWidth: 0, px: 1 }}>
                <Stem height={18} />
                <NodeBranch node={node} workloads={workloads.filter((workload) => workload.node === node.name)} />
              </Box>
            ))}
          </Box>
        </Box>

        <Stack spacing={0} sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center' }}>
          {nodes.map((node) => (
            <Box key={node.id} sx={{ width: '100%' }}>
              <Stem />
              <NodeBranch node={node} workloads={workloads.filter((workload) => workload.node === node.name)} />
            </Box>
          ))}
        </Stack>
      </Box>
    </Card>
  )
}

function NodeBranch({ node, workloads }: { node: ClusterNode; workloads: Workload[] }) {
  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: '#BFDBFE',
        borderRadius: 2,
        bgcolor: '#fff',
        px: 1.25,
        py: 1.25,
        minWidth: 0,
      }}
    >
      <Hint label="Node">
      <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', cursor: 'help' }}>
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: 1,
            bgcolor: '#EFF6FF',
            color: colors.blue,
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}
        >
          <DnsOutlinedIcon sx={{ fontSize: 16 }} />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="caption" sx={{ color: colors.blue, fontWeight: 700, letterSpacing: 0.4 }}>
            NODE
          </Typography>
          <Typography sx={{ fontSize: 14, fontWeight: 700, lineHeight: 1.2 }} noWrap>
            {node.name}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {node.pods} {node.pods === 1 ? 'pod' : 'pods'} · {node.type}
          </Typography>
        </Box>
        <StatusChip status={node.status} />
      </Stack>
      </Hint>

      <Stack spacing={1.25} sx={{ mt: 1.25 }}>
        {groupByWorkload(workloads).map((group) => (
          <WorkloadGroup key={group.name} name={group.name} pods={group.pods} />
        ))}
      </Stack>
    </Box>
  )
}

function groupByWorkload(workloads: Workload[]) {
  const groups: { name: string; pods: Workload[] }[] = []
  for (const workload of workloads) {
    const group = groups.find((item) => item.name === workload.name)
    if (group) group.pods.push(workload)
    else groups.push({ name: workload.name, pods: [workload] })
  }
  return groups
}

function WorkloadGroup({ name, pods }: { name: string; pods: Workload[] }) {
  const tone = toneFor(name)

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: tone.border,
        borderRadius: 1.5,
        bgcolor: tone.bg,
        px: 1,
        py: 1,
        minWidth: 0,
      }}
    >
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'flex-start' }}>
        <AppsOutlinedIcon sx={{ fontSize: 15, color: tone.color, mt: 0.2 }} />
        <Box sx={{ minWidth: 0 }}>
          <Hint label="Workload">
            <Typography variant="caption" sx={{ color: tone.color, fontWeight: 700, letterSpacing: 0.4, display: 'block', lineHeight: 1.2, cursor: 'help', width: 'fit-content' }}>
              WORKLOAD
            </Typography>
          </Hint>
          <AppTooltip
            title={tone.hint}
            describeChild
            arrow
            placement="top"
            slotProps={{
              tooltip: {
                sx: { direction: 'rtl', textAlign: 'right', fontSize: 13, px: 1.25, py: 0.75, maxWidth: 260 },
              },
            }}
          >
            <Typography noWrap sx={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3, color: tone.color, cursor: 'help', width: 'fit-content' }}>
              {name}
            </Typography>
          </AppTooltip>
        </Box>
      </Stack>
      <Stack spacing={0} sx={{ alignItems: 'center' }}>
        {pods.map((workload) => (
          <Box key={workload.pod} sx={{ width: '100%' }}>
            <Stem height={12} />
            <PodNode workload={workload} />
            <ContainerBranch names={workload.containers} />
          </Box>
        ))}
      </Stack>
    </Box>
  )
}

function PodNode({ workload }: { workload: Workload }) {
  const accent = toneFor(workload.name).color
  return (
    <Hint label="Pod">
    <Box
      sx={{
        border: '1px solid',
        borderColor: accent,
        borderRadius: 1.5,
        bgcolor: '#fff',
        px: 1.25,
        py: 0.9,
        cursor: 'help',
      }}
    >
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'flex-start' }}>
        <ViewInArIcon sx={{ fontSize: 15, color: accent, mt: 0.2 }} />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="caption" sx={{ color: accent, fontWeight: 700, letterSpacing: 0.4, display: 'block', lineHeight: 1.2 }}>
            POD
          </Typography>
          <Typography noWrap sx={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3 }}>
            {workload.pod}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
            namespace {workload.namespace}
          </Typography>
        </Box>
      </Stack>
    </Box>
    </Hint>
  )
}

function ContainerBranch({ names }: { names: string[] }) {
  if (names.length < 2) {
    return (
      <Box>
        <Stem height={10} />
        <ContainerNode name={names[0] ?? ''} />
      </Box>
    )
  }

  return (
    <Box>
      <Stem height={10} />
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: `repeat(${names.length}, minmax(0, 1fr))`,
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: `${50 / names.length}%`,
            right: `${50 / names.length}%`,
            height: 2,
            bgcolor: connector,
          },
        }}
      >
        {names.map((name) => (
          <Box key={name} sx={{ minWidth: 0, px: 0.4 }}>
            <Stem height={10} />
            <ContainerNode name={name} compact />
          </Box>
        ))}
      </Box>
    </Box>
  )
}

function ContainerNode({ name, compact }: { name: string; compact?: boolean }) {
  return (
    <Box sx={{ width: compact ? '100%' : '86%', mx: 'auto' }}>
      <ChainNode label="Container" kicker="CONTAINER" name={name} color={colors.pink} dashed compact={compact} icon={<Inventory2OutlinedIcon sx={{ fontSize: 14, color: colors.pink }} />} />
      <Stem height={8} />
      <ChainNode label="Image" kicker="IMAGE" name={name} color={imageColor} compact={compact} icon={<LayersOutlinedIcon sx={{ fontSize: 14, color: imageColor }} />} />
      <Stem height={8} />
      <ChainNode label="Registry" kicker="REGISTRY" name="ECR" color={registryColor} compact={compact} icon={<StorageOutlinedIcon sx={{ fontSize: 14, color: registryColor }} />} />
    </Box>
  )
}

function ChainNode({
  label,
  kicker,
  name,
  color,
  icon,
  compact,
  dashed,
}: {
  label: 'Container' | 'Image' | 'Registry'
  kicker: string
  name: string
  color: string
  icon: ReactNode
  compact?: boolean
  dashed?: boolean
}) {
  return (
    <Hint label={label}>
      <Box
        sx={{
          border: '1px dashed',
          borderStyle: dashed ? 'dashed' : 'solid',
          borderColor: color,
          borderRadius: 1.5,
          bgcolor: '#fff',
          px: compact ? 0.5 : 1,
          py: 0.55,
          cursor: 'help',
        }}
      >
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', justifyContent: 'center' }}>
          {icon}
          <Typography variant="caption" sx={{ color, fontWeight: 700, letterSpacing: 0.3, fontSize: compact ? 9 : 11 }}>
            {kicker}
          </Typography>
          <Typography noWrap sx={{ fontSize: compact ? 12 : 13, fontWeight: 700 }}>
            {name}
          </Typography>
        </Stack>
      </Box>
    </Hint>
  )
}

function DiagramBox({
  tone,
  icon,
  kicker,
  title,
  detail,
  status,
  wide,
}: {
  tone: 'navy' | 'cluster'
  icon: ReactNode
  kicker: string
  title: string
  detail: string
  status?: string
  wide?: boolean
}) {
  const navy = tone === 'navy'
  const kind = kicker === 'Cloud' ? 'Cloud' : 'Cluster'
  return (
    <Hint label={kind}>
    <Box
      sx={{
        width: wide ? 'min(100%, 420px)' : 'fit-content',
        maxWidth: '100%',
        borderRadius: 2,
        px: 2,
        py: 1.25,
        cursor: 'help',
        bgcolor: navy ? colors.navy : '#fff',
        color: navy ? '#fff' : colors.ink,
        border: '1px solid',
        borderColor: navy ? colors.navy : colors.green,
        boxShadow: navy ? 'none' : `0 0 0 4px ${colors.healthyBg}`,
      }}
    >
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1,
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
            bgcolor: navy ? 'rgba(255,255,255,0.12)' : colors.healthyBg,
            color: navy ? '#fff' : colors.green,
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: 0.5, color: navy ? '#BFDBFE' : colors.green }}>
            {kicker.toUpperCase()}
          </Typography>
          <Typography sx={{ fontWeight: 700, fontSize: 16, lineHeight: 1.2 }}>{title}</Typography>
          <Typography variant="caption" sx={{ color: navy ? 'rgba(255,255,255,0.75)' : 'text.secondary' }}>
            {detail}
          </Typography>
        </Box>
        {status ? <StatusChip status={status} /> : null}
      </Stack>
    </Box>
    </Hint>
  )
}

function Hint({ label, children }: { label: keyof typeof hints; children: ReactElement }) {
  return (
    <AppTooltip
      title={hints[label]}
      arrow
      placement="top"
      slotProps={{
        tooltip: {
          sx: { direction: 'rtl', textAlign: 'right', fontSize: 13, px: 1.25, py: 0.75 },
        },
      }}
    >
      {children}
    </AppTooltip>
  )
}

function Stem({ height = 28 }: { height?: number }) {
  return <Box sx={{ width: 2, height, bgcolor: connector, mx: 'auto' }} />
}
