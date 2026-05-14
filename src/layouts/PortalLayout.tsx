import { Navigate, NavLink, Outlet } from 'react-router-dom'
import { Loader2, LogOut } from 'lucide-react'
import { cn } from '@/lib/cn'
import { signOut, useSession } from '@/lib/auth'

export function PortalLayout() {
  const session = useSession()

  if (session.status === 'loading') {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (session.status === 'unauthenticated') {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="text-lg font-semibold tracking-tight">
            LD Biro · Portal
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <NavLink
              to="/portal/zahtevi"
              className={({ isActive }) =>
                cn(
                  'hover:text-foreground',
                  isActive
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground',
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
                  isActive
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground',
                )
              }
            >
              Novi zahtev
            </NavLink>
            <button
              type="button"
              onClick={() => void signOut()}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
              aria-label="Odjavi se"
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Odjavi se</span>
            </button>
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
