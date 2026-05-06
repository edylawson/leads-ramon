CREATE TABLE IF NOT EXISTS agendamentos (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
  responsavel_id INTEGER REFERENCES responsaveis(id) ON DELETE SET NULL,
  calendar_id TEXT NOT NULL,
  google_event_id TEXT,
  google_event_link TEXT,
  titulo TEXT NOT NULL,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  empresa TEXT,
  inicio TIMESTAMPTZ NOT NULL,
  fim TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  status TEXT NOT NULL DEFAULT 'agendado',
  observacoes TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT agendamentos_status_check
    CHECK (status IN ('agendado', 'cancelado', 'remarcado', 'realizado')),
  CONSTRAINT agendamentos_periodo_check
    CHECK (fim > inicio)
);

CREATE INDEX IF NOT EXISTS idx_agendamentos_inicio
  ON agendamentos (inicio);

CREATE INDEX IF NOT EXISTS idx_agendamentos_lead_id
  ON agendamentos (lead_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_agendamentos_google_event_id
  ON agendamentos (google_event_id)
  WHERE google_event_id IS NOT NULL;
