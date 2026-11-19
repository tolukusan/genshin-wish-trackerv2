import { parseISO, startOfDay } from 'date-fns'

// Banner pickers list only banners that are running or upcoming. A banner that
// is already selected stays listed so the picker never loses its value.
export function isSelectableBanner(phaseEndDate: string, isSelected: boolean, today = new Date()): boolean {
  return isSelected || parseISO(phaseEndDate) > startOfDay(today)
}
