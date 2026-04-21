"""
Diagnóstico Service — FastAPI
Endpoint: POST /gerar/{lead_id}
Roda coleta de dados (Apify + PageSpeed) + Claude API + salva no banco.
"""
import os
import json
import asyncio
import logging
from pathlib import Path
from datetime import datetime, timezone

import psycopg2
import psycopg2.extras
import anthropic
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse

# ─── Config ──────────────────────────────────────────────────

logging.basicConfig(level=logging.INFO, format='[%(asctime)s] %(levelname)s %(message)s')
log = logging.getLogger(__name__)

SERVICE_DIR = Path(__file__).parent
BASE_URL = os.environ.get('BASE_URL', 'https://leadsramonbr.edylawson.com.br')
DATABASE_URL = os.environ.get('DATABASE_URL', '')
ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY', '')
APIFY_TOKEN = os.environ.get('APIFY_API_TOKEN', '')

SYSTEM_PROMPT = (SERVICE_DIR / 'system-prompt-diagnostico.md').read_text(encoding='utf-8')
TEMPLATE_HTML = (SERVICE_DIR / 'template.html').read_text(encoding='utf-8')

app = FastAPI(title='Diagnóstico Service', version='1.0.0')


@app.on_event('startup')
def startup():
    """Garante que a tabela diagnosticos existe com todas as colunas necessárias."""
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS diagnosticos (
                id           SERIAL PRIMARY KEY,
                lead_id      INTEGER REFERENCES leads(id),
                status       TEXT DEFAULT 'processando',
                versao       INTEGER DEFAULT 1,
                url          TEXT DEFAULT '',
                html_content TEXT,
                json_output  TEXT,
                error_message TEXT,
                gerado_em    TIMESTAMPTZ,
                criado_em    TIMESTAMPTZ DEFAULT NOW()
            )
        """)
        # Adiciona colunas que podem estar faltando em tabelas já existentes
        for col, definition in [
            ('html_content', 'TEXT'),
            ('json_output',  'TEXT'),
            ('error_message','TEXT'),
            ('url',          "TEXT DEFAULT ''"),
        ]:
            cur.execute(f"""
                ALTER TABLE diagnosticos ADD COLUMN IF NOT EXISTS {col} {definition}
            """)
        conn.commit()
        cur.close()
        conn.close()
        log.info('Tabela diagnosticos verificada/criada com sucesso')
    except Exception as e:
        log.error(f'Erro no startup ao verificar tabela: {e}')


# ─── Helpers de banco ────────────────────────────────────────

def get_conn():
    return psycopg2.connect(DATABASE_URL)


def get_lead(lead_id: int) -> dict:
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        cur.execute('SELECT * FROM leads WHERE id = %s', (lead_id,))
        row = cur.fetchone()
        if not row:
            raise ValueError(f'Lead {lead_id} não encontrado')
        return dict(row)
    finally:
        cur.close()
        conn.close()


def criar_diagnostico_processando(lead_id: int) -> int:
    """Insere registro na tabela diagnosticos com status='processando'. Retorna id."""
    conn = get_conn()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            INSERT INTO diagnosticos (lead_id, status, versao, url, gerado_em)
            VALUES (
                %s,
                'processando',
                COALESCE((SELECT MAX(versao) FROM diagnosticos WHERE lead_id = %s), 0) + 1,
                '',
                NOW()
            )
            RETURNING id
            """,
            (lead_id, lead_id)
        )
        diag_id = cur.fetchone()[0]
        conn.commit()
        return diag_id
    except:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()


