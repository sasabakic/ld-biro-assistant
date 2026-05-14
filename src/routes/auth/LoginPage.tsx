import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Formik, Form, Field, ErrorMessage } from 'formik'
import * as Yup from 'yup'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/cn'

const loginSchema = Yup.object({
  email: Yup.string()
    .email('Neispravan format email-a')
    .required('Email je obavezan'),
  password: Yup.string().required('Lozinka je obavezna'),
})

export function LoginPage() {
  const navigate = useNavigate()
  const [authError, setAuthError] = useState<string | null>(null)

  return (
    <Formik
      initialValues={{ email: '', password: '' }}
      validationSchema={loginSchema}
      onSubmit={async (values, { setSubmitting }) => {
        setAuthError(null)

        const { error } = await supabase.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        })

        if (error) {
          // Generic message regardless of error class — avoids leaking which
          // field was wrong (email enumeration) or whether the user exists.
          setAuthError('Pogrešni podaci za prijavu')
          setSubmitting(false)
          return
        }

        // Routing decision: send everyone to /app/tabla and let AppLayout
        // redirect klijent users to /portal based on their membership.
        navigate('/app/tabla', { replace: true })
      }}
    >
      {({ isSubmitting, errors, touched }) => (
        <Form
          noValidate
          className="space-y-4 rounded-lg border border-border bg-background p-6 shadow-sm"
        >
          <div className="space-y-1">
            <h1 className="text-xl font-semibold">Prijava</h1>
            <p className="text-sm text-muted-foreground">
              Pristupi svojoj LD Biro tabli.
            </p>
          </div>

          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              Email
            </label>
            <Field
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="username"
              autoFocus
              disabled={isSubmitting}
              className={cn(
                'w-full rounded-md border bg-background px-3 py-2 text-sm',
                'focus:outline-none focus:ring-2 focus:ring-primary/40',
                'disabled:opacity-50',
                touched.email && errors.email
                  ? 'border-destructive'
                  : 'border-border',
              )}
            />
            <ErrorMessage
              name="email"
              component="div"
              className="mt-1 text-xs text-destructive"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium">
              Lozinka
            </label>
            <Field
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              disabled={isSubmitting}
              className={cn(
                'w-full rounded-md border bg-background px-3 py-2 text-sm',
                'focus:outline-none focus:ring-2 focus:ring-primary/40',
                'disabled:opacity-50',
                touched.password && errors.password
                  ? 'border-destructive'
                  : 'border-border',
              )}
            />
            <ErrorMessage
              name="password"
              component="div"
              className="mt-1 text-xs text-destructive"
            />
          </div>

          {authError && (
            <div
              role="alert"
              className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {authError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className={cn(
              'flex w-full items-center justify-center gap-2',
              'rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground',
              'transition hover:bg-primary/90',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            {isSubmitting ? 'Prijavljujem...' : 'Prijavi se'}
          </button>
        </Form>
      )}
    </Formik>
  )
}
