import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'
import { PortalLayout } from './layouts/PortalLayout'
import { AuthLayout } from './layouts/AuthLayout'
import { TablaPage } from './routes/app/TablaPage'
import { KlijentiPage } from './routes/app/KlijentiPage'
import { KlijentDetaljPage } from './routes/app/KlijentDetaljPage'
import { SnimiPage } from './routes/app/SnimiPage'
import { PodesavanjaPage } from './routes/app/PodesavanjaPage'
import { MojiZahteviPage } from './routes/portal/MojiZahteviPage'
import { TiketDetaljPage } from './routes/portal/TiketDetaljPage'
import { NoviZahtevPage } from './routes/portal/NoviZahtevPage'
import { LoginPage } from './routes/auth/LoginPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/app/tabla" replace />,
  },
  {
    path: '/login',
    element: <AuthLayout />,
    children: [{ index: true, element: <LoginPage /> }],
  },
  {
    path: '/app',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/app/tabla" replace /> },
      { path: 'tabla', element: <TablaPage /> },
      { path: 'klijenti', element: <KlijentiPage /> },
      { path: 'klijent/:id', element: <KlijentDetaljPage /> },
      { path: 'snimi', element: <SnimiPage /> },
      { path: 'podesavanja', element: <PodesavanjaPage /> },
    ],
  },
  {
    path: '/portal',
    element: <PortalLayout />,
    children: [
      { index: true, element: <Navigate to="/portal/zahtevi" replace /> },
      { path: 'zahtevi', element: <MojiZahteviPage /> },
      { path: 'zahtev/:id', element: <TiketDetaljPage /> },
      { path: 'novi-zahtev', element: <NoviZahtevPage /> },
    ],
  },
])
