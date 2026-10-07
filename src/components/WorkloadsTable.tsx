import { useMemo, useState } from 'react'
import {
  Avatar,
  Box,
  Card,
  InputAdornment,
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
import type { Workload } from '../types/infrastructure.ts'
import StatusChip from './StatusChip.tsx'
import UsageMeter from './UsageMeter.tsx'

const avatarColors = ['#155EEF', '#067647', '#6941C6', '#C11574', '#B54708', '#0E7090']

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

type WorkloadsTableProps = {
  workloads: Workload[]
}

export default function WorkloadsTable({ workloads }: WorkloadsTableProps) {
  const [query, setQuery] = useState('')
  const [namespace, setNamespace] = useState('all')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState<SortState | null>(null)

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
              Services scheduled on the production cluster. Showing {visibleWorkloads.length} of {workloads.length}.
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

      <TableContainer>
        <Table
          size="small"
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
              visibleWorkloads.map((workload) => (
                <TableRow key={workload.pod} hover>
                  <TableCell>
                    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
                      <Avatar
                        sx={{
                          width: 28,
                          height: 28,
                          fontSize: 11,
                          fontWeight: 700,
                          bgcolor: avatarColor(workload.name),
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
                        color: workload.restarts > 0 ? '#B54708' : 'text.secondary',
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
    </Card>
  )
}

function initials(name: string): string {
  const parts = name.split('-').filter(Boolean)
  return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase()
}

function avatarColor(name: string): string {
  const total = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return avatarColors[total % avatarColors.length]
}
