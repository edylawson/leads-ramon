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

// Estágios que preenchem timestamps de marco (apenas na primeira vez)
const STAGE_MILESTONE: Record<string, string> = {
  primeiro_contato:    'primeiro_contato_em',
  reuniao_agendada:    'reuniao_em',
  diagnostico_enviado: 'diagnostico_enviado_em',
  ganho:               'fechado_em',
  perdido:             'fechado_em',
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params

  try {
    const body = await req.json()
    const { stage, responsavel_id } = body

    // Atualiza estágio
    if (stage !== undefined) {
      if (!VALID_STAGES.includes(stage)) {
        return NextResponse.json({ error: 'Estágio inválido' }, { status: 400 })
      }

      // Busca estágio atual antes de mudar
      const current = await pool.query('SELECT stage, responsavel_id FROM leads WHERE id = $1', [id])
      const estagioAnterior = current.rows[0]?.stage ?? null
      const respId = current.rows[0]?.responsavel_id ?? null

      // Só age se o estágio realmente mudou
      if (estagioAnterior !== stage) {
        // Monta UPDATE com stage_date e possível campo de marco
        const milestoneCol = STAGE_MILESTONE[stage]
        const milestoneUpdate = milestoneCol
          ? `, ${milestoneCol} = COALESCE(${milestoneCol}, NOW())`
          : ''

        await pool.query(
          `UPDATE leads SET stage = $1, stage_date = NOW()${milestoneUpdate} WHERE id = $2`,
          [stage, id]
        )

        // Registra no histórico
        await pool.query(
          `INSERT INTO leads_historico_estagios (lead_id, estagio_de, estagio_para, responsavel_id)
           VALUES ($1, $2, $3, $4)`,
          [id, estagioAnterior, stage, respId]
        )
      }
    }

    // Atualiza responsável (aceita null para remover)
    if (responsavel_id !== undefined) {
      await pool.query(
        'UPDATE leads SET responsavel_id = $1 WHERE id = $2',
        [responsavel_id || null, id]
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error updating lead:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
