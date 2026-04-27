import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false })

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await pool.query(
      `SELECT n.id, n.texto, n.criado_em, r.nome AS responsavel_nome
       FROM notas n
       LEFT JOIN responsaveis r ON r.id = n.responsavel_id
       WHERE n.lead_id = $1
       ORDER BY n.criado_em DESC`,
      [params.id]
    )
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Error fetching notas:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { texto, responsavel_id } = await req.json()
    if (!texto?.trim()) {
      return NextResponse.json({ error: 'Texto obrigatório' }, { status: 400 })
    }
    const result = await pool.query(
      `INSERT INTO notas (lead_id, texto, responsavel_id)
       VALUES ($1, $2, $3)
       RETURNING id, texto, criado_em`,
      [params.id, texto.trim(), responsavel_id || null]
    )
    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error) {
    console.error('Error creating nota:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { nota_id } = await req.json()
    await pool.query('DELETE FROM notas WHERE id = $1 AND lead_id = $2', [nota_id, params.id])
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error deleting nota:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
