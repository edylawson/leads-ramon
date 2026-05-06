import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import { buildBookingSlots, dayRangeUtc, type BusyInterval } from '@/lib/booking'
import { getCalendarBusyIntervals, getCalendarConfig } from '@/lib/googleCalendar'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false })

async function getLocalBusyIntervals(start: string, end: string): Promise<BusyInterval[]> {
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

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date')
  const config = getCalendarConfig()

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Informe uma data valida no formato YYYY-MM-DD.' }, { status: 400 })
  }

  try {
    const range = dayRangeUtc(date, config.timeZone)
    const localBusy = await getLocalBusyIntervals(range.start.toISOString(), range.end.toISOString())
    let googleBusy: BusyInterval[] = []
    let calendarWarning: string | null = null

    if (config.configured) {
      try {
        googleBusy = await getCalendarBusyIntervals(range.start.toISOString(), range.end.toISOString())
      } catch (error) {
        console.error('Google freeBusy error:', error)
        calendarWarning = 'Nao foi possivel consultar a agenda do Google. Conferir configuracao antes de aceitar agendamentos.'
      }
    } else {
      calendarWarning = 'Google Calendar ainda nao configurado neste ambiente.'
    }

    const slots = buildBookingSlots(date, [...localBusy, ...googleBusy])

    return NextResponse.json({
      date,
      timeZone: config.timeZone,
      calendarConfigured: config.configured,
      calendarWarning,
      slots,
    })
  } catch (error) {
    console.error('Availability error:', error)
    return NextResponse.json({ error: 'Erro ao buscar disponibilidade.' }, { status: 500 })
  }
}
