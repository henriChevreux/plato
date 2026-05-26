import { NavLink } from 'react-router-dom'
import { Banner } from './Banner'

const navItems = [
  { to: '/', label: 'Feed', exact: true },
  { to: '/search', label: 'Search' },
  { to: '/saved', label: 'Saved' },
  { to: '/topics', label: 'Topics' },
  { to: '/settings', label: 'Settings' },
]

export function Layout({ children }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-48 shrink-0 border-r border-border flex flex-col fixed h-full bg-bg z-10">
        <div className="px-6 py-8">
          <span className="text-accent tracking-[0.25em] text-sm font-light uppercase">
            PLATO
          </span>
        </div>
        <nav className="flex flex-col gap-1 px-3">
          {navItems.map(({ to, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'text-text border-l border-accent pl-[11px]'
                    : 'text-muted hover:text-text'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto px-6 py-6 text-xs text-subtle">
          consume wisely
        </div>
      </aside>
      <main className="ml-48 flex-1 min-h-screen overflow-x-hidden">
        <Banner />
        {children}
      </main>
    </div>
  )
}
