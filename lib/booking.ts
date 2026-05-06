export type BusyInterval = {
  start: string
  end: string
}

export type BookingSlot = {
  time: string
  label: string
  start: string
  end: string
  available: boolean
}

export function getBookingSettings() {
  return {
    timeZone: process.env.BOOKING_TIME_ZONE || process.env.GOOGLE_CALENDAR_TIME_ZONE || 'America/New_York',
    startHour: Number(process.env.BOOKING_START_HOUR || 9),
    endHour: Number(process.env.BOOKING_END_HOUR || 17),
    slotMinutes: Number(process.env.BOOKING_SLOT_MINUTES || 30),
  }
}

function partsInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date)

  const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  }
}

function timeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = partsInTimeZone(date, timeZone)
  const utcFromParts = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  )
  return utcFromParts - date.getTime()
}

export function zonedDateTimeToUtc(date: string, time: string, timeZone: string) {
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0))
  const offset = timeZoneOffsetMs(utcGuess, timeZone)
  return new Date(utcGuess.getTime() - offset)
}

export function addDays(date: string, days: number) {
  const [year, month, day] = date.split('-').map(Number)
  const value = new Date(Date.UTC(year, month - 1, day + days, 0, 0, 0))
  return value.toISOString().slice(0, 10)
}

export function formatTimeLabel(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

export function formatDateTimeLabel(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

export function dayRangeUtc(date: string, timeZone: string) {
  return {
    start: zonedDateTimeToUtc(date, '00:00', timeZone),
    end: zonedDateTimeToUtc(addDays(date, 1), '00:00', timeZone),
  }
}

function overlaps(start: Date, end: Date, busy: BusyInterval) {
  const busyStart = new Date(busy.start)
  const busyEnd = new Date(busy.end)
  return start < busyEnd && end > busyStart
}

function padTime(hour: number, minute: number) {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

export function buildBookingSlots(date: string, busyIntervals: BusyInterval[]) {
  const settings = getBookingSettings()
  const slots: BookingSlot[] = []
  const now = new Date()
  const latestStartMinute = settings.endHour * 60 - settings.slotMinutes

  for (let minuteOfDay = settings.startHour * 60; minuteOfDay <= latestStartMinute; minuteOfDay += settings.slotMinutes) {
    const hour = Math.floor(minuteOfDay / 60)
    const minute = minuteOfDay % 60
    const time = padTime(hour, minute)
    const start = zonedDateTimeToUtc(date, time, settings.timeZone)
    const end = new Date(start.getTime() + settings.slotMinutes * 60 * 1000)
    const busy = busyIntervals.some(interval => overlaps(start, end, interval))
    const past = start < now

    slots.push({
      time,
      label: formatTimeLabel(start.toISOString(), settings.timeZone),
      start: start.toISOString(),
      end: end.toISOString(),
      available: !busy && !past,
    })
  }

  return slots
}
