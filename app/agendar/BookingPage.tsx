'use client'

import { useEffect, useMemo, useState } from 'react'

type LeadLookup = {
  id: number
  nome: string
  email: string
  telefone: string | null
  empresa: string | null
  segmento: string | null
}

type Slot = {
  time: string
  label: string
  start: string
  end: string
  available: boolean
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function formatDateTime(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone,
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

export default function BookingPage({ initialLeadId, initialEmail, initialResponseId, initialName, initialPhone, initialCompany }: {
  initialLeadId?: string
  initialEmail?: string
  initialResponseId?: string
  initialName?: string
  initialPhone?: string
  initialCompany?: string
}) {
  const [lead, setLead] = useState<LeadLookup | null>(null)
  const [nome, setNome] = useState(initialName || '')
  const [email, setEmail] = useState(initialEmail || '')
  const [telefone, setTelefone] = useState(initialPhone || '')
  const [empresa, setEmpresa] = useState(initialCompany || '')
  const [date, setDate] = useState(todayIso())
  const [slots, setSlots] = useState<Slot[]>([])
  const [selectedTime, setSelectedTime] = useState('')
  const [timeZone, setTimeZone] = useState('America/New_York')
  const [calendarWarning, setCalendarWarning] = useState<string | null>(null)
  const [loadingLead, setLoadingLead] = useState(Boolean(initialLeadId || initialEmail || initialResponseId))
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<{ inicio: string } | null>(null)

  const selectedSlot = useMemo(
    () => slots.find(slot => slot.time === selectedTime) ?? null,
    [slots, selectedTime],
  )

  useEffect(() => {
    const params = new URLSearchParams()
    if (initialLeadId) params.set('lead_id', initialLeadId)
    if (initialEmail) params.set('email', initialEmail)
    if (initialResponseId) params.set('response_id', initialResponseId)
    if (!params.toString()) return

    setLoadingLead(true)
    fetch(`/api/agendamentos/lead?${params.toString()}`)
      .then(response => response.json())
      .then(data => {
        if (!data.lead) return
        setLead(data.lead)
        setNome(current => current || data.lead.nome || '')
        setEmail(current => current || data.lead.email || initialEmail || '')
        setTelefone(current => current || data.lead.telefone || '')
        setEmpresa(current => current || data.lead.empresa || '')
      })
      .catch(() => setError('Nao foi possivel carregar seus dados. Voce ainda pode preencher manualmente.'))
      .finally(() => setLoadingLead(false))
  }, [initialEmail, initialLeadId, initialResponseId])

  useEffect(() => {
    setLoadingSlots(true)
    setSelectedTime('')
    fetch(`/api/agendamentos/disponibilidade?date=${date}`)
      .then(response => response.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setSlots(Array.isArray(data.slots) ? data.slots : [])
        setTimeZone(data.timeZone || 'America/New_York')
        setCalendarWarning(data.calendarWarning || null)
      })
      .catch(() => {
        setSlots([])
        setCalendarWarning(null)
        setError('Nao foi possivel carregar horarios disponiveis.')
      })
      .finally(() => setLoadingSlots(false))
  }, [date])

  async function submit() {
    if (!selectedSlot) {
      setError('Escolha um horario para continuar.')
      return
    }
    if (!nome.trim() || !email.trim()) {
      setError('Preencha nome e email para confirmar.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const response = await fetch('/api/agendamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: lead?.id ?? initialLeadId,
          response_id: initialResponseId,
          date,
          time: selectedSlot.time,
          nome,
          email,
          telefone,
          empresa,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Erro ao confirmar agendamento.')
      setSuccess({ inicio: data.agendamento.inicio })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao confirmar agendamento.')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <main className="min-h-screen bg-gray-950 px-4 py-10 text-gray-100">
        <section className="mx-auto max-w-2xl rounded-3xl border border-green-800/70 bg-green-950/20 p-8 text-center shadow-2xl shadow-black/30">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-green-300">Agendamento confirmado</p>
          <h1 className="mt-4 text-3xl font-bold text-white">Seu horario foi reservado.</h1>
          <p className="mt-4 text-gray-300">
            Marcamos sua conversa para <strong className="text-green-200">{formatDateTime(success.inicio, timeZone)}</strong>.
          </p>
          <p className="mt-3 text-sm text-gray-500">
            A equipe da High Digital tera esse compromisso registrado na agenda interna.
          </p>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-950 px-4 py-8 text-gray-100">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 rounded-3xl border border-gray-800 bg-gray-900/70 p-6">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-indigo-300">High Digital</p>
          <h1 className="mt-3 text-3xl font-bold text-white">Agende seu diagnostico</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-400">
            Escolha um horario para conversar com a equipe e entender os proximos passos do seu diagnostico.
            Os horarios abaixo seguem a agenda da High Digital.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.35fr]">
          <section className="rounded-3xl border border-gray-800 bg-gray-900/70 p-5">
            <h2 className="text-lg font-semibold text-white">Seus dados</h2>
            {loadingLead && <p className="mt-2 text-sm text-gray-500">Carregando informacoes do lead...</p>}
            <div className="mt-5 grid gap-4">
              <label className="grid gap-1 text-sm">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Nome</span>
                <input value={nome} onChange={event => setNome(event.target.value)} className="rounded-xl border border-gray-700 bg-gray-950 px-3 py-2 text-gray-100 outline-none focus:border-indigo-500" />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Email</span>
                <input type="email" value={email} onChange={event => setEmail(event.target.value)} className="rounded-xl border border-gray-700 bg-gray-950 px-3 py-2 text-gray-100 outline-none focus:border-indigo-500" />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Telefone</span>
                <input value={telefone} onChange={event => setTelefone(event.target.value)} className="rounded-xl border border-gray-700 bg-gray-950 px-3 py-2 text-gray-100 outline-none focus:border-indigo-500" />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Empresa</span>
                <input value={empresa} onChange={event => setEmpresa(event.target.value)} className="rounded-xl border border-gray-700 bg-gray-950 px-3 py-2 text-gray-100 outline-none focus:border-indigo-500" />
              </label>
            </div>
          </section>

          <section className="rounded-3xl border border-gray-800 bg-gray-900/70 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Escolha um horario</h2>
                <p className="mt-1 text-sm text-gray-500">Fuso da agenda: {timeZone}</p>
              </div>
              <label className="grid gap-1 text-sm">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Data</span>
                <input
                  type="date"
                  value={date}
                  min={todayIso()}
                  onChange={event => setDate(event.target.value)}
                  className="rounded-xl border border-gray-700 bg-gray-950 px-3 py-2 text-gray-100 outline-none focus:border-indigo-500 [color-scheme:dark]"
                />
              </label>
            </div>

            {calendarWarning && (
              <div className="mt-4 rounded-2xl border border-yellow-800 bg-yellow-950/30 p-3 text-sm text-yellow-200">
                {calendarWarning}
              </div>
            )}

            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {loadingSlots ? (
                <div className="col-span-full rounded-2xl border border-gray-800 p-8 text-center text-gray-500">Carregando horarios...</div>
              ) : slots.length ? (
                slots.map(slot => (
                  <button
                    key={slot.time}
                    type="button"
                    disabled={!slot.available}
                    onClick={() => setSelectedTime(slot.time)}
                    className={`rounded-2xl border px-3 py-3 text-sm font-semibold transition-colors ${
                      selectedTime === slot.time
                        ? 'border-indigo-400 bg-indigo-600 text-white'
                        : slot.available
                          ? 'border-gray-700 bg-gray-950 text-gray-300 hover:border-indigo-500 hover:text-white'
                          : 'cursor-not-allowed border-gray-800 bg-gray-950/50 text-gray-700'
                    }`}
                  >
                    {slot.label}
                  </button>
                ))
              ) : (
                <div className="col-span-full rounded-2xl border border-gray-800 p-8 text-center text-gray-500">Nenhum horario disponivel nesta data.</div>
              )}
            </div>

            {selectedSlot && (
              <p className="mt-4 rounded-2xl border border-indigo-800 bg-indigo-950/30 p-3 text-sm text-indigo-100">
                Horario selecionado: {formatDateTime(selectedSlot.start, timeZone)}
              </p>
            )}

            {error && (
              <p className="mt-4 rounded-2xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-200">{error}</p>
            )}

            <button
              type="button"
              onClick={submit}
              disabled={submitting || !selectedSlot}
              className="mt-5 w-full rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-800 disabled:text-gray-500"
            >
              {submitting ? 'Confirmando...' : 'Confirmar agendamento'}
            </button>
          </section>
        </div>
      </div>
    </main>
  )
}
