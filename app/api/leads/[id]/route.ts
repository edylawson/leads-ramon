import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false })

const VALID_STAGES = ['nao_iniciado', 'tentando_contato', 'primeiro_contato', 'follow_up', 'reuniao_agendada', 'no_show', 'diagnostico_enviado', 'em_negociacao', 'ganho', 'perdido']

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params

  try {
    const result = await pool.query(
      `SELECT d.id, d.status, d.versao, d.gerado_em, d.error_message,
              l.diagnostico_url
       FROM leads l
       LEFT JOIN diagnosticos d ON d.lead_id = l.id
       WHERE l.id = $1
       ORDER BY d.gerado_em DESC NULLS LAST
       LIMIT 1`,
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ status: 'sem_diagnostico' })
    }

    const row = result.rows[0]
    return NextResponse.json({
      status: row.status ?? 'sem_diagnostico',
      diagnostico_id: row.id,
      versao: row.versao,
      gerado_em: row.gerado_em,
      url: row.diagnostico_url,
      error_message: row.error_message,
    })
  } catch (error) {
    console.error('Error fetching diagnostic status:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params

  try {
    const body = await req.json()
    const { stage } = body

    if (!stage || !VALID_STAGES.includes(stage)) {
      return NextResponse.json({ error: 'Estágio inválido' }, { status: 400 })
    }

    await pool.query(
      'UPDATE leads SET stage = $1 WHERE id = $2',
      [stage, id]
    )
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error updating stage:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
