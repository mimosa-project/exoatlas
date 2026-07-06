type RangeFieldProps = {
  label: string
  minValue: number | null
  maxValue: number | null
  onMinChange: (value: number | null) => void
  onMaxChange: (value: number | null) => void
  minInputId: string
  maxInputId: string
  step?: number | 'any'
  disabled?: boolean
}

function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return null
  }

  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

function formatOptionalNumber(value: number | null): string {
  return value == null ? '' : String(value)
}

export function RangeField({
  label,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  minInputId,
  maxInputId,
  step = 'any',
  disabled = false,
}: RangeFieldProps) {
  return (
    <fieldset className="range-field" disabled={disabled}>
      <legend className="range-field__label">{label}</legend>
      <div className="range-field__inputs">
        <label className="range-field__control" htmlFor={minInputId}>
          <span className="range-field__control-label">Min</span>
          <input
            id={minInputId}
            className="range-field__input"
            type="number"
            inputMode="decimal"
            step={step}
            value={formatOptionalNumber(minValue)}
            onChange={(event) => onMinChange(parseOptionalNumber(event.target.value))}
          />
        </label>
        <label className="range-field__control" htmlFor={maxInputId}>
          <span className="range-field__control-label">Max</span>
          <input
            id={maxInputId}
            className="range-field__input"
            type="number"
            inputMode="decimal"
            step={step}
            value={formatOptionalNumber(maxValue)}
            onChange={(event) => onMaxChange(parseOptionalNumber(event.target.value))}
          />
        </label>
      </div>
    </fieldset>
  )
}
