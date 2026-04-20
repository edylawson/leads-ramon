import { NextResponse } from 'next/server'
import { Pool } from 'pg'

export const dynamic = 'force-dynamic'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
})

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT
        l.id,
        l.response_id,
        l.response_type,
        l.first_name,
        l.last_name,
        l.email,
        l.phone,
        l.empresa,
        l.tipo_negocio,
        l.faturamento_anual,
        l.num_colaboradores,
        l.tempo_negocio,
        l.visibilidade_google,
        l.tem_gmb,
        l.usa_instagram,
        l.instagram_handle,
        l.tem_site,
        l.url_site,
        l.investimento_mensal,
        l.faz_anuncios,
        l.canal_aquisicao,
        l.usa_ia,
        l.dor_sem_clientes,
        l.dor_sem_mkt,
        l.dor_sem_google,
        l.dor_anuncio_sem_retorno,
        l.dor_sem_tempo_redes,
        l.dor_dependencia_op,
        l.dor_nao_monetiza,
        l.dor_sem_autoridade,
        l.dor_quer_curso,
        l.dor_conteudo_preso,
        l.problema_principal,
        l.urgencia,
        l.trabalhou_agencia,
        l.monetiza_conhecimento,
        l.interesse_mentoria,
        l.interesse_livro,
        l.intencao_avancar,
        l.intencao_entender,
        l.intencao_talvez,
        l.intencao_nao_momento,
        l.diagnostico_url,
        l.stage,
        l.submit_date,
        l.stage_date,
        l.created_at,
        l.responsavel_id,
        r.nome AS responsavel_nome
      FROM leads l
      LEFT JOIN responsaveis r ON r.id = l.responsavel_id
      ORDER BY COALESCE(l.submit_date, l.stage_date) DESC NULLS LAST
    `)
    return NextResponse.json(result.rows, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      },
    })
  } catch (error) {
    console.error('DB error:', error)
    return NextResponse.json({ error: 'Erro ao buscar leads' }, { status: 500 })
  }
}
