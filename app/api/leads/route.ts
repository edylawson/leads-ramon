import { NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
})

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT
        id,
        response_id,
        response_type,
        first_name,
        last_name,
        email,
        phone,
        empresa,
        tipo_negocio,
        faturamento_anual,
        num_colaboradores,
        tempo_negocio,
        visibilidade_google,
        tem_gmb,
        usa_instagram,
        instagram_handle,
        tem_site,
        url_site,
        investimento_mensal,
        faz_anuncios,
        canal_aquisicao,
        usa_ia,
        dor_sem_clientes,
        dor_sem_mkt,
        dor_sem_google,
        dor_anuncio_sem_retorno,
        dor_sem_tempo_redes,
        dor_dependencia_op,
        dor_nao_monetiza,
        dor_sem_autoridade,
        dor_quer_curso,
        dor_conteudo_preso,
        problema_principal,
        urgencia,
        trabalhou_agencia,
        monetiza_conhecimento,
        interesse_mentoria,
        interesse_livro,
        intencao_avancar,
        intencao_entender,
        intencao_talvez,
        intencao_nao_momento,
        diagnostico_url,
        stage,
        phone,
        submit_date,
        stage_date,
        created_at
      FROM leads
      ORDER BY COALESCE(submit_date, stage_date) DESC NULLS LAST
    `)
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('DB error:', error)
    return NextResponse.json({ error: 'Erro ao buscar leads' }, { status: 500 })
  }
}
