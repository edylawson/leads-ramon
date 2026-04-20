import { NextResponse } from 'next/server'
import { Pool } from 'pg'

export const dynamic = 'force-dynamic'

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false })

export async function GET() {
  try {
    const result = await pool.query(
      'SELECT id, nome, email FROM responsaveis WHERE ativo = true ORDER BY nome'
    )
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('DB error:', error)
    return NextResponse.json({ error: 'Erro ao buscar responsáveis' }, { status: 500 })
  }
}
