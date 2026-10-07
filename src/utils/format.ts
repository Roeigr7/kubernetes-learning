export function titleCase(value: string): string {
  if (!value) return value
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function formatPercent(value: number): string {
  const rounded = Math.round(value * 10) / 10
  return `${rounded}%`
}
