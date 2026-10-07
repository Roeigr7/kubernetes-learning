import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  Avatar,
  Box,
  Card,
  InputAdornment,
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
import SearchIcon from '@mui/icons-material/Search'
import { colors } from '../colors.ts'
import type { Workload } from '../types/infrastructure.ts'
import StatusChip from './StatusChip.tsx'
import UsageMeter from './UsageMeter.tsx'

type SortKey = 'name' | 'namespace' | 'node' | 'pod' | 'cpu' | 'memory' | 'status' | 'restarts'
type SortState = { key: SortKey; direction: 'asc' | 'desc' }

const columns: { key: SortKey; label: string; numeric?: boolean }[] = [
  { key: 'name', label: 'Workload' },
  { key: 'namespace', label: 'Namespace' },
  { key: 'node', label: 'Node' },
  { key: 'pod', label: 'Pod' },
  { key: 'cpu', label: 'CPU', numeric: true },
  { key: 'memory', label: 'Memory', numeric: true },
  { key: 'status', label: 'Status' },
  { key: 'restarts', label: 'Restarts', numeric: true },
]

const PAGE_SIZE = 10

type WorkloadsTableProps = {
  workloads: Workload[]
}

export default function WorkloadsTable({ workloads }: WorkloadsTableProps) {
  const [query, setQuery] = useState('')
  const [namespace, setNamespace] = useState('all')
  const [status, setStatus] = useState('all')
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
  const statuses = useMemo(
    () => Array.from(new Set(workloads.map((workload) => workload.status))).sort(),
    [workloads],
  )

  const visibleWorkloads = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const filtered = workloads.filter((workload) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        workload.name.toLowerCase().includes(normalizedQuery) ||
        workload.pod.toLowerCase().includes(normalizedQuery) ||
        workload.node.toLowerCase().includes(normalizedQuery)
      const matchesNamespace = namespace === 'all' || workload.namespace === namespace
      const matchesStatus = status === 'all' || workload.status === status
      return matchesQuery && matchesNamespace && matchesStatus
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
  }, [namespace, query, sort, status, workloads])

  const shownWorkloads = visibleWorkloads.slice(0, loadedCount)
  stateRef.current = { loadedCount, total: visibleWorkloads.length }

  useEffect(() => {
    setLoadedCount(PAGE_SIZE)
    setLoading(false)
    loadingRef.current = false
    if (loadTimer.current !== null) window.clearTimeout(loadTimer.current)
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [namespace, query, sort, status])

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

    const onWheel = (event: WheelEvent) => {
      const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY)
      if (horizontal) {
        const maxLeft = el.scrollWidth - el.clientWidth
        const canScrollX =
          (event.deltaX > 0 && el.scrollLeft < maxLeft - 1) || (event.deltaX < 0 && el.scrollLeft > 0)
        if (!canScrollX) return
        event.preventDefault()
        el.scrollLeft += event.deltaX
        return
      }

      const { loadedCount: loaded, total } = stateRef.current
      const hasMoreRows = loaded < total
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 2
      const atTop = el.scrollTop <= 0

      if (event.deltaY > 0 && (!atBottom || hasMoreRows)) {
        event.preventDefault()
        if (atBottom && hasMoreRows) loadMoreRef.current()
        else el.scrollTop += event.deltaY
        return
      }

      if (event.deltaY < 0 && !atTop) {
        event.preventDefault()
        el.scrollTop += event.deltaY
      }
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
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
    <Card id="kubernetes-workloads" sx={{ overflow: 'hidden' }}>
      <Stack
        spacing={1.5}
        sx={{ px: 2.5, pt: 2, pb: 1.5 }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{ justifyContent: 'space-between', alignItems: { sm: 'flex-start' } }}
        >
          <Box>
            <Typography sx={{ fontSize: 15, fontWeight: 600 }}>Kubernetes Workloads</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
              One row is one pod. Showing {shownWorkloads.length} of {visibleWorkloads.length}.
            </Typography>
          </Box>
        </Stack>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
          <TextField
            size="small"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search workloads, pods, or nodes"
            aria-label="Search workloads"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ flex: 1, minWidth: 220 }}
          />
          <TextField
            select
            size="small"
            label="Namespace"
            value={namespace}
            onChange={(event) => setNamespace(event.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="all">All namespaces</MenuItem>
            {namespaces.map((item) => (
              <MenuItem key={item} value={item}>
                {item}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="all">All statuses</MenuItem>
            {statuses.map((item) => (
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
          overflowY: 'auto',
          overscrollBehavior: 'contain',
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
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          container/{workload.container}
                        </Typography>
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
                    <UsageMeter value={workload.cpu} />
                  </TableCell>
                  <TableCell sx={{ width: 108 }}>
                    <UsageMeter value={workload.memory} />
                  </TableCell>
                  <TableCell>
                    <StatusChip status={workload.status} />
                  </TableCell>
                  <TableCell>
                    <Typography
                      sx={{
                        fontSize: 13,
                        fontWeight: 700,
                        fontVariantNumeric: 'tabular-nums',
                        color: workload.restarts > 0 ? colors.warning : 'text.secondary',
                      }}
                    >
                      {workload.restarts}
                    </Typography>
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

function initials(name: string): string {
  const parts = name.split(/[\s-]+/).filter(Boolean)
  return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase()
}
