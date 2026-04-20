import { NextRequest, NextResponse } from 'next/server'

const DIAGNOSTICO_SERVICE_URL = process.env.DIAGNOSTICO_SERVICE_URL || 'http://diagnostico-service:8001'

export async function POST(req: NextRequest) {
  try {
    const { lead_id } = await req.json()

    if (!lead_id || typeof lead_id !== 'number') {
      return NextResponse.json({ error: 'lead_id inválido' }, { status: 400 })
    }

    const res = await fetch(`${DIAGNOSTICO_SERVICE_URL}/gerar/${lead_id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json({ error: data.detail || 'Erro no serviço de diagnóstico' }, { status: res.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Erro ao chamar diagnostico-service:', error)
    return NextResponse.json({ error: 'Serviço de diagnóstico indisponível' }, { status: 503 })
  }
}
