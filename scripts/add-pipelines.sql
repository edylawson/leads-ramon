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
);

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS pipeline_id INTEGER REFERENCES pipelines(id);

CREATE INDEX IF NOT EXISTS idx_leads_pipeline_id ON leads(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipelines_ativo_ordem ON pipelines(ativo, ordem);

INSERT INTO pipelines (nome, slug, descricao, cor, ordem)
VALUES
  ('Brasil', 'brasil', 'Leads do formulario Brasil', 'green', 1),
  ('EUA', 'eua', 'Leads do formulario EUA', 'blue', 2)
ON CONFLICT (slug) DO UPDATE
SET nome = EXCLUDED.nome,
    descricao = EXCLUDED.descricao,
    cor = EXCLUDED.cor,
    ordem = EXCLUDED.ordem,
    ativo = TRUE,
    updated_at = NOW();

UPDATE leads
SET pipeline_id = p.id
FROM pipelines p
WHERE leads.pipeline_id IS NULL
  AND leads.origem = p.slug;

COMMENT ON TABLE pipelines IS 'Pipelines operacionais para organizar leads sem depender apenas do mercado/origem.';
COMMENT ON COLUMN leads.pipeline_id IS 'Pipeline operacional principal do lead. Origem continua representando o formulario/mercado original.';
