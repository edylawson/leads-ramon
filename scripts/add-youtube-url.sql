ALTER TABLE leads
ADD COLUMN IF NOT EXISTS youtube_url TEXT;

COMMENT ON COLUMN leads.youtube_url IS 'Link do YouTube informado ou corrigido manualmente pelo SDR.';
