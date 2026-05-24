import { Navigate, NavLink, Outlet } from 'react-router-dom'
import {
  Archive,
  Calendar,
  Loader2,
  LogOut,
  Mic,
  Settings,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { signOut, useSession } from '@/lib/auth'
import { PdvDecisionGate } from '@/components/PdvDecisionGate'

const navItems = [
  { to: '/app/tabla', label: 'Tabla', Icon: Calendar },
  { to: '/app/klijenti', label: 'Klijenti', Icon: Users },
  // Recording uses the browser mic, which is unreliable on phones — Snimi is
  // desktop-only; on mobile users record via the native app.
  { to: '/app/snimi', label: 'Snimi', Icon: Mic, desktopOnly: true },
  { to: '/app/arhiva', label: 'Arhiva', Icon: Archive },
  { to: '/app/podesavanja', label: 'Podešavanja', Icon: Settings },
]

export function AppLayout() {
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
          {navItems.map(({ to, label, Icon, desktopOnly }) => (
            <li
              key={to}
              className={cn(
                'flex-1 md:flex-none',
                desktopOnly && 'hidden md:block',
              )}
            >
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

        {/* Sign-out: desktop-only footer in sidebar */}
        <div className="hidden md:block md:mt-2">
          <button
            type="button"
            onClick={() => void signOut()}
            className={cn(
              'flex w-full items-center gap-3 px-3 py-2 rounded-md text-sm',
              'text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors',
            )}
          >
            <LogOut className="size-4" />
            <span>Odjavi se</span>
          </button>
        </div>
      </nav>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>

      <PdvDecisionGate />
    </div>
  )
}
