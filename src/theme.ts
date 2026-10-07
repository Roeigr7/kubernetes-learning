import { createTheme } from '@mui/material/styles'
import { colors } from './colors.ts'

const tooltipModifiers = [
  {
    name: 'preventOverflow',
    options: { boundary: 'viewport', padding: 8, altAxis: true, tether: false },
  },
  {
    name: 'flip',
    options: {
      boundary: 'viewport',
      padding: 8,
      fallbackPlacements: ['bottom', 'top', 'right', 'left'],
    },
  },
]

export const tooltipPopperSlotProps = {
  popper: {
    popperOptions: {
      modifiers: tooltipModifiers,
    },
  },
}

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: colors.navy,
      dark: '#0B1020',
    },
    success: {
      main: colors.healthy,
    },
    warning: {
      main: colors.warning,
    },
    error: {
      main: colors.critical,
    },
    text: {
      primary: colors.ink,
      secondary: colors.slate,
    },
    divider: colors.line,
    background: {
      default: colors.surface,
      paper: '#FFFFFF',
    },
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 10,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: colors.surface,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: `1px solid ${colors.line}`,
          boxShadow: '0 10px 30px rgba(18, 23, 42, 0.06)',
          backgroundImage: 'none',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 6,
        },
        sizeSmall: {
          height: 22,
          fontSize: 12,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: '#FFFFFF',
        },
      },
    },
    MuiTooltip: {
      defaultProps: {
        enterTouchDelay: 0,
        leaveTouchDelay: 2500,
        disableInteractive: true,
        slotProps: {
          popper: {
            popperOptions: {
              modifiers: tooltipModifiers,
            },
          },
        },
      },
      styleOverrides: {
        tooltip: {
          maxWidth: 'min(280px, calc(100vw - 16px))',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: colors.grid,
        },
        head: {
          color: colors.slate,
          fontSize: 12,
          fontWeight: 600,
          backgroundColor: colors.paperMuted,
        },
      },
    },
  },
})
