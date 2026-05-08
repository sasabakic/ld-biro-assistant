export type TicketType = 'pitanje' | 'zaduzenje' | 'javicu_se'

export type Ticket = {
  id: string
  columnId: string
  clientName: string
  type: TicketType
  title: string
  rok: string | null
  planiranoZa: 'danas' | 'sutra' | null
}

export type ColumnDef = {
  id: string
  name: string
}
