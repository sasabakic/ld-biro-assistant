import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '@/lib/cn'

export function PortalLayout() {
  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="text-lg font-semibold tracking-tight">LD Biro · Portal</div>
          <nav className="flex gap-4 text-sm">
            <NavLink
              to="/portal/zahtevi"
              className={({ isActive }) =>
                cn(
                  'hover:text-foreground',
                  isActive ? 'text-foreground font-medium' : 'text-muted-foreground',
                )
              }
            >
              Moji zahtevi
            </NavLink>
            <NavLink
              to="/portal/novi-zahtev"
              className={({ isActive }) =>
                cn(
                  'hover:text-foreground',
                  isActive ? 'text-foreground font-medium' : 'text-muted-foreground',
                )
              }
            >
              Novi zahtev
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-4xl px-4 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
