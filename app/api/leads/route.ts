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
        to_jsonb(l)->>'youtube_url' AS youtube_url,
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
        l.origem_lead,
        to_jsonb(l)->>'utm_source' AS utm_source,
        to_jsonb(l)->>'utm_medium' AS utm_medium,
        to_jsonb(l)->>'utm_campaign' AS utm_campaign,
        to_jsonb(l)->>'utm_content' AS utm_content,
        to_jsonb(l)->>'utm_term' AS utm_term,
        NULLIF(to_jsonb(l)->>'pipeline_id', '')::INTEGER AS pipeline_id,
        l.created_at,
        l.responsavel_id,
        r.nome AS responsavel_nome,
        l.perfil,
        l.origem,
        l.dor_so_brasileiro,
        l.intencao_sem_orcamento,
        l.intencao_pensar
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

function cleanText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function splitName(nome: string) {
  const parts = nome.trim().split(/\s+/)
  if (parts.length === 1) return { firstName: parts[0], lastName: null }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  }
}

function manualResponseId() {
  return `manual_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const nome = cleanText(body.nome)
    const email = cleanText(body.email)
    const phone = cleanText(body.phone)

    if (!nome || !email || !phone) {
      return NextResponse.json(
        { error: 'Nome, email e telefone sao obrigatorios.' },
        { status: 400 }
      )
    }

    let pipelineId: number | null = null
    let pipelineSlug: string | null = null
    if (body.pipeline_id) {
      const parsedPipelineId = Number(body.pipeline_id)
      if (Number.isNaN(parsedPipelineId)) {
        return NextResponse.json({ error: 'Pipeline invalido.' }, { status: 400 })
      }

      const pipelineResult = await pool.query(
        'SELECT id, slug FROM pipelines WHERE id = $1 AND ativo = TRUE LIMIT 1',
        [parsedPipelineId]
      )
      if (pipelineResult.rows.length === 0) {
        return NextResponse.json({ error: 'Pipeline nao encontrado.' }, { status: 404 })
      }

      pipelineId = pipelineResult.rows[0].id
      pipelineSlug = pipelineResult.rows[0].slug
    }

    const origemInput = cleanText(body.origem)
    const origem = origemInput === 'eua'
      ? 'eua'
      : pipelineSlug === 'eua'
        ? 'eua'
        : 'brasil'
    const { firstName, lastName } = splitName(nome)

    const insert = await pool.query(
      `
        INSERT INTO leads (
          response_id, response_type, first_name, last_name, email, phone, empresa,
          origem, origem_lead, pipeline_id,
          utm_source, utm_medium, utm_campaign, utm_content, utm_term,
          stage, stage_date, submit_date
        )
        VALUES (
          $1, 'partial', $2, $3, $4, $5, $6,
          $7, $8, $9,
          $10, $11, $12, $13, $14,
          'nao_iniciado', NOW(), NOW()
        )
        RETURNING id
      `,
      [
        manualResponseId(),
        firstName,
        lastName,
        email,
        phone,
        cleanText(body.empresa),
        origem,
        cleanText(body.origem_lead),
        pipelineId,
        cleanText(body.utm_source),
        cleanText(body.utm_medium),
        cleanText(body.utm_campaign),
        cleanText(body.utm_content),
        cleanText(body.utm_term),
      ]
    )

    const result = await pool.query(
      `
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
          to_jsonb(l)->>'youtube_url' AS youtube_url,
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
          l.origem_lead,
          to_jsonb(l)->>'utm_source' AS utm_source,
          to_jsonb(l)->>'utm_medium' AS utm_medium,
          to_jsonb(l)->>'utm_campaign' AS utm_campaign,
          to_jsonb(l)->>'utm_content' AS utm_content,
          to_jsonb(l)->>'utm_term' AS utm_term,
          NULLIF(to_jsonb(l)->>'pipeline_id', '')::INTEGER AS pipeline_id,
          l.created_at,
          l.responsavel_id,
          r.nome AS responsavel_nome,
          l.perfil,
          l.origem,
          l.dor_so_brasileiro,
          l.intencao_sem_orcamento,
          l.intencao_pensar
        FROM leads l
        LEFT JOIN responsaveis r ON r.id = l.responsavel_id
        WHERE l.id = $1
      `,
      [insert.rows[0].id]
    )

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error) {
    console.error('DB error creating lead:', error)
    return NextResponse.json({ error: 'Erro ao criar lead' }, { status: 500 })
  }
}
