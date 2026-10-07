import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  Avatar,
  Box,
  Card,
  LinearProgress,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import { colors } from '../colors.ts'
import AppTooltip from './AppTooltip.tsx'
import type { Workload, WorkloadResources } from '../types/infrastructure.ts'
import StatusChip from './StatusChip.tsx'
import UsageMeter from './UsageMeter.tsx'

type SortKey = 'name' | 'namespace' | 'node' | 'pod' | 'cpu' | 'memory' | 'status'
type SortState = { key: SortKey; direction: 'asc' | 'desc' }

const columns: { key: SortKey; label: string; hint: string; numeric?: boolean }[] = [
  { key: 'name', label: 'Workload', hint: 'The application. It runs pods, and the pods run on the servers.' },
  { key: 'namespace', label: 'Namespace', hint: 'The logical group of the pod.' },
  { key: 'node', label: 'Node', hint: 'The server the pod runs on.' },
  { key: 'pod', label: 'Pod', hint: 'The smallest unit Kubernetes runs. It sits on a server, with one or more containers running inside it.' },
  { key: 'cpu', label: 'CPU', hint: 'Usage as a percent of the workload request.', numeric: true },
  { key: 'memory', label: 'Memory', hint: 'Usage as a percent of the workload request.', numeric: true },
  { key: 'status', label: 'Status', hint: 'Whether the pod is running.' },
]

const tooltipSlotProps = {
  tooltip: {
    sx: { fontSize: 13, px: 1.25, py: 0.75, maxWidth: 260 },
  },
}

const PAGE_SIZE = 10

type WorkloadsTableProps = {
  workloads: Workload[]
  resources: WorkloadResources[]
}

type WorkloadRow = Workload & {
  cpuUsed: number
  cpuRequest: number
  memoryUsed: number
  memoryRequest: number
}

