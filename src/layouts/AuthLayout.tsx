import { Navigate, Outlet } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useSession } from '@/lib/auth'

export function AuthLayout() {
  const session = useSession()

  // Already signed in — bounce to the app instead of letting them re-login.
  if (session.status === 'loading') {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (session.status === 'authenticated') {
    return <Navigate to="/app/tabla" replace />
  }

  return (
    <div className="flex h-full items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Outlet />
      </div>
    </div>
  )
}
