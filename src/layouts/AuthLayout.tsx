import { Outlet } from 'react-router-dom'

export function AuthLayout() {
  return (
    <div className="flex h-full items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Outlet />
      </div>
    </div>
  )
}