export default function WorkloadsTable({ workloads, resources }: WorkloadsTableProps) {
  const [namespace, setNamespace] = useState('all')
  const [sort, setSort] = useState<SortState | null>(null)
  const [loadedCount, setLoadedCount] = useState(PAGE_SIZE)
  const [loading, setLoading] = useState(false)
  const [rowHeight, setRowHeight] = useState(52)
  const [headHeight, setHeadHeight] = useState(41)
  const scrollRef = useRef<HTMLDivElement>(null)
  const loadingRef = useRef(false)
  const loadTimer = useRef<number | null>(null)
  const loadMoreRef = useRef<() => void>(() => {})
  const stateRef = useRef({ loadedCount: PAGE_SIZE, total: 0 })

  const namespaces = useMemo(
    () => Array.from(new Set(workloads.map((workload) => workload.namespace))).sort(),
    [workloads],
  )
  const visibleWorkloads = useMemo(() => {
    const filtered = workloads.map((workload) => withUsage(workload, resources)).filter((workload) => {
      return namespace === 'all' || workload.namespace === namespace
    })

    if (!sort) return filtered

    const sorted = [...filtered].sort((left, right) => {
      const leftValue = left[sort.key]
      const rightValue = right[sort.key]
      const result =
        typeof leftValue === 'number' && typeof rightValue === 'number'
          ? leftValue - rightValue
          : String(leftValue).localeCompare(String(rightValue))
      return sort.direction === 'asc' ? result : -result
    })

    return sorted
  }, [namespace, resources, sort, workloads])

  const shownWorkloads = visibleWorkloads.slice(0, loadedCount)
  stateRef.current = { loadedCount, total: visibleWorkloads.length }

  useEffect(() => {
    setLoadedCount(PAGE_SIZE)
    setLoading(false)
    loadingRef.current = false
    if (loadTimer.current !== null) window.clearTimeout(loadTimer.current)
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [namespace, sort])

  useEffect(() => {
    return () => {
      if (loadTimer.current !== null) window.clearTimeout(loadTimer.current)
    }
  }, [])

  useLayoutEffect(() => {
    const container = scrollRef.current
    const row = container?.querySelector('tbody tr')
    const head = container?.querySelector('thead')
    if (shownWorkloads.length > 0 && row) setRowHeight(row.getBoundingClientRect().height)
    if (head) setHeadHeight(head.getBoundingClientRect().height)
  }, [shownWorkloads.length])

  function loadMore() {
    const { loadedCount: loaded, total } = stateRef.current
    if (loadingRef.current || loaded >= total) return
    loadingRef.current = true
    setLoading(true)
    loadTimer.current = window.setTimeout(() => {
      setLoadedCount((count) => Math.min(count + PAGE_SIZE, stateRef.current.total))
      loadingRef.current = false
      setLoading(false)
    }, 450)
  }

  loadMoreRef.current = loadMore

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const atEdge = (deltaY: number) => {
      if (el.scrollHeight <= el.clientHeight + 1 || getComputedStyle(el).overflowY === 'hidden') return true
      if (deltaY > 0) return el.scrollTop + el.clientHeight >= el.scrollHeight - 1
      return el.scrollTop <= 0
    }

    const scrollPage = (deltaY: number) => {
      const scroller = document.scrollingElement
      if (!scroller || deltaY === 0) return false
      const max = scroller.scrollHeight - scroller.clientHeight
      const next = Math.min(max, Math.max(0, scroller.scrollTop + deltaY))
      if (next === scroller.scrollTop) return false
      scroller.scrollTop = next
      return true
    }

    const onScroll = () => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8) loadMoreRef.current()
    }

    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return
      if (event.deltaY > 0 && el.scrollTop + el.clientHeight >= el.scrollHeight - 8) loadMoreRef.current()
      if (!atEdge(event.deltaY)) return
      if (scrollPage(event.deltaY)) event.preventDefault()
    }

    let touchY = 0
    let touchX = 0
    const onTouchStart = (event: TouchEvent) => {
      touchY = event.touches[0]?.clientY ?? 0
      touchX = event.touches[0]?.clientX ?? 0
    }
    const onTouchMove = (event: TouchEvent) => {
      const point = event.touches[0]
      if (!point) return
      const deltaY = touchY - point.clientY
      const deltaX = touchX - point.clientX
      touchY = point.clientY
      touchX = point.clientX
      if (Math.abs(deltaX) > Math.abs(deltaY)) return
      if (deltaY > 0 && el.scrollTop + el.clientHeight >= el.scrollHeight - 8) loadMoreRef.current()
      if (!atEdge(deltaY)) return
      if (scrollPage(deltaY)) event.preventDefault()
    }

    el.addEventListener('scroll', onScroll, { passive: true })
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => {
      el.removeEventListener('scroll', onScroll)
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
    }
  }, [])

  function toggleSort(key: SortKey) {
    setSort((current) => {
      if (current?.key === key) {
        return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
      }
      const numeric = columns.find((column) => column.key === key)?.numeric
      return { key, direction: numeric ? 'desc' : 'asc' }
    })
  }

  return (
    <Card id="kubernetes-workloads" sx={{ overflow: 'hidden', height: '100%' }}>
      <Stack
        spacing={1.5}
        sx={{ px: 2.5, pt: 2, pb: 1.5 }}
      >
        <Stack
          direction="row"
          useFlexGap
          spacing={1.5}
          sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 15, fontWeight: 600 }}>Kubernetes Workloads</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
              One row is one pod. Showing {shownWorkloads.length} of {visibleWorkloads.length}.
            </Typography>
          </Box>
          <TextField
            select
            size="small"
            label="Namespace"
            value={namespace}
            onChange={(event) => setNamespace(event.target.value)}
            sx={{ flexShrink: 0, width: { xs: 148, sm: 180 }, ml: 'auto' }}
          >
            <MenuItem value="all">All namespaces</MenuItem>
            {namespaces.map((item) => (
              <MenuItem key={item} value={item}>
                {item}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Stack>

      <Box sx={{ position: 'relative' }}>
      <TableContainer
        ref={scrollRef}
        sx={{
          maxHeight:
            shownWorkloads.length > 0
              ? headHeight + rowHeight * Math.min(PAGE_SIZE, shownWorkloads.length)
              : undefined,
          overflowX: 'auto',
          overflowY: visibleWorkloads.length > PAGE_SIZE ? 'auto' : 'hidden',
          overscrollBehavior: 'auto',
          touchAction: 'pan-x pan-y',
        }}
      >
        <Table
          size="small"
          stickyHeader
          sx={{
            '& .MuiTableCell-root': {
              px: 1.25,
              whiteSpace: 'nowrap',
            },
          }}
        >
          <TableHead>
            <TableRow>
              {columns.map((column) => {
                const active = sort?.key === column.key
                const SortIcon = sort?.direction === 'asc' ? ArrowUpwardIcon : ArrowDownwardIcon
                return (
                  <TableCell key={column.key} sortDirection={active ? sort.direction : false}>
                    <AppTooltip title={column.hint} describeChild arrow placement="top" slotProps={tooltipSlotProps}>
                      <Box
                        component="button"
                        type="button"
                        onClick={() => toggleSort(column.key)}
                        sx={{
                          all: 'unset',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 0.5,
                          font: 'inherit',
                          fontWeight: 600,
                          color: active ? 'text.primary' : 'inherit',
                        }}
                      >
                        {column.label}
                        {active ? <SortIcon sx={{ fontSize: 14 }} /> : null}
                      </Box>
                    </AppTooltip>
                  </TableCell>
                )
              })}
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleWorkloads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  <Typography variant="body2" sx={{ color: 'text.secondary', py: 3, textAlign: 'center' }}>
                    No workloads match these filters.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              shownWorkloads.map((workload) => (
                <TableRow key={workload.pod} hover>
                  <TableCell>
                    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
                      <Avatar
                        sx={{
                          width: 28,
                          height: 28,
                          fontSize: 11,
                          fontWeight: 700,
                          bgcolor: workload.name.startsWith('feed') ? colors.blue : colors.green,
                        }}
                      >
                        {initials(workload.name)}
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{workload.name}</Typography>
                        <AppTooltip title="A running image inside the pod. The image is the software package, and the container is that package running." describeChild arrow placement="top" slotProps={tooltipSlotProps}>
                          <Typography variant="caption" sx={{ color: 'text.secondary', cursor: 'help', width: 'fit-content' }}>
                            {workload.containers.map((container) => `container/${container}`).join(' · ')}
                          </Typography>
                        </AppTooltip>
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontSize: 13 }}>{workload.namespace}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography
                      noWrap
                      sx={{ fontSize: 13, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' }}
                    >
                      {workload.node}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography
                      noWrap
                      sx={{
                        fontSize: 12,
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                        color: 'text.secondary',
                      }}
                    >
                      {workload.pod}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ width: 108 }}>
                    <AppTooltip title={usageHint('cores', workload.cpuUsed, workload.cpuRequest)} describeChild arrow placement="top" slotProps={tooltipSlotProps}>
                      <Box sx={{ cursor: 'help' }}>
                        <UsageMeter value={workload.cpu} />
                      </Box>
                    </AppTooltip>
                  </TableCell>
                  <TableCell sx={{ width: 108 }}>
                    <AppTooltip title={usageHint('Gi', workload.memoryUsed, workload.memoryRequest)} describeChild arrow placement="top" slotProps={tooltipSlotProps}>
                      <Box sx={{ cursor: 'help' }}>
                        <UsageMeter value={workload.memory} />
                      </Box>
                    </AppTooltip>
                  </TableCell>
                  <TableCell>
                    <StatusChip status={workload.status} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {loading ? (
        <LinearProgress
          aria-label="Loading more workloads"
          sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 3 }}
        />
      ) : null}
      </Box>
    </Card>
  )
}

function withUsage(workload: Workload, resources: WorkloadResources[]): WorkloadRow {
  const resource = resources.find((item) => item.name === workload.name)
  const cpu = percentOf(resource?.cpu.used ?? 0, resource?.cpu.request ?? 0)
  const memory = percentOf(resource?.memory.used ?? 0, resource?.memory.request ?? 0)
  return {
    ...workload,
    cpu: cpu.percent,
    memory: memory.percent,
    cpuUsed: resource?.cpu.used ?? 0,
    cpuRequest: resource?.cpu.request ?? 0,
    memoryUsed: resource?.memory.used ?? 0,
    memoryRequest: resource?.memory.request ?? 0,
  }
}

function percentOf(used: number, request: number) {
  if (request <= 0) return { percent: 0 }
  return { percent: Math.round((used / request) * 100) }
}

function usageHint(unit: string, used: number, request: number) {
  return `Used ${formatAmount(used)} ${unit} · Request ${formatAmount(request)} ${unit}`
}

function formatAmount(value: number) {
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : String(rounded)
}

function initials(name: string): string {
  const parts = name.split(/[\s-]+/).filter(Boolean)
  return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase()
}
