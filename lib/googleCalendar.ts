import { createSign } from 'crypto'

type TokenResponse = {
  access_token: string
  expires_in: number
}

type CachedToken = {
  accessToken: string
  expiresAt: number
}

export type CalendarBusyInterval = {
  start: string
  end: string
}

export type CalendarEventInput = {
  summary: string
  description: string
  start: string
  end: string
  timeZone: string
}

let cachedToken: CachedToken | null = null

function base64Url(value: string | Buffer) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function getPrivateKey() {
  const key = process.env.GOOGLE_PRIVATE_KEY || ''
  return key.replace(/\\n/g, '\n')
}

export function getCalendarConfig() {
  const calendarId = process.env.GOOGLE_CALENDAR_ID || ''
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || ''
  const privateKey = getPrivateKey()
  const timeZone = process.env.BOOKING_TIME_ZONE || process.env.GOOGLE_CALENDAR_TIME_ZONE || 'America/New_York'

  return {
    calendarId,
    serviceAccountEmail,
    privateKey,
    timeZone,
    configured: Boolean(calendarId && serviceAccountEmail && privateKey),
  }
}

function assertCalendarConfig() {
  const config = getCalendarConfig()
  if (!config.configured) {
    throw new Error('Google Calendar nao configurado. Configure GOOGLE_CALENDAR_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL e GOOGLE_PRIVATE_KEY.')
  }
  return config
}

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000)
  if (cachedToken && cachedToken.expiresAt - 60 > now) {
    return cachedToken.accessToken
  }

  const config = assertCalendarConfig()
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const payload = base64Url(JSON.stringify({
    iss: config.serviceAccountEmail,
    scope: 'https://www.googleapis.com/auth/calendar',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }))
  const unsignedJwt = `${header}.${payload}`
  const signature = createSign('RSA-SHA256').update(unsignedJwt).sign(config.privateKey)
  const assertion = `${unsignedJwt}.${base64Url(signature)}`

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Erro ao autenticar no Google Calendar: ${response.status} ${text}`)
  }

  const data = await response.json() as TokenResponse
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: now + data.expires_in,
  }
  return cachedToken.accessToken
}

async function googleCalendarFetch(path: string, init: RequestInit) {
  const token = await getAccessToken()
  const response = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    ...init,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Erro no Google Calendar: ${response.status} ${text}`)
  }

  return response.json()
}

export async function getCalendarBusyIntervals(timeMin: string, timeMax: string): Promise<CalendarBusyInterval[]> {
  const config = assertCalendarConfig()
  const data = await googleCalendarFetch('/freeBusy', {
    method: 'POST',
    body: JSON.stringify({
      timeMin,
      timeMax,
      timeZone: config.timeZone,
      items: [{ id: config.calendarId }],
    }),
  }) as {
    calendars?: Record<string, { busy?: CalendarBusyInterval[] }>
  }

  return data.calendars?.[config.calendarId]?.busy ?? []
}

export async function createCalendarEvent(input: CalendarEventInput) {
  const config = assertCalendarConfig()
  const data = await googleCalendarFetch(
    `/calendars/${encodeURIComponent(config.calendarId)}/events?sendUpdates=none`,
    {
      method: 'POST',
      body: JSON.stringify({
        summary: input.summary,
        description: input.description,
        start: { dateTime: input.start, timeZone: input.timeZone },
        end: { dateTime: input.end, timeZone: input.timeZone },
      }),
    },
  ) as { id: string; htmlLink?: string }

  return data
}
