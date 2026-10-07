import { colors } from '../colors.ts'

export function usageColor(value: number): string {
  if (value >= 80) return colors.critical
  if (value >= 65) return colors.warning
  return colors.green
}