def salvar_diagnostico(lead_id: int, diag_id: int, diagnostico: dict, html: str):
    url = f'{BASE_URL}/diagnostico/{diag_id}'
    json_output = json.dumps(diagnostico, ensure_ascii=False)
    conn = get_conn()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            UPDATE diagnosticos
            SET html_content = %s, json_output = %s, status = 'gerado', url = %s, gerado_em = NOW()
            WHERE id = %s
            """,
            (html, json_output, url, diag_id)
        )
        cur.execute('UPDATE leads SET diagnostico_url = %s WHERE id = %s', (url, lead_id))
        conn.commit()
        log.info(f'Diagnóstico #{diag_id} salvo. URL: {url}')
        return url
    except:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()


def marcar_erro(diag_id: int, mensagem: str):
    conn = get_conn()
    cur = conn.cursor()
    try:
        cur.execute(
            "UPDATE diagnosticos SET status = 'erro', error_message = %s WHERE id = %s",
            (mensagem[:500], diag_id)
        )
        conn.commit()
    finally:
        cur.close()
        conn.close()


# ─── Coleta de dados ─────────────────────────────────────────

def map_lead_para_formulario(row: dict) -> dict:
    """Converte row da tabela leads para o formato do formulário."""
    first = row.get('first_name', '') or ''
    last = row.get('last_name', '') or ''
    dor_map = {
        'dor_sem_clientes': 'Dificuldade em atrair clientes',
        'dor_sem_mkt': 'Sem estratégia de marketing definida',
        'dor_sem_google': 'Sem visibilidade no Google',
        'dor_anuncio_sem_retorno': 'Investe em anúncios sem retorno claro',
        'dor_sem_tempo_redes': 'Sem tempo para redes sociais',
        'dor_dependencia_op': 'Dependência operacional do dono',
        'dor_nao_monetiza': 'Dificuldade em monetizar',
        'dor_sem_autoridade': 'Falta de autoridade no mercado',
    }
    dores = [label for col, label in dor_map.items() if row.get(col)]
    return {
        'nome_responsavel': f'{first} {last}'.strip(),
        'email': row.get('email', '') or '',
        'telefone': row.get('phone', '') or '',
        'nome_empresa': row.get('empresa', '') or '',
        'tipo_negocio': row.get('tipo_negocio', '') or '',
        'tempo_mercado': row.get('tempo_negocio', '') or '',
        'num_funcionarios': row.get('num_colaboradores', '') or '',
        'faturamento': row.get('faturamento_anual', '') or '',
        'instagram_handle': row.get('instagram_handle', '') or '',
        'site_url': row.get('url_site', '') or '',
        'investimento_mensal': row.get('investimento_mensal', '') or '',
        'anuncios_pagos': 'Sim' if row.get('faz_anuncios') else 'Não',
        'origem_clientes': row.get('canal_aquisicao', '') or '',
        'maior_desafio': row.get('problema_principal', '') or '',
        'urgencia': row.get('urgencia', '') or '',
        'dores_identificadas': dores,
        'visibilidade_google': row.get('visibilidade_google', '') or '',
        'gmb_status': 'Sim' if row.get('tem_gmb') else 'Não',
    }


def coletar_dados_externos(formulario: dict) -> dict:
    """Coleta dados externos via Apify e PageSpeed em paralelo."""
    import requests
    import time
    from concurrent.futures import ThreadPoolExecutor, as_completed

    headers_apify = {
        'Authorization': f'Bearer {APIFY_TOKEN}',
        'Content-Type': 'application/json',
    }

    def run_apify(actor_id, input_data, timeout=180, memory=256):
        r = requests.post(
            f'https://api.apify.com/v2/acts/{actor_id}/runs?memory={memory}',
            headers=headers_apify, json=input_data, timeout=30
        )
        if r.status_code != 201:
            return None
        run_id = r.json()['data']['id']
        deadline = time.time() + timeout
        while time.time() < deadline:
            time.sleep(8)
            sr = requests.get(f'https://api.apify.com/v2/actor-runs/{run_id}', headers=headers_apify, timeout=15)
            info = sr.json()['data']
            if info['status'] == 'SUCCEEDED':
                dr = requests.get(f'https://api.apify.com/v2/datasets/{info["defaultDatasetId"]}/items?limit=5', headers=headers_apify, timeout=30)
                return dr.json() if dr.ok else []
            elif info['status'] in ('FAILED', 'ABORTED', 'TIMED-OUT'):
                return None
        return None

    def coletar_gmb(nome):
        result = run_apify('compass~crawler-google-places', {
            'searchStringsArray': [nome], 'maxCrawledPlacesPerSearch': 1,
            'includeReviews': True, 'maxReviews': 5, 'reviewsSort': 'newest',
        }, memory=512)
        return result[0] if result else None

    def coletar_instagram(handle):
        handle = handle.lstrip('@').strip()
        if not handle:
            return None
        result = run_apify('apify~instagram-profile-scraper', {'usernames': [handle]})
        return result[0] if result else None

    def coletar_site(url):
        if not url:
            return None
        url = url.strip()
        if not url.startswith('http'):
            url = f'https://{url}'
        result = run_apify('apify~website-content-crawler', {
            'startUrls': [{'url': url}], 'maxCrawlPages': 2,
            'crawlerType': 'cheerio', 'maxDepth': 1,
        })
        if result:
            return result
        try:
            r = requests.get(url, timeout=15, headers={'User-Agent': 'Mozilla/5.0 (compatible; DiagnosticoBot/1.0)'})
            if r.ok:
                return [{'url': url, 'text': r.text[:20000]}]
        except:
            pass
        return None

    def coletar_tecnologias(url):
        if not url:
            return None
        url = url.strip()
        if not url.startswith('http'):
            url = f'https://{url}'
        try:
            r = requests.get(url, timeout=15, headers={'User-Agent': 'Mozilla/5.0 (compatible; DiagnosticoBot/1.0)'})
            html = r.text.lower()
            checks = {
                'WordPress': 'wp-content' in html or 'wp-json' in html,
                'Wix': 'wix.com' in html,
                'Shopify': 'shopify' in html,
                'Google Analytics (GA4)': 'gtag' in html,
                'Google Tag Manager': 'googletagmanager' in html,
                'Meta Pixel': 'fbq(' in html,
            }
            return {'url': url, 'technologies': [k for k, v in checks.items() if v]}
        except:
            return None

    def coletar_pagespeed(url):
        if not url:
            return None
        url = url.strip()
        if not url.startswith('http'):
            url = f'https://{url}'
        resultados = {}
        for strategy in ['mobile', 'desktop']:
            try:
                r = requests.get(
                    'https://www.googleapis.com/pagespeedonline/v5/runPagespeed',
                    params={'url': url, 'strategy': strategy, 'category': 'performance'},
                    timeout=30
                )
                if r.ok:
                    data = r.json()
                    cats = data.get('lighthouseResult', {}).get('categories', {})
                    audits = data.get('lighthouseResult', {}).get('audits', {})
                    resultados[strategy] = {
                        'score': int(cats.get('performance', {}).get('score', 0) * 100),
                        'lcp': audits.get('largest-contentful-paint', {}).get('displayValue', ''),
                        'fcp': audits.get('first-contentful-paint', {}).get('displayValue', ''),
                    }
            except:
                pass
        return resultados or None

    nome = formulario.get('nome_empresa', '')
    instagram = formulario.get('instagram_handle', '')
    site = formulario.get('site_url', '')

    tasks = {}
    if nome:
        tasks['google_maps'] = lambda: coletar_gmb(nome)
    if instagram:
        tasks['instagram'] = lambda: coletar_instagram(instagram)
    if site:
        tasks['site_content'] = lambda: coletar_site(site)
        tasks['tecnologias'] = lambda: coletar_tecnologias(site)
        tasks['pagespeed'] = lambda: coletar_pagespeed(site)

    resultados = {'google_maps': None, 'instagram': None, 'site_content': None, 'tecnologias': None, 'pagespeed': None}

    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {executor.submit(fn): key for key, fn in tasks.items()}
        for future in as_completed(futures):
            key = futures[future]
            try:
                resultados[key] = future.result()
                log.info(f'Coleta {key}: {"ok" if resultados[key] else "sem dados"}')
            except Exception as e:
                log.warning(f'Coleta {key} erro: {e}')

    return resultados


# ─── Análise Claude ──────────────────────────────────────────

def analisar_com_claude(dados: dict) -> dict:
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    dados_str = json.dumps(dados, ensure_ascii=False, indent=2)

    message = client.messages.create(
        model='claude-opus-4-5',
        max_tokens=8000,
        system=SYSTEM_PROMPT,
        messages=[{
            'role': 'user',
            'content': f'Gere o diagnóstico completo para os seguintes dados:\n\n{dados_str}\n\nRetorne APENAS o JSON do diagnóstico, sem texto adicional.'
        }]
    )

    raw = message.content[0].text.strip()
    # Remove markdown code blocks se presentes
    if raw.startswith('```'):
        raw = raw.split('\n', 1)[1]
        raw = raw.rsplit('```', 1)[0]

    return json.loads(raw)


# ─── Renderização HTML ───────────────────────────────────────

def render_html(diagnostico: dict) -> str:
    json_str = json.dumps(diagnostico, ensure_ascii=False)
    return TEMPLATE_HTML.replace('/* DATA_PLACEHOLDER */', f'window.DIAGNOSTICO = {json_str};')


# ─── Task de background ──────────────────────────────────────

def processar_diagnostico(lead_id: int, diag_id: int):
    log.info(f'Iniciando processamento diagnóstico — lead_id={lead_id}, diag_id={diag_id}')
    try:
        lead = get_lead(lead_id)
        formulario = map_lead_para_formulario(lead)

        log.info(f'Coletando dados externos para: {formulario.get("nome_empresa", "?")}')
        externos = coletar_dados_externos(formulario)

        dados_completos = {
            'formulario': formulario,
            **externos,
            'coletado_em': datetime.now(timezone.utc).isoformat(),
        }

        log.info('Chamando Claude API...')
        diagnostico = analisar_com_claude(dados_completos)

        html = render_html(diagnostico)
        url = salvar_diagnostico(lead_id, diag_id, diagnostico, html)
        log.info(f'Diagnóstico concluído: {url}')

    except Exception as e:
        log.error(f'Erro no processamento diag_id={diag_id}: {e}')
        try:
            marcar_erro(diag_id, str(e))
        except:
            pass


# ─── Endpoints ───────────────────────────────────────────────

@app.get('/health')
def health():
    return {'status': 'ok', 'timestamp': datetime.now(timezone.utc).isoformat()}


@app.post('/gerar/{lead_id}')
def gerar_diagnostico(lead_id: int, background_tasks: BackgroundTasks):
    if not DATABASE_URL:
        raise HTTPException(status_code=500, detail='DATABASE_URL não configurada')
    if not ANTHROPIC_API_KEY:
        raise HTTPException(status_code=500, detail='ANTHROPIC_API_KEY não configurada')

    try:
        get_lead(lead_id)  # valida que lead existe
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    diag_id = criar_diagnostico_processando(lead_id)
    background_tasks.add_task(processar_diagnostico, lead_id, diag_id)

    log.info(f'Diagnóstico enfileirado — lead_id={lead_id}, diag_id={diag_id}')
    return {'status': 'processando', 'diagnostico_id': diag_id, 'lead_id': lead_id}
