import { useParams } from 'react-router-dom'

export function KlijentDetaljPage() {
  const { id } = useParams()
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Klijent {id}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        TODO: tabs — Tiketi / Korisnici / Recurring / Beleške.
      </p>
    </div>
  )
}
