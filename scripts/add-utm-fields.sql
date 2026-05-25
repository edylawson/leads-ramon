-- ============================================================
-- Adiciona campos UTM padrao aos leads.
-- Executar via: psql $DATABASE_URL -f scripts/add-utm-fields.sql
-- ============================================================

BEGIN;

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS utm_source TEXT,
ADD COLUMN IF NOT EXISTS utm_medium TEXT,
ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
ADD COLUMN IF NOT EXISTS utm_content TEXT,
ADD COLUMN IF NOT EXISTS utm_term TEXT;

CREATE INDEX IF NOT EXISTS idx_leads_utm_campaign ON leads(utm_campaign);
CREATE INDEX IF NOT EXISTS idx_leads_utm_source ON leads(utm_source);

COMMENT ON COLUMN leads.utm_source IS 'Fonte UTM do lead, ex: QR-PPT-RAMON, QR-FOLDER, FORM-DANI.';
COMMENT ON COLUMN leads.utm_medium IS 'Meio UTM do lead, ex: QR-CODE, FORM-STAND.';
COMMENT ON COLUMN leads.utm_campaign IS 'Campanha UTM do lead, ex: 10XPRIVATE-MAI26.';
COMMENT ON COLUMN leads.utm_content IS 'Conteudo UTM opcional.';
COMMENT ON COLUMN leads.utm_term IS 'Termo UTM opcional.';

COMMIT;
