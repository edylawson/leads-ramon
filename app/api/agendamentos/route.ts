import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import { dayRangeUtc, getBookingSettings, zonedDateTimeToUtc, type BusyInterval } from '@/lib/booking'
import { createCalendarEvent, getCalendarBusyIntervals, getCalendarConfig } from '@/lib/googleCalendar'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false })

const STAGE_REUNIAO = 'reuniao_agendada'

type LeadLookup = {
  id: number
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  empresa: string | null
  responsavel_id: number | null
  stage: string | null
}

function getNameFromLead(lead: LeadLookup | null) {
  if (!lead) return ''
  return [lead.first_name, lead.last_name].filter(Boolean).join(' ')
}

async function findLead(input: { lead_id?: number; email?: string; response_id?: string }) {
  const conditions: string[] = []
  const values: (string | number)[] = []

  if (input.lead_id) {
    values.push(input.lead_id)
    conditions.push(`id = $${values.length}`)
  }
  if (input.email) {
    values.push(input.email.toLowerCase())
    conditions.push(`LOWER(email) = $${values.length}`)
  }
  if (input.response_id) {
    values.push(input.response_id)
    conditions.push(`response_id = $${values.length}`)
  }

  if (!conditions.length) return null

  const result = await pool.query(
    `SELECT id, first_name, last_name, email, phone, empresa, responsavel_id, stage
     FROM leads
     WHERE ${conditions.join(' OR ')}
     ORDER BY COALESCE(submit_date, created_at) DESC NULLS LAST
     LIMIT 1`,
    values,
  )

  return (result.rows[0] ?? null) as LeadLookup | null
}

async function getLocalBusy(start: string, end: string): Promise<BusyInterval[]> {
  const result = await pool.query(
    `SELECT inicio, fim
     FROM agendamentos
     WHERE status = 'agendado'
       AND inicio < $2
       AND fim > $1`,
    [start, end],
  )

  return result.rows.map(row => ({
    start: new Date(row.inicio).toISOString(),
    end: new Date(row.fim).toISOString(),
  }))
}

function hasConflict(start: Date, end: Date, busy: BusyInterval[]) {
  return busy.some(interval => {
    const busyStart = new Date(interval.start)
    const busyEnd = new Date(interval.end)
    return start < busyEnd && end > busyStart
  })
}

async function markLeadMeetingScheduled(lead: LeadLookup | null, responsavelId: number | null) {
  if (!lead || lead.stage === STAGE_REUNIAO) return

  await pool.query(
    `UPDATE leads
     SET stage = $1,
         stage_date = NOW(),
         reuniao_em = COALESCE(reuniao_em, NOW())
     WHERE id = $2`,
    [STAGE_REUNIAO, lead.id],
  )

  await pool.query(
    `INSERT INTO leads_historico_estagios (lead_id, estagio_de, estagio_para, responsavel_id)
     VALUES ($1, $2, $3, $4)`,
    [lead.id, lead.stage, STAGE_REUNIAO, responsavelId],
  )
}

