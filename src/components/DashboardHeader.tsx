import { useState } from 'react'
import {
  Avatar,
  Badge,
  Box,
  Button,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  Menu,
  MenuItem,
  Select,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined'
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone'
import type { Company, DashboardUser, NotificationItem } from '../types/infrastructure.ts'
import { titleCase } from '../utils/format.ts'

type DashboardHeaderProps = {
  company: Company
  user: DashboardUser
  notifications: NotificationItem[]
  environment: string
  region: string
  onEnvironmentChange: (value: string) => void
  onRegionChange: (value: string) => void
}

export default function DashboardHeader({
  company,
  user,
  notifications,
  environment,
  region,
  onEnvironmentChange,
  onRegionChange,
}: DashboardHeaderProps) {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)

  return (
    <Box
      component="header"
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: (theme) => theme.zIndex.appBar,
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Stack
        direction="row"
        spacing={2}
        sx={{
          alignItems: 'center',
          minHeight: 64,
          px: { xs: 2, md: 3 },
          py: 1,
          gap: 1.5,
          flexWrap: 'wrap',
        }}
      >
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1.5,
              bgcolor: 'primary.main',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 700,
              fontSize: 16,
            }}
            aria-hidden
          >
            {company.name.slice(0, 1)}
          </Box>
          <Typography sx={{ fontWeight: 700, fontSize: 16, letterSpacing: -0.2 }}>
            {company.name}
          </Typography>
        </Stack>

        <Button
          aria-current="page"
          startIcon={<AccountTreeOutlinedIcon sx={{ fontSize: 18 }} />}
          sx={{
            color: 'primary.main',
            bgcolor: '#EFF4FF',
            px: 1.5,
            borderRadius: 2,
            '&:hover': { bgcolor: '#E0EAFF' },
          }}
        >
          Infrastructure
        </Button>

        <Box sx={{ flex: 1, display: { xs: 'none', md: 'block' } }} />

        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', ml: { xs: 0, md: 'auto' } }}>
          <FormControl size="small" sx={{ minWidth: { xs: 132, sm: 156 } }}>
            <InputLabel id="environment-label">Environment</InputLabel>
            <Select
              labelId="environment-label"
              label="Environment"
              value={environment}
              onChange={(event) => onEnvironmentChange(event.target.value)}
            >
              {company.environments.map((item) => (
                <MenuItem key={item} value={item}>
                  {titleCase(item)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: { xs: 132, sm: 150 } }}>
            <InputLabel id="region-label">Region</InputLabel>
            <Select
              labelId="region-label"
              label="Region"
              value={region}
              onChange={(event) => onRegionChange(event.target.value)}
            >
              {company.regions.map((item) => (
                <MenuItem key={item} value={item}>
                  {item}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' }, my: 0.5 }} />

          <Tooltip title="Notifications">
            <IconButton aria-label="Notifications" onClick={(event) => setMenuAnchor(event.currentTarget)}>
              <Badge badgeContent={notifications.length} color="primary">
                <NotificationsNoneIcon />
              </Badge>
            </IconButton>
          </Tooltip>

          <Tooltip title={`${user.name} · ${user.role}`}>
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: '#101828',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'default',
              }}
            >
              {user.initials}
            </Avatar>
          </Tooltip>
        </Stack>
      </Stack>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        slotProps={{ paper: { sx: { width: 360, mt: 1, border: '1px solid #E4E7EC', boxShadow: '0 12px 32px rgba(16, 24, 40, 0.12)' } } }}
      >
        <Box sx={{ px: 2, py: 1.25 }}>
          <Typography sx={{ fontWeight: 600, fontSize: 14 }}>Notifications</Typography>
        </Box>
        <Divider />
        {notifications.map((note) => (
          <MenuItem key={note.id} onClick={() => setMenuAnchor(null)} sx={{ alignItems: 'flex-start', py: 1.25, whiteSpace: 'normal' }}>
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{note.title}</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
                {note.detail}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {note.time}
              </Typography>
            </Box>
          </MenuItem>
        ))}
      </Menu>
    </Box>
  )
}
