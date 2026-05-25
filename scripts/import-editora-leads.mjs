import fs from 'node:fs/promises'
import { Pool } from 'pg'

const CAMPAIGN = '10XPRIVATE-MAI26'

const FILES = [
  {
    path: process.env.EDITORA_PPT_RAMON_CSV || 'C:/Users/edyma/Downloads/LEADS EDITORA - FORM PPT RAMON.csv',
    utmSource: 'QR-PPT-RAMON',
    utmMedium: 'QR-CODE',
  },
  {
    path: process.env.EDITORA_FOLDER_CSV || 'C:/Users/edyma/Downloads/LEADS EDITORA 1 - FOLDER.csv',
    utmSource: 'QR-FOLDER',
    utmMedium: 'QR-CODE',
  },
  {
    path: process.env.EDITORA_FORM_DANI_CSV || 'C:/Users/edyma/Downloads/LEADS EDITORA 1 - FORM DANI.csv',
    utmSource: 'FORM-DANI',
    utmMedium: 'FORM-STAND',
  },
]

function parseCsv(text) {
  const rows = []
  let row = []
  let value = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const next = text[i + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        value += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      row.push(value)
      value = ''
      continue
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i++
      row.push(value)
      if (row.some(cell => cell.trim() !== '')) rows.push(row)
      row = []
      value = ''
      continue
    }

    value += char
  }

  row.push(value)
  if (row.some(cell => cell.trim() !== '')) rows.push(row)

  const [headers, ...data] = rows
  return data.map(cells => {
    const item = {}
    headers.forEach((header, index) => {
      item[header.trim()] = clean(cells[index])
    })
    return item
  })
}

function clean(value) {
  if (value === undefined || value === null) return null
  const normalized = String(value).trim()
  if (!normalized) return null
  return normalized.startsWith("'+") ? normalized.slice(1) : normalized
}

function pick(row, fields) {
  for (const field of fields) {
    const value = clean(row[field])
    if (value) return value
  }
  return null
}

function dateValue(row, field) {
  const value = pick(row, [field])
  return value ? `${value} UTC` : null
}

function buildProblem(row) {
  const interesse = pick(row, ['Interesse', 'O que mais te interessa agora?'])
  const anotacoes = pick(row, ['Anotações', 'Anotacoes'])
  const clareza = pick(row, ['Você tem clareza do livro que deseja lançar?'])
  const investimento = pick(row, ['Você tem recursos para investir na produção profissional do seu livro?'])
  const objetivos = [
    'Gerar autoridade e posicionamento',
    'Vender mentorias, cursos ou serviços',
    'Deixar um legado ou história registrada',
    'Atrair convites e oportunidades',
    'Me tornar referência no meu mercado',
  ].map(field => pick(row, [field])).filter(Boolean)

  return [
    interesse ? `Interesse: ${interesse}` : null,
    anotacoes ? `Anotacoes: ${anotacoes}` : null,
    clareza ? `Clareza do livro: ${clareza}` : null,
    investimento ? `Investimento: ${investimento}` : null,
    objetivos.length > 0 ? `Objetivos: ${objetivos.join('; ')}` : null,
  ].filter(Boolean).join('\n') || null
}

function toLead(row, file) {
  const interesse = pick(row, ['Interesse', 'O que mais te interessa agora?'])
  const objetivos = [
    'Gerar autoridade e posicionamento',
    'Vender mentorias, cursos ou serviços',
    'Deixar um legado ou história registrada',
    'Atrair convites e oportunidades',
    'Me tornar referência no meu mercado',
  ].map(field => pick(row, [field])).filter(Boolean)

  return {
    response_id: pick(row, ['#']),
    first_name: pick(row, ['First name', 'first_name', 'Qual é o seu nome?']),
    last_name: null,
    phone: pick(row, ['Phone number', 'phone_number', 'Qual o melhor número de WhatsApp para contato?']),
    email: pick(row, ['Email', 'email']),
    empresa: null,
    tipo_negocio: pick(row, ['Qual dessas opções descreve você?']),
    problema_principal: buildProblem(row),
    urgencia: pick(row, ['Quando você pretende iniciar seu projeto?']),
    monetiza_conhecimento: pick(row, ['Qual dessas opções descreve você?']),
    interesse_livro: interesse || (objetivos.length > 0 ? objetivos.join('; ') : null),
    response_type: pick(row, ['Response Type']) || 'completed',
    start_date: dateValue(row, 'Start Date (UTC)'),
    stage_date: dateValue(row, 'Stage Date (UTC)'),
    submit_date: dateValue(row, 'Submit Date (UTC)'),
    network_id: pick(row, ['Network ID']),
    origem: 'brasil',
    origem_lead: CAMPAIGN,
    utm_source: pick(row, ['utm_source']) || file.utmSource,
    utm_medium: pick(row, ['utm_medium']) || file.utmMedium,
    utm_campaign: pick(row, ['utm_campaign']) || CAMPAIGN,
    utm_content: pick(row, ['utm_content']),
    utm_term: pick(row, ['utm_term']),
  }
}

