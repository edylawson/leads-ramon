'use client'

import { useEffect, useState, useCallback } from 'react'

type Lead = {
  id: number
  response_id: string
  response_type: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  empresa: string | null
  tipo_negocio: string | null
  faturamento_anual: string | null
  num_colaboradores: string | null
  tempo_negocio: string | null
  visibilidade_google: string | null
  tem_gmb: string | null
  usa_instagram: string | null
  instagram_handle: string | null
  tem_site: string | null
  url_site: string | null
  investimento_mensal: string | null
  faz_anuncios: string | null
  canal_aquisicao: string | null
  usa_ia: string | null
  dor_sem_clientes: boolean
  dor_sem_mkt: boolean
  dor_sem_google: boolean
  dor_anuncio_sem_retorno: boolean
  dor_sem_tempo_redes: boolean
  dor_dependencia_op: boolean
  dor_nao_monetiza: boolean
  dor_sem_autoridade: boolean
  dor_quer_curso: boolean
  dor_conteudo_preso: boolean
  problema_principal: string | null
  urgencia: string | null
  trabalhou_agencia: string | null
  monetiza_conhecimento: string | null
  interesse_mentoria: string | null
  interesse_livro: string | null
  intencao_avancar: boolean
  intencao_entender: boolean
  intencao_talvez: boolean
  intencao_nao_momento: boolean
  diagnostico_url: string | null
  stage: string
  submit_date: string | null
  stage_date: string | null
}

const STAGES: { value: string; label: string; color: string; bg: string; border: string }[] = [
  { value: 'nao_iniciado',       label: 'Não iniciado',       color: 'text-gray-400',   bg: 'bg-gray-800/60',     border: 'border-gray-700' },
  { value: 'tentando_contato',   label: 'Tentando contato',   color: 'text-cyan-400',   bg: 'bg-cyan-900/30',     border: 'border-cyan-800' },
  { value: 'primeiro_contato',   label: 'Primeiro contato',   color: 'text-blue-400',   bg: 'bg-blue-900/30',     border: 'border-blue-800' },
  { value: 'follow_up',          label: 'Follow-up',          color: 'text-yellow-400', bg: 'bg-yellow-900/30',   border: 'border-yellow-800' },
  { value: 'reuniao_agendada',   label: 'Reunião agendada',   color: 'text-purple-400', bg: 'bg-purple-900/30',   border: 'border-purple-800' },
  { value: 'no_show',            label: 'No-show',            color: 'text-orange-400', bg: 'bg-orange-900/30',   border: 'border-orange-800' },
  { value: 'diagnostico_enviado',label: 'Diagnóstico enviado',color: 'text-violet-400', bg: 'bg-violet-900/30',   border: 'border-violet-800' },
  { value: 'em_negociacao',      label: 'Em negociação',      color: 'text-pink-400',   bg: 'bg-pink-900/30',     border: 'border-pink-800' },
  { value: 'ganho',              label: 'Ganho',              color: 'text-green-400',  bg: 'bg-green-900/30',    border: 'border-green-800' },
  { value: 'perdido',            label: 'Perdido',            color: 'text-red-400',    bg: 'bg-red-900/30',      border: 'border-red-800' },
]

function formatPhone(phone: string | null): string | null {
  if (!phone) return null
  return phone.replace(/\D/g, '')
}

const DORES: { key: keyof Lead; label: string }[] = [
  { key: 'dor_sem_clientes', label: 'Sem clientes suficientes' },
  { key: 'dor_sem_mkt', label: 'Não sabe marketing digital' },
  { key: 'dor_sem_google', label: 'Não aparece no Google' },
  { key: 'dor_anuncio_sem_retorno', label: 'Anúncio sem retorno' },
  { key: 'dor_sem_tempo_redes', label: 'Sem tempo para redes' },
  { key: 'dor_dependencia_op', label: 'Dependência operacional' },
  { key: 'dor_nao_monetiza', label: 'Não monetiza conhecimento' },
  { key: 'dor_sem_autoridade', label: 'Sem autoridade no mercado' },
  { key: 'dor_quer_curso', label: 'Quer criar curso/mentoria' },
  { key: 'dor_conteudo_preso', label: 'Conteúdo preso na cabeça' },
]

