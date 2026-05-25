# AGENTS.md - Leads Ramon (leads-frontend)

Contexto para qualquer agente de IA (Claude, Codex, etc.) que trabalhe neste repositorio.
Leia este arquivo antes de fazer qualquer alteracao.

---

## O que e este projeto

Painel interno de gestao de leads da Agencia EUA (parceria Ramon Lopes).
Exibe leads vindos de dois formularios Typeform - Brasil e EUA - com filtros,
modal de detalhe, controle de estagio, diagnostico de marketing e observacoes por lead.

URL em producao: `https://leadsramonbr.edylawson.com.br`

---

## Stack

| Camada | Tecnologia |
|--------|------------|
| Framework | Next.js 14 (App Router) |
| Linguagem | TypeScript |
| Estilo | Tailwind CSS |
| Banco | PostgreSQL self-hosted na VPS, nao Supabase |
| Cliente DB | `pg` (node-postgres), sem ORM, SQL direto |
| Deploy | Docker -> ghcr.io -> Coolify |
| CI/CD | GitHub Actions, trigger em push para `master` |

---

## Estrutura principal

```text
app/
  page.tsx
  api/
    leads/
      route.ts
      [id]/
        route.ts
        notas/route.ts
    responsaveis/route.ts
    diagnostics/generate/route.ts
    pipelines/route.ts
    agendamentos/route.ts
    agendamentos/disponibilidade/route.ts
    agendamentos/lead/route.ts
  diagnostico/[uuid]/route.ts
  agendar/page.tsx
diagnostico-service/
scripts/
```

Pontos criticos:

- `app/page.tsx`: concentra a UI principal, filtros, tabela, modal e acoes de lead.
- `app/api/leads/route.ts`: GET principal; qualquer mudanca aqui afeta a listagem inteira.
- `app/api/leads/[id]/route.ts`: GET do status do diagnostico e PATCH de `stage`, `responsavel_id` e `perfil`.
- `app/api/leads/[id]/notas/route.ts`: observacoes por lead.
- `app/api/diagnostics/generate/route.ts`: dispara a geracao do diagnostico via servico Python.
- `app/api/agendamentos/route.ts`: lista e cria agendamentos vinculados ao Google Calendar.
- `app/api/agendamentos/disponibilidade/route.ts`: calcula horarios disponiveis da agenda unica.
- `app/agendar/page.tsx`: pagina publica para leads escolherem um horario.
  - Aceita query params para pre-preencher dados vindos do Typeform: `lead_id`, `response_id`, `email`, `nome`/`name`, `telefone`/`phone`, `empresa`/`company`.
  - Quando `email`, `lead_id` ou `response_id` existe, a API cruza com a tabela `leads` para vincular o agendamento ao lead.
- `app/diagnostico/[uuid]/route.ts`: entrega o HTML salvo do diagnostico.
- `diagnostico-service/`: servico separado de geracao; mexer aqui somente quando a tarefa envolver o fluxo de diagnostico.

---

## Banco de dados

### Conexao

Sempre usar variavel de ambiente. Nunca hardcodar credenciais:

```ts
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false })
```

Para scripts locais em `scripts/`, a `DATABASE_URL` vem do `.env` local. Nunca commitar `.env`.

### Tabela principal: `leads`

Colunas mais relevantes:

```text
id, response_id, response_type ('completed' | 'partial')
first_name, last_name, email, phone
empresa, tipo_negocio, faturamento_anual, num_colaboradores, tempo_negocio
visibilidade_google, tem_gmb, usa_instagram, tem_site, url_site
youtube_url
investimento_mensal, faz_anuncios, canal_aquisicao, usa_ia
dor_sem_clientes, dor_sem_mkt, dor_sem_google, ... (booleans)
problema_principal, urgencia, trabalhou_agencia
intencao_avancar, intencao_entender, intencao_talvez
intencao_nao_momento, intencao_sem_orcamento, intencao_pensar (booleans)
perfil TEXT - 'A' | 'B' | 'C'
origem TEXT - 'brasil' | 'eua'
stage TEXT
stage_date, submit_date, created_at
origem TEXT (mercado: brasil | eua)
pipeline_id FK -> pipelines.id (pipeline operacional; origem continua sendo mercado/formulario)
origem_lead TEXT (origem/campanha/ultimo clique; antigo canal_vendas)
canal_vendas TEXT (legado temporario; nao usar em novas features)
utm_source, utm_medium, utm_campaign, utm_content, utm_term
responsavel_id FK -> responsaveis.id
diagnostico_url TEXT
```

### Outras tabelas