async function ensureSchema(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS pipelines (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      descricao TEXT,
      cor TEXT NOT NULL DEFAULT 'indigo',
      ordem INTEGER NOT NULL DEFAULT 0,
      ativo BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  await client.query(`
    ALTER TABLE leads
      ADD COLUMN IF NOT EXISTS pipeline_id INTEGER REFERENCES pipelines(id),
      ADD COLUMN IF NOT EXISTS origem_lead TEXT,
      ADD COLUMN IF NOT EXISTS utm_source TEXT,
      ADD COLUMN IF NOT EXISTS utm_medium TEXT,
      ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
      ADD COLUMN IF NOT EXISTS utm_content TEXT,
      ADD COLUMN IF NOT EXISTS utm_term TEXT
  `)

  await client.query(`
    INSERT INTO pipelines (nome, slug, descricao, cor, ordem)
    VALUES ('Editora', 'editora', 'Leads da operacao Editora', 'amber', 3)
    ON CONFLICT (slug) DO UPDATE
    SET nome = EXCLUDED.nome,
        descricao = EXCLUDED.descricao,
        cor = EXCLUDED.cor,
        ordem = EXCLUDED.ordem,
        ativo = TRUE,
        updated_at = NOW()
  `)
}

async function upsertLead(client, lead) {
  if (!lead.response_id) throw new Error('Lead sem response_id no CSV')

  const result = await client.query(
    `
      WITH editora AS (
        SELECT id FROM pipelines WHERE slug = 'editora' LIMIT 1
      )
      INSERT INTO leads (
        response_id, first_name, last_name, phone, email, empresa, tipo_negocio,
        problema_principal, urgencia, monetiza_conhecimento, interesse_livro,
        response_type, start_date, stage_date, submit_date, network_id,
        stage, origem, origem_lead, pipeline_id,
        utm_source, utm_medium, utm_campaign, utm_content, utm_term
      )
      SELECT
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,
        'nao_iniciado',$17,$18,editora.id,$19,$20,$21,$22,$23
      FROM editora
      ON CONFLICT (response_id) DO UPDATE
      SET first_name = COALESCE(EXCLUDED.first_name, leads.first_name),
          last_name = COALESCE(EXCLUDED.last_name, leads.last_name),
          phone = COALESCE(EXCLUDED.phone, leads.phone),
          email = COALESCE(EXCLUDED.email, leads.email),
          empresa = COALESCE(EXCLUDED.empresa, leads.empresa),
          tipo_negocio = COALESCE(EXCLUDED.tipo_negocio, leads.tipo_negocio),
          problema_principal = COALESCE(EXCLUDED.problema_principal, leads.problema_principal),
          urgencia = COALESCE(EXCLUDED.urgencia, leads.urgencia),
          monetiza_conhecimento = COALESCE(EXCLUDED.monetiza_conhecimento, leads.monetiza_conhecimento),
          interesse_livro = COALESCE(EXCLUDED.interesse_livro, leads.interesse_livro),
          response_type = COALESCE(EXCLUDED.response_type, leads.response_type),
          start_date = COALESCE(EXCLUDED.start_date, leads.start_date),
          stage_date = COALESCE(EXCLUDED.stage_date, leads.stage_date),
          submit_date = COALESCE(EXCLUDED.submit_date, leads.submit_date),
          network_id = COALESCE(EXCLUDED.network_id, leads.network_id),
          origem = EXCLUDED.origem,
          origem_lead = EXCLUDED.origem_lead,
          pipeline_id = EXCLUDED.pipeline_id,
          utm_source = EXCLUDED.utm_source,
          utm_medium = EXCLUDED.utm_medium,
          utm_campaign = EXCLUDED.utm_campaign,
          utm_content = COALESCE(EXCLUDED.utm_content, leads.utm_content),
          utm_term = COALESCE(EXCLUDED.utm_term, leads.utm_term)
      RETURNING (xmax = 0) AS inserted
    `,
    [
      lead.response_id,
      lead.first_name,
      lead.last_name,
      lead.phone,
      lead.email,
      lead.empresa,
      lead.tipo_negocio,
      lead.problema_principal,
      lead.urgencia,
      lead.monetiza_conhecimento,
      lead.interesse_livro,
      lead.response_type,
      lead.start_date,
      lead.stage_date,
      lead.submit_date,
      lead.network_id,
      lead.origem,
      lead.origem_lead,
      lead.utm_source,
      lead.utm_medium,
      lead.utm_campaign,
      lead.utm_content,
      lead.utm_term,
    ]
  )

  return result.rows[0]?.inserted ? 'inserted' : 'updated'
}

async function run() {
  if (process.argv.includes('--dry-run')) {
    for (const file of FILES) {
      const text = await fs.readFile(file.path, 'utf8')
      const rows = parseCsv(text)
      console.log(`${file.utmSource}: ${rows.length} leads seriam processados`)
    }
    return
  }

  if (!process.env.DATABASE_URL) {
    throw new Error('Defina DATABASE_URL antes de executar este script.')
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false })
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    await ensureSchema(client)

    let inserted = 0
    let updated = 0

    for (const file of FILES) {
      const text = await fs.readFile(file.path, 'utf8')
      const rows = parseCsv(text)
      for (const row of rows) {
        const status = await upsertLead(client, toLead(row, file))
        if (status === 'inserted') inserted++
        else updated++
      }
      console.log(`${file.utmSource}: ${rows.length} leads processados`)
    }

    await client.query('COMMIT')
    console.log(`Importacao concluida. Inseridos: ${inserted}. Atualizados: ${updated}.`)
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

run().catch(error => {
  console.error(error)
  process.exit(1)
})
