import { useParams } from 'react-router-dom'

export function TiketDetaljPage() {
  const { id } = useParams()
  return (
    <div>
      <h1 className="text-2xl font-semibold">Tiket {id}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        TODO: read view + comment thread + attach files.
      </p>
    </div>
  )
}
