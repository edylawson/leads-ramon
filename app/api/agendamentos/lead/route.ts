import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false })

export async function GET(req: NextRequest) {
  const leadId = req.nextUrl.searchParams.get('lead_id')
  const email = req.nextUrl.searchParams.get('email')
  const responseId = req.nextUrl.searchParams.get('response_id')

  if (!leadId && !email && !responseId) {
    return NextResponse.json({ lead: null })
  }

  try {
    const conditions: string[] = []
    const values: string[] = []

    if (leadId) {
      values.push(leadId)
      conditions.push(`id = $${values.length}`)
    }
    if (email) {
      values.push(email.toLowerCase())
      conditions.push(`LOWER(email) = $${values.length}`)
    }
    if (responseId) {
      values.push(responseId)
      conditions.push(`response_id = $${values.length}`)
    }

    const result = await pool.query(
      `SELECT id, first_name, last_name, email, phone, empresa, tipo_negocio, responsavel_id
       FROM leads
       WHERE ${conditions.join(' OR ')}
       ORDER BY COALESCE(submit_date, created_at) DESC NULLS LAST
       LIMIT 1`,
      values,
    )

    const row = result.rows[0]
    if (!row) return NextResponse.json({ lead: null })

    return NextResponse.json({
      lead: {
        id: row.id,
        nome: [row.first_name, row.last_name].filter(Boolean).join(' '),
        email: row.email,
        telefone: row.phone,
        empresa: row.empresa,
        segmento: row.tipo_negocio,
        responsavel_id: row.responsavel_id,
      },
    })
  } catch (error) {
    console.error('Lead lookup error:', error)
    return NextResponse.json({ error: 'Erro ao buscar lead.' }, { status: 500 })
  }
}
