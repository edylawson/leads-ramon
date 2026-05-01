-- ============================================================
-- Legado: adiciona origem do lead (antigo canal de vendas)
-- Executar via: psql $DATABASE_URL -f scripts/add-canal-vendas.sql
-- ============================================================

BEGIN;

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS origem_lead TEXT;

UPDATE leads
SET origem_lead = 'EVENTO-30-ABRL-2026'
WHERE origem = 'eua'
  AND COALESCE(submit_date, stage_date)::date = DATE '2026-04-30';

COMMIT;
