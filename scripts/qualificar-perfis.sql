-- ============================================================
-- Migração de perfis — Agência EUA
-- Executar via: psql $DATABASE_URL -f scripts/qualificar-perfis.sql
-- ============================================================

BEGIN;

-- ----------------------------------------------------------
-- 1. BRASIL — renomear valores para formato simples (A/B/C)
-- ----------------------------------------------------------
UPDATE leads SET perfil = 'A'  WHERE perfil LIKE 'A+%' AND origem = 'brasil';
UPDATE leads SET perfil = 'A'  WHERE perfil LIKE 'A (%' AND origem = 'brasil';
UPDATE leads SET perfil = 'B'  WHERE perfil LIKE 'B (%' AND origem = 'brasil';
UPDATE leads SET perfil = 'C'  WHERE perfil LIKE 'C (%' AND origem = 'brasil';

-- ----------------------------------------------------------
-- 2. EUA — qualificação automática (A / B / C)
--
-- Critérios:
--   A (Hot)  : Faturamento > $250k + urgência alta + sem bloqueio de orçamento
--   B (Warm) : Faturamento > $100k + sem bloqueio de orçamento
--              (inclui alto faturamento com urgência baixa — segurança comercial)
--   C (Cold) : Resto (faturamento baixo, sem orçamento, ou só avaliando)
-- ----------------------------------------------------------
UPDATE leads
SET perfil = CASE

  -- Perfil A: alto faturamento + urgência alta + sem objeção de orçamento
  WHEN faturamento_anual IN (
         '$250.000 a $500.000',
         '$500.000 a $1.000.000',
         'Mais de $1.000.000'
       )
       AND (urgencia ILIKE '%urgente%' OR urgencia ILIKE '%alta%')
       AND (intencao_sem_orcamento IS NOT TRUE)
  THEN 'A'

  -- Perfil B: faturamento > $100k + sem objeção de orçamento
  -- (captura alto faturamento com urgência baixa — não vai para automação total)
  WHEN faturamento_anual IN (
         '$100.000 a $250.000',
         '$250.000 a $500.000',
         '$500.000 a $1.000.000',
         'Mais de $1.000.000'
       )
       AND (intencao_sem_orcamento IS NOT TRUE)
  THEN 'B'

  -- Perfil C: resto
  ELSE 'C'

END
WHERE origem = 'eua';

-- ----------------------------------------------------------
-- Preview dos resultados antes de confirmar
-- ----------------------------------------------------------
SELECT
  origem,
  perfil,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE faturamento_anual IS NOT NULL) AS com_faturamento
FROM leads
GROUP BY origem, perfil
ORDER BY origem, perfil;

COMMIT;
