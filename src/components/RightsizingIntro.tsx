import { useState } from 'react'
import { Box, Button, Dialog, Stack, Typography } from '@mui/material'
import { colors } from '../colors.ts'

export const rightsizingTitle = 'Workload Rightsizing In My Words'

export const rightsizingBody =
  'Workload Rightsizing הוא תהליך שבו בודקים לאורך זמן כמה משאבים ה־Workload באמת צורך, בעיקר CPU ו־Memory. לפי הנתונים האלה אנחנו מזהים איפה אנחנו מקצים יותר מדי משאבים ויכולים להוריד אותם כדי לחסוך בעלויות, ואיפה אין מספיק משאבים וצריך להגדיל אותם כדי לשמור על ביצועים תקינים.'

export const rightsizingGoal =
  'המטרה היא למצוא את האיזון הנכון בין עלות לביצועים, על בסיס נתונים שנאספו לאורך זמן.'

export const rightsizingExample =
  'את השימוש בזה אפשר לראות בכרטיס Requests and limits בעמוד.'

const pageParts = [
  {
    title: 'נתונים כלליים',
    detail: 'מצב הקלאסטר, כמה שרתים ו-pods יש, ואיפה כל workload רץ.',
  },
  {
    title: 'Workload Rightsizing',
    detail: 'השימוש ב-CPU וב-Memory לאורך היום, וההמלצות בכרטיס Requests and limits.',
  },
  {
    title: 'דיאגרמת Kubernetes',
    detail: 'מהענן למטה, עד כל שרת, pod וקונטיינר.',
  },
]

const hebrewText = {
  direction: 'rtl',
  textAlign: 'right',
  fontSize: 15,
  lineHeight: 1.7,
} as const

export default function RightsizingIntro() {
  const [open, setOpen] = useState(true)

  function showExample() {
    setOpen(false)
    window.setTimeout(() => {
      document.getElementById('workload-resources')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 180)
  }

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      maxWidth="sm"
      fullWidth
      aria-labelledby="rightsizing-title"
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            mx: 2,
            maxHeight: 'calc(100dvh - 32px)',
            overflow: 'auto',
            border: `1px solid ${colors.line}`,
            boxShadow: '0 24px 60px rgba(18, 23, 42, 0.16)',
          },
        },
      }}
    >
      <Box sx={{ height: 4, bgcolor: colors.navy }} />
      <Stack spacing={2} sx={{ px: { xs: 2.5, sm: 3.5 }, pt: 3, pb: 2.5 }}>
        <Typography id="rightsizing-title" sx={{ fontSize: { xs: 20, sm: 22 }, fontWeight: 700, letterSpacing: -0.3, lineHeight: 1.3 }}>
          {rightsizingTitle}
        </Typography>
        <Typography sx={hebrewText}>{rightsizingBody}</Typography>
        <Typography sx={{ ...hebrewText, fontWeight: 600 }}>{rightsizingGoal}</Typography>
        <Typography sx={hebrewText}>
          את השימוש בזה אפשר לראות בכרטיס{' '}
          <Box
            component="button"
            type="button"
            onClick={showExample}
            sx={{
              border: 0,
              p: 0,
              bgcolor: 'transparent',
              color: colors.userCpu,
              font: 'inherit',
              fontWeight: 700,
              cursor: 'pointer',
              textDecoration: 'underline',
              textUnderlineOffset: 3,
            }}
          >
            Requests and limits
          </Box>{' '}
          בעמוד.
        </Typography>
        <Box sx={{ direction: 'rtl', borderTop: `1px solid ${colors.line}`, pt: 2 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 15, mb: 1.25 }}>העמוד מחולק לשלושה חלקים</Typography>
          <Stack spacing={1.5}>
            {pageParts.map((part, index) => (
              <Stack key={part.title} direction="row" useFlexGap spacing={2} sx={{ alignItems: 'flex-start' }}>
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    bgcolor: colors.navy,
                    color: '#fff',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                    flexShrink: 0,
                    mt: 0.15,
                  }}
                >
                  {index + 1}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: 14, lineHeight: 1.4 }}>{part.title}</Typography>
                  <Typography sx={{ color: 'text.secondary', fontSize: 14, lineHeight: 1.55, mt: 0.25 }}>{part.detail}</Typography>
                </Box>
              </Stack>
            ))}
          </Stack>
        </Box>
        <Button variant="contained" disableElevation onClick={() => setOpen(false)} sx={{ alignSelf: 'flex-end', minWidth: 96, borderRadius: '14px' }}>
          הבנתי
        </Button>
      </Stack>
    </Dialog>
  )
}
