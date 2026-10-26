import { describe, expect, it } from 'vitest'
import {
  formatDegrees,
  formatDensity,
  formatSemiMajorAxis,
  formatStellarMass,
  formatStellarRadius,
  formatTemperature,
} from './format'

describe('format.ts detail formatters (AC 1-7)', () => {
  it('formats temperature with K unit, thousands separator and no decimals', () => {
    expect(formatTemperature(4742)).toBe('4,742 K')
    expect(formatTemperature(254.6)).toBe('255 K')
  })

  it('formats semi-major axis with AU unit to 2 decimals', () => {
    expect(formatSemiMajorAxis(1.29)).toBe('1.29 AU')
  })

  it('formats density with g/cm³ unit to 2 decimals', () => {
    expect(formatDensity(19.1)).toBe('19.10 g/cm³')
  })

  it('formats stellar radius with R_Sun unit to 2 decimals', () => {
    expect(formatStellarRadius(19)).toBe('19.00 R_Sun')
  })

  it('formats stellar mass with M_Sun unit to 2 decimals', () => {
    expect(formatStellarMass(2.7)).toBe('2.70 M_Sun')
  })

  it('formats degrees to 4 decimals with no space before the degree sign', () => {
    expect(formatDegrees(185.1787793)).toBe('185.1788°')
    expect(formatDegrees(-5.5)).toBe('-5.5000°')
  })

  it('uses en-US grouping for large values', () => {
    expect(formatSemiMajorAxis(12345.678)).toBe('12,345.68 AU')
    expect(formatDegrees(1234.5)).toBe('1,234.5000°')
  })

  const formatters = [
    ['formatTemperature', formatTemperature, '0 K'],
    ['formatSemiMajorAxis', formatSemiMajorAxis, '0.00 AU'],
    ['formatDensity', formatDensity, '0.00 g/cm³'],
    ['formatStellarRadius', formatStellarRadius, '0.00 R_Sun'],
    ['formatStellarMass', formatStellarMass, '0.00 M_Sun'],
    ['formatDegrees', formatDegrees, '0.0000°'],
  ] as const

  it.each(formatters)('%s returns "Not available" for null', (_name, fn) => {
    expect(fn(null)).toBe('Not available')
  })

  it.each(formatters)('%s returns the given missingText for null', (_name, fn) => {
    expect(fn(null, { missingText: '-' })).toBe('-')
  })

  it.each(formatters)('%s treats 0 as a value, not missing', (_name, fn, expected) => {
    expect(fn(0)).toBe(expected)
    expect(fn(0, { missingText: '-' })).toBe(expected)
  })
})
