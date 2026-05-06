import BookingPage from './BookingPage'

export const dynamic = 'force-dynamic'

export default function AgendarPage({ searchParams }: {
  searchParams: {
    lead_id?: string
    email?: string
    response_id?: string
    nome?: string
    name?: string
    telefone?: string
    phone?: string
    empresa?: string
    company?: string
  }
}) {
  return (
    <BookingPage
      initialLeadId={searchParams.lead_id}
      initialEmail={searchParams.email}
      initialResponseId={searchParams.response_id}
      initialName={searchParams.nome || searchParams.name}
      initialPhone={searchParams.telefone || searchParams.phone}
      initialCompany={searchParams.empresa || searchParams.company}
    />
  )
}
