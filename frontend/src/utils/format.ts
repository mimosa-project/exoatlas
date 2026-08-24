const NOT_AVAILABLE_TEXT = 'Not available'

type FormatOptions = {
  missingText?: string
}

function formatWithUnit(
  value: number | null,
  unit: string,
  options?: FormatOptions,
): string {
  if (value == null) {
    return options?.missingText ?? NOT_AVAILABLE_TEXT
  }

  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)

  return `${formatted} ${unit}`
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
