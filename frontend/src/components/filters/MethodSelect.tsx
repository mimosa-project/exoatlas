type MethodSelectProps = {
  label: string
  value: string | null
  options: string[]
  onChange: (value: string | null) => void
  disabled?: boolean
}

export function MethodSelect({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: MethodSelectProps) {
  return (
    <div className="method-select">
      <label className="method-select__label" htmlFor="filter-discovery-method">
        {label}
      </label>
      <select
        id="filter-discovery-method"
        className="method-select__input"
        value={value ?? ''}
        disabled={disabled}
        onChange={(event) =>
          onChange(event.target.value.length > 0 ? event.target.value : null)
        }
      >
        <option value="">All methods</option>
        {options.map((method) => (
          <option key={method} value={method}>
            {method}
          </option>
        ))}
      </select>
    </div>
  )
}
