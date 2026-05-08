import { NavLink, Outlet } from 'react-router-dom'
import { Calendar, Mic, Settings, Users } from 'lucide-react'
import { cn } from '@/lib/cn'

const navItems = [
  { to: '/app/tabla', label: 'Tabla', Icon: Calendar },
  { to: '/app/klijenti', label: 'Klijenti', Icon: Users },
  { to: '/app/snimi', label: 'Snimi', Icon: Mic },
  { to: '/app/podesavanja', label: 'Podešavanja', Icon: Settings },
]

export function AppLayout() {
  return (
    <div className="flex h-full flex-col md:flex-row">
      {/* Sidebar (desktop) / bottom bar (mobile) */}
      <nav
        className={cn(
          'order-last md:order-first md:w-56 md:border-r border-t md:border-t-0',
          'border-border bg-background',
          'flex md:flex-col md:py-6 md:px-3',
        )}
      >
        <div className="hidden md:block px-3 pb-6 text-lg font-semibold tracking-tight">
          LD Biro
        </div>
        <ul className="flex flex-1 md:flex-col">
          {navItems.map(({ to, label, Icon }) => (
            <li key={to} className="flex-1 md:flex-none">
              <NavLink
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-3',
                    'px-3 py-3 md:py-2 md:rounded-md text-sm transition-colors',
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                  )
                }
              >
                <Icon className="size-5 md:size-4" />
                <span className="text-xs md:text-sm">{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
