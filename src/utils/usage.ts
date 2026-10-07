export function usageColor(value: number): string {
  if (value >= 80) return '#D92D20'
  if (value >= 65) return '#DC6803'
  return '#155EEF'
}
