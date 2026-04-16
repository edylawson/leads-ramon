import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false })

export async function GET(_req: NextRequest, { params }: { params: { uuid: string } }) {
  const { uuid } = params

  if (!uuid || !/^\d+$/.test(uuid)) {
    return new NextResponse('Diagnóstico não encontrado.', { status: 404 })
  }

  try {
    const result = await pool.query(
      'SELECT html_content, status FROM diagnosticos WHERE id = $1',
      [uuid]
    )

    if (result.rows.length === 0) {
      return new NextResponse('Diagnóstico não encontrado.', { status: 404 })
    }

    const { html_content, status } = result.rows[0]

    if (status === 'processando') {
      return new NextResponse(
        `<html><head><meta charset="utf-8"><title>Gerando diagnóstico...</title>
        <meta http-equiv="refresh" content="5">
        <style>body{background:#0a0a0a;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}</style>
        </head><body><p>Gerando diagnóstico, aguarde...</p></body></html>`,
        { status: 202, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      )
    }

    if (!html_content) {
      return new NextResponse('Conteúdo não disponível.', { status: 404 })
    }

    return new NextResponse(html_content, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (error) {
    console.error('Error serving diagnostic:', error)
    return new NextResponse('Erro interno.', { status: 500 })
  }
}
