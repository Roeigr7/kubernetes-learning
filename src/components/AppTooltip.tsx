import { useEffect, useRef, useState } from 'react'
import { Tooltip, type TooltipProps } from '@mui/material'
import { tooltipPopperSlotProps } from '../theme.ts'

export default function AppTooltip({ slotProps, onOpen, onClose, ...props }: TooltipProps) {
  const [open, setOpen] = useState(false)
  const holdClosed = useRef(false)

  useEffect(() => {
    if (!open) return
    const close = () => {
      holdClosed.current = true
      setOpen(false)
      window.setTimeout(() => {
        holdClosed.current = false
      }, 400)
    }
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (target.closest('.MuiTooltip-tooltip, [aria-describedby]')) return
      close()
    }
    let originX = 0
    let originY = 0
    const onTouchStart = (event: TouchEvent) => {
      originX = event.touches[0]?.clientX ?? 0
      originY = event.touches[0]?.clientY ?? 0
    }
    const onTouchMove = (event: TouchEvent) => {
      const x = event.touches[0]?.clientX ?? 0
      const y = event.touches[0]?.clientY ?? 0
      if (Math.abs(x - originX) > 12 || Math.abs(y - originY) > 12) close()
    }
    window.addEventListener('scroll', close, true)
    window.addEventListener('wheel', close, { capture: true, passive: true })
    window.addEventListener('touchstart', onTouchStart, { capture: true, passive: true })
    window.addEventListener('touchmove', onTouchMove, { capture: true, passive: true })
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('wheel', close, true)
      window.removeEventListener('touchstart', onTouchStart, true)
      window.removeEventListener('touchmove', onTouchMove, true)
      document.removeEventListener('pointerdown', onPointerDown, true)
    }
  }, [open])

  return (
    <Tooltip
      {...props}
      open={open}
      onOpen={(event) => {
        if (holdClosed.current) return
        setOpen(true)
        onOpen?.(event)
      }}
      onClose={(event) => {
        setOpen(false)
        onClose?.(event)
      }}
      slotProps={{
        ...tooltipPopperSlotProps,
        ...slotProps,
        popper: {
          ...tooltipPopperSlotProps.popper,
          ...slotProps?.popper,
        },
        tooltip: slotProps?.tooltip,
      }}
    />
  )
}
