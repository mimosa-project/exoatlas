import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  formatDistance,
  formatMass,
  formatOrbitalPeriod,
  formatRadius,
} from './format'

describe('format.ts number formatters', () => {
  it('formats orbital period with a "d" unit', () => {
    expect(formatOrbitalPeriod(326.03)).toBe('326.03 d')
  })

  it('formats radius with an R_Earth unit', () => {
    expect(formatRadius(12.1)).toBe('12.10 R_Earth')
  })

  it('formats mass with a M_Earth unit and thousands separators', () => {
    expect(formatMass(6165.6)).toBe('6,165.60 M_Earth')
  })

  it('formats distance with a pc unit, rounded to 2 decimal places', () => {
    expect(formatDistance(93.1846)).toBe('93.18 pc')
  })

  it.each([
    ['formatOrbitalPeriod', formatOrbitalPeriod, '1,234,567.89 d'],
    ['formatRadius', formatRadius, '1,234,567.89 R_Earth'],
    ['formatMass', formatMass, '1,234,567.89 M_Earth'],
    ['formatDistance', formatDistance, '1,234,567.89 pc'],
  ] as const)(
    '%s formats large numbers with en-US grouping/decimal separators',
    (_name, fn, expected) => {
      expect(fn(1234567.89)).toBe(expected)
    },
  )

  describe('locale is explicitly pinned to en-US (not left to the runtime default)', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it.each([
      ['formatOrbitalPeriod', formatOrbitalPeriod],
      ['formatRadius', formatRadius],
      ['formatMass', formatMass],
      ['formatDistance', formatDistance],
    ] as const)('%s passes "en-US" as the Intl.NumberFormat locale argument', (_name, fn) => {
      const RealNumberFormat = Intl.NumberFormat
      const numberFormatSpy = vi
        .spyOn(Intl, 'NumberFormat')
        .mockImplementation(function (...args) {
          // `format.ts` calls `new Intl.NumberFormat(...)`; per the ECMA-402
          // spec, Intl.NumberFormat may also be invoked without `new` and
          // still returns a proper instance, so this is safe to return
          // directly from a constructor call.
          return RealNumberFormat(...args)
        })

      fn(1234567.89)

      expect(numberFormatSpy).toHaveBeenCalled()
      for (const call of numberFormatSpy.mock.calls) {
        expect(call[0]).toBe('en-US')
      }
    })
  })

  it.each([
    ['formatOrbitalPeriod', formatOrbitalPeriod],
    ['formatRadius', formatRadius],
    ['formatMass', formatMass],
    ['formatDistance', formatDistance],
  ] as const)('%s returns "Not available" for null by default', (_name, fn) => {
    expect(fn(null)).toBe('Not available')
  })

  it.each([
    ['formatOrbitalPeriod', formatOrbitalPeriod],
    ['formatRadius', formatRadius],
    ['formatMass', formatMass],
    ['formatDistance', formatDistance],
  ] as const)(
    '%s returns the provided missingText for null when given one',
    (_name, fn) => {
      expect(fn(null, { missingText: '-' })).toBe('-')
    },
  )

  it.each([
    ['formatOrbitalPeriod', formatOrbitalPeriod, '0.00 d'],
    ['formatRadius', formatRadius, '0.00 R_Earth'],
    ['formatMass', formatMass, '0.00 M_Earth'],
    ['formatDistance', formatDistance, '0.00 pc'],
  ] as const)(
    '%s treats 0 as a real value, distinct from null',
    (_name, fn, expected) => {
      expect(fn(0)).toBe(expected)
    },
  )
})
