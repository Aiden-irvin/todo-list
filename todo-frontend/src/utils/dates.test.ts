import { toDateInput, toIso } from './dates'

describe('dates', () => {
  it('converts between API timestamps and date inputs', () => {
    expect(toDateInput('2026-03-05T00:00:00')).toBe('2026-03-05')
    expect(toDateInput(null)).toBe('')
    expect(toIso('2026-03-05')).toBe('2026-03-05T00:00:00Z')
    expect(toIso('')).toBeNull()
  })
})
