-- ============================================================
-- Renomeia o conceito "canal de vendas" para "origem do lead"
-- Executar via: psql $DATABASE_URL -f scripts/rename-canal-vendas-to-origem-lead.sql
--
-- Observacao:
-- - A coluna origem ja existe e representa o mercado (brasil | eua).
-- - Por isso usamos origem_lead para a origem/campanha/ultimo clique.
-- - canal_vendas fica temporariamente como legado para deploy sem downtime.
-- ============================================================

BEGIN;

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS origem_lead TEXT;

UPDATE leads
SET origem_lead = canal_vendas
WHERE origem_lead IS NULL
  AND canal_vendas IS NOT NULL;

COMMIT;
