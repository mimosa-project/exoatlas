import { useState, type ReactNode } from 'react'

type AppShellProps = {
  header: ReactNode
  sidebar: ReactNode
  children: ReactNode
  drawer?: ReactNode
}

export function AppShell({ header, sidebar, children, drawer }: AppShellProps) {
  const [filtersOpen, setFiltersOpen] = useState(false)

  return (
    <div className="app-shell">
      {header}

      <div className="app-shell__toolbar">
        <button
          type="button"
          className="app-shell__filter-toggle"
          aria-expanded={filtersOpen}
          aria-controls="app-shell-filters"
          onClick={() => setFiltersOpen((open) => !open)}
        >
          {filtersOpen ? 'Hide filters' : 'Show filters'}
        </button>
      </div>

      <div className="app-shell__body">
        <aside
          id="app-shell-filters"
          className={`app-shell__sidebar${filtersOpen ? ' app-shell__sidebar--open' : ''}`}
        >
          {sidebar}
        </aside>

        <main className="app-shell__main">{children}</main>
      </div>

      {drawer ? <div className="app-shell__drawer">{drawer}</div> : null}
    </div>
  )
}