| Tabela | Uso |
|--------|-----|
| `responsaveis` | Vendedores/closers atribuiveis aos leads |
| `leads_historico_estagios` | Log automatico de mudancas de estagio |
| `notas` | Observacoes por lead com timestamp |
| `diagnosticos` | HTMLs de diagnostico gerados pelo servico Python |
| `agendamentos` | Reunioes marcadas na agenda unica e vinculadas a leads |
| `pipelines` | Pipelines operacionais para segmentar visoes e acoes comerciais |

### Estagios validos (`VALID_STAGES`)

```text
nao_iniciado, tentando_contato, primeiro_contato, follow_up,
reuniao_agendada, no_show, diagnostico_enviado, em_negociacao, ganho, perdido
```

Alguns estagios gravam timestamps de marco na primeira transicao:
`primeiro_contato_em`, `reuniao_em`, `diagnostico_enviado_em`, `fechado_em`.
Essa logica fica em `app/api/leads/[id]/route.ts` e nao deve ser removida.

### Regras de schema

- Nao existe sistema de migrations automatico.
- Se precisar mudar schema, criar script em `scripts/` e executar manualmente.
- Avisar antes de alterar colunas, constraints ou logica de historico.

---

## Regras criticas de desenvolvimento

### 1. Sem cache nas rotas que leem dados dinamicos

Rotas que leem do banco e precisam refletir estado atual devem usar:

```ts
export const dynamic = 'force-dynamic'
```

Isso vale para listagens, status, responsaveis, notas e HTML de diagnostico.

### 2. Sem ORM

Usar `pool.query()` com SQL puro e parametros posicionais (`$1`, `$2`, ...).
Nao instalar Prisma, Drizzle ou similares.

### 3. Origem dos dados

- `origem = 'brasil'` -> formulario Typeform BR
- `origem = 'eua'` -> formulario Typeform EUA
- Sempre filtrar por `origem` quando a logica for especifica de um pais.

### 4. Arquivos sensiveis e temporarios

Nao commitar:

- `.env`
- `.env.local`
- `scripts/_*.mjs`
- qualquer arquivo com senha, token ou chave

---

## Validacao antes de subir

Minimo esperado antes de push para producao:

```bash
npm run build
```

Se a mudanca tocar diagnostico, banco ou deploy, revisar tambem:

- variaveis de ambiente necessarias
- impacto no Coolify e no workflow
- impacto em queries de listagem e PATCH de lead

---

## Deploy

Fluxo principal:

```text
git push origin master
  -> GitHub Actions builda a imagem Docker
  -> push para ghcr.io/edylawson/leads-ramon:latest
  -> workflow chama a API do Coolify
  -> Coolify faz pull da imagem e reinicia o app
```

Regras:

- Branch de producao: `master`
- Nao ha staging; push em `master` vai para producao
- Nunca fazer force push sem alinhamento explicito
- Nunca commitar `.env`

O servico Python tem pipeline separado:

- arquivo: `.github/workflows/deploy-diagnostico.yml`
- trigger por mudancas em `diagnostico-service/**`
- imagem publicada em `ghcr.io/edylawson/diagnostico-service:latest`

---

## Variaveis de ambiente

### App Next.js

| Variavel | Uso |
|----------|-----|
| `DATABASE_URL` | conexao com PostgreSQL |
| `DIAGNOSTICO_SERVICE_URL` | URL do servico FastAPI de diagnostico |
| `GOOGLE_CALENDAR_ID` | ID da agenda unica usada para agendamentos |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | email da service account com acesso a agenda |
| `GOOGLE_PRIVATE_KEY` | chave privada da service account, com `\n` escapado |
| `GOOGLE_CALENDAR_TIME_ZONE` | fuso da agenda, padrao `America/New_York` |
| `BOOKING_START_HOUR` | hora inicial dos slots de agendamento |
| `BOOKING_END_HOUR` | hora final dos slots de agendamento |
| `BOOKING_SLOT_MINUTES` | duracao dos slots |

### Diagnostico service

| Variavel | Uso |
|----------|-----|
| `DATABASE_URL` | conexao com PostgreSQL |
| `ANTHROPIC_API_KEY` | geracao do diagnostico |
| `APIFY_API_TOKEN` | coleta de dados externos |
| `BASE_URL` | base usada para montar a URL final do diagnostico |

Nao alterar essas variaveis sem alinhar com o responsavel pelo projeto.

---

## Colaboracao entre agentes

Se mais de um agente trabalhar neste repo:

1. Commitar antes de trocar de agente.
2. Verificar o ultimo commit com `git log --oneline -5` antes de comecar.
3. Nao mexer no mesmo arquivo que outro agente alterou sem sincronizar.
4. Dividir por escopo sempre que possivel.
5. Apagar scripts temporarios depois do uso, quando nao forem mais necessarios.