export async function GET(req: NextRequest) {
  const config = getCalendarConfig()
  const from = req.nextUrl.searchParams.get('from')
  const to = req.nextUrl.searchParams.get('to')

  const today = new Date().toISOString().slice(0, 10)
  const defaultRange = dayRangeUtc(today, config.timeZone)
  const rangeStart = from ? new Date(from) : defaultRange.start
  const rangeEnd = to ? new Date(to) : new Date(defaultRange.start.getTime() + 30 * 24 * 60 * 60 * 1000)

  try {
    const result = await pool.query(
      `SELECT
        a.id,
        a.lead_id,
        a.responsavel_id,
        a.google_event_id,
        a.google_event_link,
        a.titulo,
        a.nome,
        a.email,
        a.telefone,
        a.empresa,
        a.inicio,
        a.fim,
        a.timezone,
        a.status,
        a.observacoes,
        a.criado_em,
        l.origem,
        l.origem_lead,
        r.nome AS responsavel_nome
       FROM agendamentos a
       LEFT JOIN leads l ON l.id = a.lead_id
       LEFT JOIN responsaveis r ON r.id = a.responsavel_id
       WHERE a.inicio >= $1
         AND a.inicio < $2
       ORDER BY a.inicio ASC`,
      [rangeStart.toISOString(), rangeEnd.toISOString()],
    )

    return NextResponse.json({
      timeZone: config.timeZone,
      agendamentos: result.rows,
    })
  } catch (error) {
    console.error('Appointments list error:', error)
    return NextResponse.json({ error: 'Erro ao buscar agendamentos.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const date = String(body.date || '')
    const time = String(body.time || '')
    const config = getCalendarConfig()
    const settings = getBookingSettings()

    if (!config.configured) {
      return NextResponse.json({ error: 'Google Calendar ainda nao configurado.' }, { status: 500 })
    }
    if (!date || !time) {
      return NextResponse.json({ error: 'Data e horario sao obrigatorios.' }, { status: 400 })
    }

    const lead = await findLead({
      lead_id: body.lead_id ? Number(body.lead_id) : undefined,
      email: body.email ? String(body.email) : undefined,
      response_id: body.response_id ? String(body.response_id) : undefined,
    })

    const nome = String(body.nome || body.name || getNameFromLead(lead) || '').trim()
    const email = String(body.email || lead?.email || '').trim().toLowerCase()
    const telefone = String(body.telefone || body.phone || lead?.phone || '').trim() || null
    const empresa = String(body.empresa || body.company || lead?.empresa || '').trim() || null
    const observacoes = String(body.observacoes || '').trim() || null
    const responsavelId = lead?.responsavel_id ?? (body.responsavel_id ? Number(body.responsavel_id) : null)

    if (!nome || !email) {
      return NextResponse.json({ error: 'Nome e email sao obrigatorios.' }, { status: 400 })
    }

    const start = zonedDateTimeToUtc(date, time, settings.timeZone)
    const end = new Date(start.getTime() + settings.slotMinutes * 60 * 1000)
    if (start < new Date()) {
      return NextResponse.json({ error: 'Escolha um horario futuro.' }, { status: 400 })
    }

    const localBusy = await getLocalBusy(start.toISOString(), end.toISOString())
    const googleBusy = await getCalendarBusyIntervals(start.toISOString(), end.toISOString())
    if (hasConflict(start, end, [...localBusy, ...googleBusy])) {
      return NextResponse.json({ error: 'Esse horario acabou de ficar indisponivel. Escolha outro horario.' }, { status: 409 })
    }

    const title = `Diagnostico High Digital - ${empresa || nome}`
    const description = [
      `Lead: ${nome}`,
      `Email: ${email}`,
      telefone ? `Telefone: ${telefone}` : null,
      empresa ? `Empresa: ${empresa}` : null,
      lead ? `Lead ID: ${lead.id}` : null,
      observacoes ? `Observacoes: ${observacoes}` : null,
    ].filter(Boolean).join('\n')

    const event = await createCalendarEvent({
      summary: title,
      description,
      start: start.toISOString(),
      end: end.toISOString(),
      timeZone: settings.timeZone,
    })

    const insert = await pool.query(
      `INSERT INTO agendamentos (
        lead_id, responsavel_id, calendar_id, google_event_id, google_event_link,
        titulo, nome, email, telefone, empresa, inicio, fim, timezone, status, observacoes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'agendado', $14)
      RETURNING *`,
      [
        lead?.id ?? null,
        responsavelId,
        config.calendarId,
        event.id,
        event.htmlLink ?? null,
        title,
        nome,
        email,
        telefone,
        empresa,
        start.toISOString(),
        end.toISOString(),
        settings.timeZone,
        observacoes,
      ],
    )

    await markLeadMeetingScheduled(lead, responsavelId)

    return NextResponse.json({ agendamento: insert.rows[0] }, { status: 201 })
  } catch (error) {
    console.error('Appointment create error:', error)
    return NextResponse.json({ error: 'Erro ao criar agendamento.' }, { status: 500 })
  }
}
