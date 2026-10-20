export const colors = {
  navy: '#12172A',
  ink: '#1B2437',
  slate: '#667085',
  green: '#16A34A',
  blue: '#3B82F6',
  pink: '#FB7185',
  healthy: '#16A34A',
  healthyBg: '#ECFDF3',
  healthyBorder: '#BBF7D0',
  warning: '#E11D48',
  warningBg: '#FFF1F2',
  warningBorder: '#FECDD3',
  critical: '#BE123C',
  criticalBg: '#FFF1F2',
  criticalBorder: '#FECDD3',
  surface: '#F4F6FB',
  tint: '#ECFDF3',
  tintHover: '#DCFCE7',
  line: '#E6EAF2',
  track: '#EEF2F6',
  paperMuted: '#F8FAFC',
  grid: '#EEF2F6',
  tick: '#98A2B3',
  userWorkload: '#4C6EF5',
  feedWorkload: '#12B886',
  userCpu: '#4C6EF5',
  userMemory: '#E64980',
  feedCpu: '#12B886',
  feedMemory: '#FD7E14',
  checkoutCpu: '#7C3AED',
  checkoutMemory: '#A855F7',
  searchCpu: '#0891B2',
  searchMemory: '#06B6D4',
  billingCpu: '#C2410C',
  billingMemory: '#EA580C',
}

export const seriesColors = ['#22C55E', '#3B82F6', '#FB7185', '#8B5CF6', '#F59E0B']

export function workloadTone(name: string) {
  if (name.startsWith('feed')) return { cpu: colors.feedCpu, memory: colors.feedMemory }
  if (name.startsWith('checkout')) return { cpu: colors.checkoutCpu, memory: colors.checkoutMemory }
  if (name.startsWith('search')) return { cpu: colors.searchCpu, memory: colors.searchMemory }
  if (name.startsWith('billing')) return { cpu: colors.billingCpu, memory: colors.billingMemory }
  return { cpu: colors.userCpu, memory: colors.userMemory }
}
