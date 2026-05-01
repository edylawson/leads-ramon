-- ============================================================
-- Adiciona canal de vendas dos leads
-- Executar via: psql $DATABASE_URL -f scripts/add-canal-vendas.sql
-- ============================================================

BEGIN;

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS canal_vendas TEXT;

UPDATE leads
SET canal_vendas = 'EVENTO-30-ABRL-2026'
WHERE origem = 'eua'
  AND COALESCE(submit_date, stage_date)::date = DATE '2026-04-30';

COMMIT;
