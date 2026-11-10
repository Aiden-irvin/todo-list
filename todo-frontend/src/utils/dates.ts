export const toDateInput = (iso: string | null) => iso?.slice(0, 10) ?? ''
// ponytail: dates are stored as UTC midnight, so no timezone picker; add one if times matter.
export const toIso = (date: string) => (date ? `${date}T00:00:00Z` : null)
