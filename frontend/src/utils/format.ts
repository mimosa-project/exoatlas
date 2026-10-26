export const NOT_AVAILABLE_TEXT = 'Not available'

type FormatOptions = {
  missingText?: string
}

type UnitFormatSettings = FormatOptions & {
  fractionDigits?: number
  separator?: string
}

function formatWithUnit(
  value: number | null,
  unit: string,
  {
    missingText = NOT_AVAILABLE_TEXT,
    fractionDigits = 2,
    separator = ' ',
  }: UnitFormatSettings = {},
): string {
  if (value == null) {
    return missingText
  }

  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value)

  return `${formatted}${separator}${unit}`
}

export function formatOrbitalPeriod(
  value: number | null,
  options?: FormatOptions,
): string {
  return formatWithUnit(value, 'd', options)
}

export function formatRadius(
  value: number | null,
  options?: FormatOptions,
): string {
  return formatWithUnit(value, 'R_Earth', options)
}

export function formatMass(
  value: number | null,
  options?: FormatOptions,
): string {
  return formatWithUnit(value, 'M_Earth', options)
}

export function formatDistance(
  value: number | null,
  options?: FormatOptions,
): string {
  return formatWithUnit(value, 'pc', options)
}

export function formatTemperature(
  value: number | null,
  options?: FormatOptions,
): string {
  return formatWithUnit(value, 'K', { ...options, fractionDigits: 0 })
}

export function formatSemiMajorAxis(
  value: number | null,
  options?: FormatOptions,
): string {
  return formatWithUnit(value, 'AU', options)
}

export function formatDensity(
  value: number | null,
  options?: FormatOptions,
): string {
  return formatWithUnit(value, 'g/cm³', options)
}

export function formatStellarRadius(
  value: number | null,
  options?: FormatOptions,
): string {
  return formatWithUnit(value, 'R_Sun', options)
}

export function formatStellarMass(
  value: number | null,
  options?: FormatOptions,
): string {
  return formatWithUnit(value, 'M_Sun', options)
}

export function formatDegrees(
  value: number | null,
  options?: FormatOptions,
): string {
  return formatWithUnit(value, '°', { ...options, fractionDigits: 4, separator: '' })
}
