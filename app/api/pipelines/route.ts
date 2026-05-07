import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

export const dynamic = 'force-dynamic'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
})

const FALLBACK_PIPELINES = [
  { id: null, nome: 'Brasil', slug: 'brasil', descricao: 'Leads do formulario Brasil', cor: 'green', ordem: 1, ativo: true },
  { id: null, nome: 'EUA', slug: 'eua', descricao: 'Leads do formulario EUA', cor: 'blue', ordem: 2, ativo: true },
]

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT id, nome, slug, descricao, cor, ordem, ativo
      FROM pipelines
      WHERE ativo = TRUE
      ORDER BY ordem ASC, nome ASC
    `)

    return NextResponse.json(result.rows, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      },
    })
  } catch (error: unknown) {
    if (typeof error === 'object' && error && 'code' in error && error.code === '42P01') {
      return NextResponse.json(FALLBACK_PIPELINES)
    }
    console.error('Pipelines DB error:', error)
    return NextResponse.json({ error: 'Erro ao buscar pipelines' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const nome = typeof body.nome === 'string' ? body.nome.trim() : ''
    const descricao = typeof body.descricao === 'string' ? body.descricao.trim() : null
    const cor = typeof body.cor === 'string' && body.cor.trim() ? body.cor.trim() : 'indigo'

    if (!nome) {
      return NextResponse.json({ error: 'Informe o nome do pipeline.' }, { status: 400 })
    }

    const slug = slugify(nome)
    if (!slug) {
      return NextResponse.json({ error: 'Nome de pipeline invalido.' }, { status: 400 })
    }

    const result = await pool.query(
      `INSERT INTO pipelines (nome, slug, descricao, cor, ordem)
       VALUES (
         $1,
         $2,
         $3,
         $4,
         COALESCE((SELECT MAX(ordem) FROM pipelines), 0) + 1
       )
       ON CONFLICT (slug) DO UPDATE
       SET nome = EXCLUDED.nome,
           descricao = COALESCE(EXCLUDED.descricao, pipelines.descricao),
           cor = EXCLUDED.cor,
           ativo = TRUE
       RETURNING id, nome, slug, descricao, cor, ordem, ativo`,
      [nome, slug, descricao, cor],
    )

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error: unknown) {
    if (typeof error === 'object' && error && 'code' in error && error.code === '42P01') {
      return NextResponse.json(
        { error: 'Tabela pipelines ainda nao existe. Rode scripts/add-pipelines.sql no banco.' },
        { status: 400 },
      )
    }
    console.error('Pipeline create error:', error)
    return NextResponse.json({ error: 'Erro ao criar pipeline' }, { status: 500 })
  }
}
