# AGENTS.md — Leads Ramon (leads-frontend)

Contexto para qualquer agente de IA (Claude, Codex, etc.) que trabalhe neste repositório.
Leia este arquivo antes de fazer qualquer alteração.

---

## O que é este projeto

Painel interno de gestão de leads da Agência EUA (parceria Ramon Lopes).
Exibe leads vindos de dois formulários Typeform — Brasil e EUA — com filtros,
modal de detalhe, controle de estágio, diagnóstico de marketing e observações por lead.

URL em produção: `https://leadsramonbr.edylawson.com.br`

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 14 (App Router) |
| Linguagem | TypeScript |
| Estilo | Tailwind CSS |
| Banco | PostgreSQL 16 — **self-hosted na VPS**, não Supabase |
| Cliente DB | `pg` (node-postgres) — sem ORM, SQL direto |
| Deploy | Docker → ghcr.io → Coolify (VPS Hostinger) |
| CI/CD | GitHub Actions — trigger: push em `master` |

---

## Estrutura de arquivos

```
app/
  page.tsx                  ← toda a UI: tabela, filtros, modal, badges
  globals.css
  layout.tsx
  api/
    leads/
      route.ts              ← GET /api/leads — retorna todos os leads
      [id]/
        route.ts            ← GET (status diagnóstico) + PATCH (stage, responsavel_id, perfil)
        notas/route.ts      ← GET + POST de observações por lead
    responsaveis/route.ts   ← GET lista de responsáveis ativos
    diagnostics/
      generate/route.ts     ← POST dispara geração de diagnóstico via FastAPI
diagnostico-service/        ← serviço Python (FastAPI) separado — não mexer aqui
scripts/                    ← utilitários de manutenção (não vão para produção)
```

---

## Banco de dados

### Conexão
Sempre via variável de ambiente — **nunca hardcodar credencial**:
```ts
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false })
```

Para scripts locais em `scripts/`, a `DATABASE_URL` está no `.env` local (não commitar).

### Tabela principal: `leads`

Colunas mais relevantes:

```
id, response_id, response_type ('completed' | 'partial')
first_name, last_name, email, phone
empresa, tipo_negocio, faturamento_anual, num_colaboradores, tempo_negocio
visibilidade_google, tem_gmb, usa_instagram, tem_site, url_site
investimento_mensal, faz_anuncios, canal_aquisicao, usa_ia
dor_sem_clientes, dor_sem_mkt, dor_sem_google, ... (booleans)
problema_principal, urgencia, trabalhou_agencia
intencao_avancar, intencao_entender, intencao_talvez,
intencao_nao_momento, intencao_sem_orcamento, intencao_pensar (booleans)
perfil       TEXT  — 'A+' | 'A' | 'B' | 'C' (A+ só para leads Brasil)
origem       TEXT  — 'brasil' | 'eua'
stage        TEXT  — ver VALID_STAGES abaixo
stage_date, submit_date, created_at
responsavel_id  FK → responsaveis.id
diagnostico_url TEXT
```

### Outras tabelas

| Tabela | Uso |
|--------|-----|
| `responsaveis` | Vendedores/closers atribuíveis aos leads |
| `leads_historico_estagios` | Log automático de mudanças de estágio (não apagar) |
| `notas` | Observações por lead com timestamp |
| `diagnosticos` | HTMLs de diagnóstico gerados pelo serviço Python |

### Estágios válidos (`VALID_STAGES`)

```
nao_iniciado, tentando_contato, primeiro_contato, follow_up,
reuniao_agendada, no_show, diagnostico_enviado, em_negociacao, ganho, perdido
```

Alguns estágios gravam timestamps de marco na primeira transição
(`primeiro_contato_em`, `reuniao_em`, `diagnostico_enviado_em`, `fechado_em`).
Essa lógica fica em `app/api/leads/[id]/route.ts` — não remover.

### Perfis de lead

| Perfil | Cor UI | Significado |
|--------|--------|-------------|
| A+ | violeta | Hot — High Ticket (só BR: livro/método) |
| A | verde | Hot — passa direto pro closer |
| B | âmbar | Warm — SDR / nutrição |
| C | vermelho | Cold — automação total |

---

## Regras críticas de desenvolvimento

### 1. Sem cache nas API Routes
Toda API Route que lê o banco deve ter:
```ts
export const dynamic = 'force-dynamic'
```
Sem isso o Next.js cacheia em produção e os dados ficam desatualizados.

### 2. Sem ORM
Usar `pool.query()` com SQL puro e parâmetros posicionais (`$1`, `$2`).
Não instalar Prisma, Drizzle ou similar.

### 3. Origem dos dados
- `origem = 'brasil'` → formulário Typeform BR
- `origem = 'eua'` → formulário Typeform EUA
- Sempre filtrar por `origem` quando a lógica for específica de um país.

### 4. Novos campos no banco
Se precisar adicionar coluna: criar script SQL em `scripts/` e executar manualmente
na VPS. **Não há sistema de migrations automático.** Avisar antes de alterar schema.

### 5. Não commitar
- `.env` (credenciais)
- `scripts/_*.mjs` (scripts temporários de manutenção)
- Qualquer arquivo com senha, token ou chave

---

## Deploy

```
git push origin master
  → GitHub Actions: build Docker image → push para ghcr.io/edylawson/leads-ramon:latest
  → Coolify (VPS): pull da imagem + restart automático
  → ~3-5 min para estar no ar
```

- Branch de produção: `master`
- Não há ambiente de staging — push em master vai direto para produção
- O serviço Python (`diagnostico-service/`) tem CI/CD separado — trigger em `diagnostico-service/**`

---

## Variáveis de ambiente (produção — configuradas no Coolify)

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | Connection string PostgreSQL (interna Docker) |
| `DIAGNOSTICO_SERVICE_URL` | URL pública do serviço FastAPI de diagnóstico |

Não alterar essas vars sem alinhar com o responsável pelo projeto.

---

## Fluxo de colaboração entre agentes

Se mais de um agente (Claude, Codex, etc.) trabalhar neste repo:

1. **Commitar antes de trocar de agente** — evita conflito de contexto
2. **Verificar o último commit** (`git log --oneline -5`) antes de começar
3. **Não mexer no mesmo arquivo que outro agente alterou sem sincronizar**
4. Scripts temporários de banco: prefixo `_` em `scripts/` — apagar após uso