function CopyEmail({ email }: { email: string | null }) {
  const [copied, setCopied] = useState(false)
  if (!email) return <span className="text-gray-600 text-xs">—</span>
  const copy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(email).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <button
      onClick={copy}
      title="Clique para copiar"
      className="text-gray-500 text-xs hover:text-indigo-400 transition-colors flex items-center gap-1 group"
    >
      <span className="group-hover:underline">{email}</span>
      <span className="opacity-0 group-hover:opacity-100 text-[10px]">
        {copied ? '✓' : '⎘'}
      </span>
      {copied && <span className="text-indigo-400 text-[10px]">copiado!</span>}
    </button>
  )
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function urgencyColor(urgencia: string | null) {
  if (!urgencia) return 'text-gray-500'
  if (urgencia.toLowerCase().includes('urgente')) return 'text-red-400'
  if (urgencia.toLowerCase().includes('alta')) return 'text-orange-400'
  if (urgencia.toLowerCase().includes('planejando')) return 'text-yellow-400'
  return 'text-gray-400'
}

type DiagStatus = {
  status: 'sem_diagnostico' | 'processando' | 'gerado' | 'erro'
  diagnostico_id?: number
  versao?: number
  gerado_em?: string
  url?: string
  error_message?: string
}

function DiagnosticoPanel({ lead, onDiagnosticoFound }: { lead: Lead; onDiagnosticoFound?: (url: string) => void }) {
  const [diag, setDiag] = useState<DiagStatus | null>(null)
  const [gerando, setGerando] = useState(false)
  const [erroGerar, setErroGerar] = useState<string | null>(null)

  const fetchStatus = useCallback(() => {
    fetch(`/api/leads/${lead.id}`)
      .then(r => r.json())
      .then(setDiag)
      .catch(() => {})
  }, [lead.id])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  // Poll while processing
  useEffect(() => {
    if (diag?.status !== 'processando') return
    const interval = setInterval(fetchStatus, 3000)
    return () => clearInterval(interval)
  }, [diag?.status, fetchStatus])

  // Atualiza tabela principal quando diagnóstico é encontrado
  useEffect(() => {
    if (diag?.status === 'gerado' && diag.url) {
      onDiagnosticoFound?.(diag.url)
    }
  }, [diag?.status, diag?.url, onDiagnosticoFound])

  const handleGerar = async () => {
    setGerando(true)
    setErroGerar(null)
    try {
      const res = await fetch('/api/diagnostics/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: lead.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro desconhecido')
      setDiag({ status: 'processando' })
    } catch (e: unknown) {
      setErroGerar(e instanceof Error ? e.message : 'Erro ao iniciar geração')
      setGerando(false)
    }
  }

  if (!diag) return null

  if (diag.status === 'gerado' && diag.url) {
    return (
      <div className="mt-4 flex items-center gap-3">
        <a
          href={diag.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors"
        >
          Ver diagnóstico →
        </a>
        {diag.versao && diag.versao > 1 && (
          <span className="text-gray-500 text-xs">v{diag.versao}</span>
        )}
        {diag.gerado_em && (
          <span className="text-gray-600 text-xs">{formatDate(diag.gerado_em)}</span>
        )}
      </div>
    )
  }

  if (diag.status === 'processando') {
    return (
      <div className="mt-4 flex items-center gap-3">
        <div className="flex items-center gap-2 px-4 py-2 bg-yellow-900/30 border border-yellow-800 text-yellow-400 text-sm rounded-lg">
          <span className="animate-pulse">●</span> Gerando diagnóstico...
        </div>
        <span className="text-gray-600 text-xs">Atualiza automaticamente</span>
      </div>
    )
  }

  if (diag.status === 'erro') {
    return (
      <div className="mt-4">
        <span className="px-3 py-2 bg-red-900/30 border border-red-800 text-red-400 text-sm rounded-lg">
          Erro na geração{diag.error_message ? `: ${diag.error_message}` : ''}
        </span>
      </div>
    )
  }

  // sem_diagnostico
  return (
    <div className="mt-4 flex flex-col gap-2">
      <button
        onClick={handleGerar}
        disabled={gerando}
        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-700 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
      >
        {gerando ? (
          <><span className="animate-spin">⟳</span> Iniciando...</>
        ) : (
          'Gerar diagnóstico'
        )}
      </button>
      {erroGerar && <p className="text-red-400 text-xs">{erroGerar}</p>}
    </div>
  )
}

function Modal({ lead, onClose, onDiagnosticoFound }: { lead: Lead; onClose: () => void; onDiagnosticoFound?: (url: string) => void }) {
  const name = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || '—'
  const dores = DORES.filter(d => lead[d.key])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-xl font-semibold text-white">{name}</h2>
            {lead.empresa && <p className="text-gray-400 text-sm mt-0.5">{lead.empresa}</p>}
          </div>
          <div className="flex items-center gap-2">
            {lead.response_type === 'completed'
              ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-900/60 text-green-400 border border-green-700">Completo</span>
              : <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-900/60 text-yellow-400 border border-yellow-700">Parcial</span>
            }
            <button onClick={onClose} className="text-gray-500 hover:text-white ml-2 text-xl leading-none">✕</button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          {/* Contato */}
          <Section title="Contato">
            <div className="flex gap-2 items-center">
              <span className="text-gray-500 shrink-0">Email:</span>
              <CopyEmail email={lead.email} />
            </div>
            <Row label="Telefone" value={lead.phone} />
            <Row label="Data" value={formatDate(lead.submit_date || lead.stage_date)} />
          </Section>

          {/* Negócio */}
          <Section title="Negócio">
            <Row label="Segmento" value={lead.tipo_negocio} />
            <Row label="Tempo" value={lead.tempo_negocio} />
            <Row label="Equipe" value={lead.num_colaboradores} />
            <Row label="Faturamento" value={lead.faturamento_anual} />
          </Section>

          {/* Presença digital */}
          <Section title="Presença digital">
            <Row label="Google" value={lead.visibilidade_google} />
            <Row label="GMB" value={lead.tem_gmb} />
            <Row label="Instagram" value={lead.instagram_handle || lead.usa_instagram} />
            <Row label="Site" value={lead.url_site || lead.tem_site} link={lead.url_site} />
          </Section>

          {/* Marketing */}
          <Section title="Marketing atual">
            <Row label="Investimento" value={lead.investimento_mensal} />
            <Row label="Anúncios" value={lead.faz_anuncios} />
            <Row label="Aquisição" value={lead.canal_aquisicao} />
            <Row label="Usa IA" value={lead.usa_ia} />
          </Section>

          {/* Qualificação */}
          <Section title="Qualificação">
            <Row label="Urgência" value={lead.urgencia} valueClass={urgencyColor(lead.urgencia)} />
            <Row label="Já teve agência" value={lead.trabalhou_agencia} />
            <Row label="Monetiza conhecimento" value={lead.monetiza_conhecimento} />
            <Row label="Interesse mentoria" value={lead.interesse_mentoria} />
          </Section>

          {/* Intenção */}
          <Section title="Intenção">
            {lead.intencao_avancar && <Pill text="Quer avançar agora" color="green" />}
            {lead.intencao_entender && <Pill text="Precisa entender melhor" color="blue" />}
            {lead.intencao_talvez && <Pill text="Talvez, depende" color="yellow" />}
            {lead.intencao_nao_momento && <Pill text="Não é o momento" color="gray" />}
          </Section>
        </div>

        {/* Problema principal */}
        {lead.problema_principal && (
          <div className="mt-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
            <p className="text-xs text-gray-500 mb-1">Problema principal</p>
            <p className="text-gray-200 text-sm">"{lead.problema_principal}"</p>
          </div>
        )}

        {/* Dores */}
        {dores.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-gray-500 mb-2">Dores marcadas</p>
            <div className="flex flex-wrap gap-2">
              {dores.map(d => (
                <span key={d.key} className="px-2 py-0.5 rounded-full text-xs bg-red-900/40 text-red-300 border border-red-800">
                  {d.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Diagnóstico */}
        <DiagnosticoPanel lead={lead} onDiagnosticoFound={onDiagnosticoFound} />
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function Row({ label, value, link, valueClass }: { label: string; value: string | null | undefined; link?: string | null; valueClass?: string }) {
  if (!value) return null
  return (
    <div className="flex gap-2">
      <span className="text-gray-500 shrink-0">{label}:</span>
      {link
        ? <a href={link.startsWith('http') ? link : `https://${link}`} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline truncate">{value}</a>
        : <span className={valueClass || 'text-gray-200'}>{value}</span>
      }
    </div>
  )
}

function Pill({ text, color }: { text: string; color: 'green' | 'blue' | 'yellow' | 'gray' }) {
  const colors = {
    green: 'bg-green-900/40 text-green-300 border-green-800',
    blue: 'bg-blue-900/40 text-blue-300 border-blue-800',
    yellow: 'bg-yellow-900/40 text-yellow-300 border-yellow-800',
    gray: 'bg-gray-800 text-gray-400 border-gray-700',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs border ${colors[color]}`}>{text}</span>
  )
}

export default function Page() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [filtered, setFiltered] = useState<Lead[]>([])
  const [selected, setSelected] = useState<Lead | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'completed' | 'partial'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/leads')
      .then(r => r.json())
      .then(data => { setLeads(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    let result = leads
    if (filter !== 'all') result = result.filter(l => l.response_type === filter)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(l =>
        [l.first_name, l.last_name, l.empresa, l.email].some(v => v?.toLowerCase().includes(q))
      )
    }
    if (dateFrom) {
      result = result.filter(l => {
        const d = l.submit_date || l.stage_date
        return d && new Date(d) >= new Date(dateFrom)
      })
    }
    if (dateTo) {
      result = result.filter(l => {
        const d = l.submit_date || l.stage_date
        return d && new Date(d) <= new Date(dateTo + 'T23:59:59')
      })
    }
    setFiltered(result)
  }, [leads, search, filter, dateFrom, dateTo])

  const completed = leads.filter(l => l.response_type === 'completed').length
  const partial = leads.filter(l => l.response_type === 'partial').length

  const handleStageChange = (leadId: number, stage: string) => {
    const previous = leads.find(l => l.id === leadId)?.stage ?? 'nao_iniciado'
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage } : l))
    fetch(`/api/leads/${leadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage }),
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
      })
      .catch(() => {
        // Reverte se falhar
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage: previous } : l))
        alert('Erro ao salvar estágio. Tente novamente.')
      })
  }

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Leads — Agência Brasil</h1>
            <p className="text-gray-500 text-sm mt-1">Formulário de diagnóstico de marketing</p>
          </div>
          <div className="flex gap-3">
            <Stat label="Total" value={leads.length} />
            <Stat label="Completos" value={completed} color="green" />
            <Stat label="Parciais" value={partial} color="yellow" />
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-col gap-3 mb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Buscar por nome, empresa ou email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
            <div className="flex gap-2">
              {(['all', 'completed', 'partial'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === f
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-900 border border-gray-700 text-gray-400 hover:text-white'
                  }`}
                >
                  {f === 'all' ? 'Todos' : f === 'completed' ? 'Completos' : 'Parciais'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <span className="text-gray-500 text-sm shrink-0">Período:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-indigo-500 [color-scheme:dark]"
            />
            <span className="text-gray-600 text-sm">até</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-indigo-500 [color-scheme:dark]"
            />
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(''); setDateTo('') }}
                className="text-gray-500 hover:text-white text-sm"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {loading ? (
            <div className="py-20 text-center text-gray-500">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-gray-500">Nenhum lead encontrado.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider">
                  <th className="text-left px-4 py-3 hidden sm:table-cell">Data</th>
                  <th className="text-left px-4 py-3">Nome</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Empresa</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Segmento</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Faturamento</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">WhatsApp</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Estágio</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Diagnóstico</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead, i) => {
                  const name = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || '—'
                  return (
                    <tr
                      key={lead.id}
                      onClick={() => setSelected(lead)}
                      className={`border-b border-gray-800/60 cursor-pointer hover:bg-gray-800/50 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-900/50'}`}
                    >
                      <td className="px-4 py-3 text-gray-400 hidden sm:table-cell whitespace-nowrap">{formatDate(lead.submit_date || lead.stage_date)}</td>
                      <td className="px-4 py-3">
                        <p className="text-gray-100 font-medium">{name}</p>
                        <CopyEmail email={lead.email} />
                      </td>
                      <td className="px-4 py-3 text-gray-300 hidden md:table-cell">{lead.empresa || '—'}</td>
                      <td className="px-4 py-3 text-gray-400 hidden lg:table-cell">{lead.tipo_negocio || '—'}</td>
                      <td className="px-4 py-3 text-gray-400 hidden lg:table-cell">{lead.faturamento_anual || '—'}</td>
                      <td className="px-4 py-3 hidden md:table-cell" onClick={e => e.stopPropagation()}>
                        {formatPhone(lead.phone)
                          ? <a
                              href={`https://wa.me/${formatPhone(lead.phone)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs bg-green-900/30 text-green-400 border border-green-800 hover:bg-green-800/50 transition-colors whitespace-nowrap"
                            >
                              <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.533 5.857L.057 23.857a.5.5 0 0 0 .612.612l6.004-1.476A11.933 11.933 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.7-.528-5.228-1.449l-.374-.222-3.875.952.97-3.773-.244-.389A9.956 9.956 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                              {lead.phone}
                            </a>
                          : <span className="text-gray-600 text-xs">—</span>
                        }
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell" onClick={e => e.stopPropagation()}>
                        {(() => {
                          const s = STAGES.find(s => s.value === (lead.stage || 'nao_iniciado')) ?? STAGES[0]
                          return (
                            <select
                              value={lead.stage || 'nao_iniciado'}
                              onChange={e => handleStageChange(lead.id, e.target.value)}
                              className={`text-xs rounded-lg px-2 py-1 border cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500 ${s.bg} ${s.color} ${s.border}`}
                            >
                              {STAGES.map(st => (
                                <option key={st.value} value={st.value} className="bg-gray-900 text-gray-100">
                                  {st.label}
                                </option>
                              ))}
                            </select>
                          )
                        })()}
                      </td>
                      <td className="px-4 py-3">
                        {lead.response_type === 'completed'
                          ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-900/50 text-green-400 border border-green-800">Completo</span>
                          : <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-900/50 text-yellow-400 border border-yellow-800">Parcial</span>
                        }
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {lead.diagnostico_url
                          ? <a href={lead.diagnostico_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-indigo-900/50 text-indigo-400 border border-indigo-800 hover:bg-indigo-800/50 transition-colors">Ver →</a>
                          : <span className="px-2 py-0.5 rounded-full text-xs bg-gray-800/50 text-gray-600 border border-gray-800">Pendente</span>
                        }
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
        <p className="text-gray-600 text-xs mt-3">{filtered.length} lead{filtered.length !== 1 ? 's' : ''} exibido{filtered.length !== 1 ? 's' : ''}</p>
      </div>

      {selected && (
        <Modal
          lead={selected}
          onClose={() => setSelected(null)}
          onDiagnosticoFound={(url) => setLeads(prev => prev.map(l => l.id === selected.id ? { ...l, diagnostico_url: url } : l))}
        />
      )}
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color?: 'green' | 'yellow' }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 text-center min-w-[70px]">
      <p className={`text-xl font-bold ${color === 'green' ? 'text-green-400' : color === 'yellow' ? 'text-yellow-400' : 'text-white'}`}>{value}</p>
      <p className="text-gray-500 text-xs">{label}</p>
    </div>
  )
}
