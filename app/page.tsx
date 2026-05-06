'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

type Responsavel = {
  id: number
  nome: string
  email: string | null
}

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
  youtube_url: string | null
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
  perfil: string | null
  origem: string
  dor_so_brasileiro: boolean
  intencao_sem_orcamento: boolean
  intencao_pensar: boolean
  stage: string
  submit_date: string | null
  stage_date: string | null
  origem_lead: string | null
  responsavel_id: number | null
  responsavel_nome: string | null
}

type Agendamento = {
  id: number
  lead_id: number | null
  responsavel_id: number | null
  google_event_id: string | null
  google_event_link: string | null
  titulo: string
  nome: string
  email: string
  telefone: string | null
  empresa: string | null
  inicio: string
  fim: string
  timezone: string
  status: string
  observacoes: string | null
  origem: string | null
  origem_lead: string | null
  responsavel_nome: string | null
}

type EditableLeadField =
  | 'first_name'
  | 'last_name'
  | 'email'
  | 'phone'
  | 'empresa'
  | 'tipo_negocio'
  | 'faturamento_anual'
  | 'num_colaboradores'
  | 'tempo_negocio'
  | 'visibilidade_google'
  | 'tem_gmb'
  | 'usa_instagram'
  | 'instagram_handle'
  | 'tem_site'
  | 'url_site'
  | 'youtube_url'
  | 'investimento_mensal'
  | 'faz_anuncios'
  | 'canal_aquisicao'
  | 'usa_ia'
  | 'problema_principal'
  | 'urgencia'
  | 'trabalhou_agencia'
  | 'monetiza_conhecimento'
  | 'interesse_mentoria'
  | 'interesse_livro'

type EditableLeadPatch = Partial<Pick<Lead, EditableLeadField>>

type SortKey = 'date' | 'origem_lead' | 'name' | 'perfil' | 'segmento' | 'faturamento' | 'stage' | 'status' | 'diagnostico'
type SortDirection = 'asc' | 'desc'
type AppView = 'leads' | 'dashboard' | 'agenda'
type OriginFilter = 'todos' | 'brasil' | 'eua'

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

const PERFIL_SORT_ORDER: Record<string, number> = { A: 0, B: 1, C: 2 }
const STATUS_SORT_ORDER: Record<string, number> = { completed: 0, partial: 1 }
const SEM_PERFIL_FILTER = '__sem_perfil'
const SEM_ORIGEM_LEAD_FILTER = '__sem_origem_lead'
const SLA_STAGE_ALERT_DAYS = 2
const DAY_IN_MS = 24 * 60 * 60 * 1000
const FINAL_STAGES = new Set(['ganho', 'perdido'])

function formatPhone(phone: string | null): string | null {
  if (!phone) return null
  return phone.replace(/\D/g, '')
}

function getLeadName(lead: Lead) {
  return [lead.first_name, lead.last_name].filter(Boolean).join(' ')
}

function perfilCode(perfil: string | null) {
  if (!perfil) return null
  if (perfil.startsWith('A')) return 'A'
  if (perfil.startsWith('B')) return 'B'
  return 'C'
}

function dateValue(dateStr: string | null) {
  if (!dateStr) return null
  const timestamp = new Date(dateStr).getTime()
  return Number.isNaN(timestamp) ? null : timestamp
}

function daysSince(dateStr: string | null) {
  const timestamp = dateValue(dateStr)
  if (timestamp === null) return null
  return Math.max(0, Math.floor((Date.now() - timestamp) / DAY_IN_MS))
}

function getStageAgeDays(lead: Lead) {
  return daysSince(lead.stage_date || lead.submit_date)
}

function average(values: number[]) {
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function formatAverageDays(value: number | null) {
  if (value === null) return '--'
  const rounded = Math.round(value * 10) / 10
  return `${rounded}d`
}

function percent(part: number, total: number) {
  if (total === 0) return 0
  return Math.round((part / total) * 100)
}

function getLeadStage(lead: Lead) {
  return lead.stage || 'nao_iniciado'
}

function getOriginLabel(origem: string) {
  if (origem === 'brasil') return 'Brasil'
  if (origem === 'eua') return 'EUA'
  return origem || 'Sem origem'
}

function getLeadOriginLabel(origin: string | null) {
  return origin || 'Sem origem'
}

function matchesLeadOrigin(lead: Lead, originFilter: string) {
  if (!originFilter) return true
  if (originFilter === SEM_ORIGEM_LEAD_FILTER) return !lead.origem_lead
  return lead.origem_lead === originFilter
}

function firstCurrencyNumber(value: string | null) {
  if (!value) return null
  const match = value.match(/[0-9][0-9.,]*/)
  if (!match) return null
  const number = Number(match[0].replace(/\D/g, ''))
  return Number.isNaN(number) ? null : number
}

function getSortValue(lead: Lead, key: SortKey): string | number | null {
  if (key === 'date') return dateValue(lead.submit_date || lead.stage_date)
  if (key === 'origem_lead') return lead.origem_lead?.toLowerCase() ?? null
  if (key === 'name') return getLeadName(lead).toLowerCase() || null
  if (key === 'perfil') {
    const code = perfilCode(lead.perfil)
    return code ? PERFIL_SORT_ORDER[code] ?? 99 : null
  }
  if (key === 'segmento') return lead.tipo_negocio?.toLowerCase() ?? null
  if (key === 'faturamento') return firstCurrencyNumber(lead.faturamento_anual)
  if (key === 'stage') return STAGES.findIndex(s => s.value === (lead.stage || 'nao_iniciado'))
  if (key === 'status') return STATUS_SORT_ORDER[lead.response_type] ?? null
  if (key === 'diagnostico') return lead.diagnostico_url ? 0 : 1
  return null
}

function compareLeads(a: Lead, b: Lead, key: SortKey, direction: SortDirection) {
  const aValue = getSortValue(a, key)
  const bValue = getSortValue(b, key)
  const aEmpty = aValue === null || aValue === ''
  const bEmpty = bValue === null || bValue === ''

  if (aEmpty && bEmpty) return 0
  if (aEmpty) return 1
  if (bEmpty) return -1

  let result = 0
  if (typeof aValue === 'number' && typeof bValue === 'number') {
    result = aValue - bValue
  } else {
    result = String(aValue).localeCompare(String(bValue), 'pt-BR', { numeric: true, sensitivity: 'base' })
  }

  return direction === 'asc' ? result : -result
}

const DORES: { key: keyof Lead; label: string }[] = [
  { key: 'dor_sem_clientes',       label: 'Sem clientes suficientes' },
  { key: 'dor_so_brasileiro',      label: 'Clientela só brasileira — quer atingir americanos' },
  { key: 'dor_sem_mkt',            label: 'Não sabe marketing digital' },
  { key: 'dor_sem_google',         label: 'Não aparece no Google' },
  { key: 'dor_anuncio_sem_retorno',label: 'Anúncio sem retorno' },
  { key: 'dor_sem_tempo_redes',    label: 'Sem tempo para redes' },
  { key: 'dor_dependencia_op',     label: 'Dependência operacional' },
  { key: 'dor_nao_monetiza',       label: 'Não monetiza conhecimento' },
  { key: 'dor_sem_autoridade',     label: 'Sem autoridade no mercado' },
  { key: 'dor_quer_curso',         label: 'Quer criar curso/mentoria' },
  { key: 'dor_conteudo_preso',     label: 'Conteúdo preso na cabeça' },
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

function PerfilBadge({ perfil }: { perfil: string | null; size?: 'sm' | 'md' }) {
  if (!perfil) return null
  const code = perfilCode(perfil)
  if (!code) return null
  const styles: Record<string, string> = {
    'A':  'bg-green-900/50 text-green-300 border-green-700',
    'B':  'bg-amber-900/50 text-amber-300 border-amber-700',
    'C':  'bg-red-900/50 text-red-400 border-red-800',
  }
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${styles[code]}`}
      title={perfil}
    >
      {code}
    </span>
  )
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

type Nota = {
  id: number
  texto: string
  criado_em: string
  responsavel_nome: string | null
}

function NotasPanel({ leadId, responsavelId }: { leadId: number; responsavelId: number | null }) {
  const [notas, setNotas] = useState<Nota[]>([])
  const [texto, setTexto] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/leads/${leadId}/notas`)
      .then(r => r.json())
      .then(data => Array.isArray(data) ? setNotas(data) : null)
      .catch(() => {})
  }, [leadId])

  const salvar = async () => {
    if (!texto.trim()) return
    setSalvando(true)
    setErro(null)
    try {
      const res = await fetch(`/api/leads/${leadId}/notas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto, responsavel_id: responsavelId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar')
      setNotas(prev => [{ ...data, responsavel_nome: null }, ...prev])
      setTexto('')
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  const excluir = async (notaId: number) => {
    await fetch(`/api/leads/${leadId}/notas`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nota_id: notaId }),
    })
    setNotas(prev => prev.filter(n => n.id !== notaId))
  }

  const formatDateTime = (dt: string) =>
    new Date(dt).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })

  return (
    <div className="mt-5 border-t border-gray-800 pt-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Observações</p>

      {/* Input nova nota */}
      <div className="flex flex-col gap-2 mb-4">
        <textarea
          value={texto}
          onChange={e => setTexto(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) salvar() }}
          placeholder="Digite uma observação... (Ctrl+Enter para salvar)"
          rows={3}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500 resize-none"
        />
        <div className="flex items-center justify-between">
          {erro && <p className="text-red-400 text-xs">{erro}</p>}
          <button
            onClick={salvar}
            disabled={salvando || !texto.trim()}
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-700 hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs rounded-lg transition-colors"
          >
            {salvando ? 'Salvando...' : 'Salvar observação'}
          </button>
        </div>
      </div>

      {/* Lista de notas */}
      {notas.length === 0 ? (
        <p className="text-gray-600 text-xs text-center py-3">Nenhuma observação registrada.</p>
      ) : (
        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
          {notas.map(n => (
            <div key={n.id} className="bg-gray-800/60 border border-gray-700/60 rounded-lg px-3 py-2.5 group">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-gray-500 text-[11px]">
                  {formatDateTime(n.criado_em)}
                  {n.responsavel_nome && <span className="text-gray-600"> · {n.responsavel_nome}</span>}
                </span>
                <button
                  onClick={() => excluir(n.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 text-xs transition-all"
                  title="Excluir observação"
                >
                  ✕
                </button>
              </div>
              <p className="text-gray-200 text-sm whitespace-pre-wrap">{n.texto}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Modal({ lead, onClose, onDiagnosticoFound, responsaveis, onResponsavelChange, onLeadUpdate }: {
  lead: Lead
  onClose: () => void
  onDiagnosticoFound?: (url: string) => void
  responsaveis: Responsavel[]
  onResponsavelChange: (leadId: number, responsavel_id: number | null) => void
  onLeadUpdate: (leadId: number, patch: EditableLeadPatch) => Promise<boolean>
}) {
  const name = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || '—'
  const dores = DORES.filter(d => lead[d.key])
  const [savingField, setSavingField] = useState<EditableLeadField | null>(null)
  const [editError, setEditError] = useState('')

  const saveField = async (field: EditableLeadField, value: string) => {
    setSavingField(field)
    setEditError('')
    try {
      const ok = await onLeadUpdate(lead.id, { [field]: value.trim() || null } as EditableLeadPatch)
      if (!ok) setEditError('Nao foi possivel salvar. Tente novamente.')
      return ok
    } finally {
      setSavingField(null)
    }
  }

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
            <EditableRow label="Nome" field="first_name" value={lead.first_name} onSave={saveField} saving={savingField === 'first_name'} />
            <EditableRow label="Sobrenome" field="last_name" value={lead.last_name} onSave={saveField} saving={savingField === 'last_name'} />
            <EditableRow label="Email" field="email" value={lead.email} onSave={saveField} saving={savingField === 'email'} />
            <EditableRow label="Telefone" field="phone" value={lead.phone} onSave={saveField} saving={savingField === 'phone'} />
            <Row label="Data" value={formatDate(lead.submit_date || lead.stage_date)} />
            <div className="flex gap-2 items-center pt-1">
              <span className="text-gray-500 shrink-0 text-sm">Responsável:</span>
              <select
                value={lead.responsavel_id ?? ''}
                onChange={e => onResponsavelChange(lead.id, e.target.value ? Number(e.target.value) : null)}
                className="text-xs rounded-lg px-2 py-1 border border-gray-700 bg-gray-800 text-gray-300 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Sem responsável</option>
                {responsaveis.map(r => (
                  <option key={r.id} value={r.id} className="bg-gray-900">{r.nome}</option>
                ))}
              </select>
            </div>
          </Section>

          {/* Negócio */}
          <Section title="Negócio">
            <EditableRow label="Empresa" field="empresa" value={lead.empresa} onSave={saveField} saving={savingField === 'empresa'} />
            <EditableRow label="Segmento" field="tipo_negocio" value={lead.tipo_negocio} onSave={saveField} saving={savingField === 'tipo_negocio'} />
            <EditableRow label="Tempo" field="tempo_negocio" value={lead.tempo_negocio} onSave={saveField} saving={savingField === 'tempo_negocio'} />
            <EditableRow label="Equipe" field="num_colaboradores" value={lead.num_colaboradores} onSave={saveField} saving={savingField === 'num_colaboradores'} />
            <EditableRow label="Faturamento" field="faturamento_anual" value={lead.faturamento_anual} onSave={saveField} saving={savingField === 'faturamento_anual'} />
          </Section>

          {/* Presença digital */}
          <Section title="Presença digital">
            <EditableRow label="Google" field="visibilidade_google" value={lead.visibilidade_google} onSave={saveField} saving={savingField === 'visibilidade_google'} />
            <EditableRow label="GMB" field="tem_gmb" value={lead.tem_gmb} onSave={saveField} saving={savingField === 'tem_gmb'} />
            <EditableRow label="Usa Instagram" field="usa_instagram" value={lead.usa_instagram} onSave={saveField} saving={savingField === 'usa_instagram'} />
            <EditableRow label="@ Instagram" field="instagram_handle" value={lead.instagram_handle} onSave={saveField} saving={savingField === 'instagram_handle'} />
            <EditableRow label="Tem site" field="tem_site" value={lead.tem_site} onSave={saveField} saving={savingField === 'tem_site'} />
            <EditableRow label="URL site" field="url_site" value={lead.url_site} link={lead.url_site} onSave={saveField} saving={savingField === 'url_site'} />
            <EditableRow label="YouTube" field="youtube_url" value={lead.youtube_url} link={lead.youtube_url} onSave={saveField} saving={savingField === 'youtube_url'} />
          </Section>

          {/* Marketing */}
          <Section title="Marketing atual">
            <EditableRow label="Investimento" field="investimento_mensal" value={lead.investimento_mensal} onSave={saveField} saving={savingField === 'investimento_mensal'} />
            <EditableRow label="Anúncios" field="faz_anuncios" value={lead.faz_anuncios} onSave={saveField} saving={savingField === 'faz_anuncios'} />
            <EditableRow label="Aquisição" field="canal_aquisicao" value={lead.canal_aquisicao} onSave={saveField} saving={savingField === 'canal_aquisicao'} />
            <EditableRow label="Usa IA" field="usa_ia" value={lead.usa_ia} onSave={saveField} saving={savingField === 'usa_ia'} />
          </Section>

          {/* Qualificação */}
          <Section title="Qualificação">
            {lead.perfil && (
              <div className="flex gap-2 items-center">
                <span className="text-gray-500 shrink-0">Perfil:</span>
                <PerfilBadge perfil={lead.perfil} />
              </div>
            )}
            <EditableRow label="Urgência" field="urgencia" value={lead.urgencia} valueClass={urgencyColor(lead.urgencia)} onSave={saveField} saving={savingField === 'urgencia'} />
            <EditableRow label="Já teve agência" field="trabalhou_agencia" value={lead.trabalhou_agencia} onSave={saveField} saving={savingField === 'trabalhou_agencia'} />
            <EditableRow label="Monetiza conhecimento" field="monetiza_conhecimento" value={lead.monetiza_conhecimento} onSave={saveField} saving={savingField === 'monetiza_conhecimento'} />
            <EditableRow label="Interesse mentoria" field="interesse_mentoria" value={lead.interesse_mentoria} onSave={saveField} saving={savingField === 'interesse_mentoria'} />
            <EditableRow label="Interesse livro" field="interesse_livro" value={lead.interesse_livro} onSave={saveField} saving={savingField === 'interesse_livro'} />
          </Section>

          {/* Intenção */}
          <Section title="Intenção">
            {lead.intencao_avancar && <Pill text="Quer avançar agora" color="green" />}
            {lead.intencao_entender && <Pill text="Precisa entender melhor" color="blue" />}
            {lead.intencao_talvez && <Pill text="Talvez, depende" color="yellow" />}
            {lead.intencao_nao_momento && <Pill text="Não é o momento" color="gray" />}
            {lead.intencao_sem_orcamento && <Pill text="Sem orçamento no momento" color="gray" />}
            {lead.intencao_pensar && <Pill text="Precisa pensar / conversar com sócios" color="gray" />}
          </Section>
        </div>

        {editError && (
          <div className="mt-4 rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-200">
            {editError}
          </div>
        )}

        {/* Problema principal */}
        <div className="mt-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
          <p className="text-xs text-gray-500 mb-2">Problema principal</p>
          <EditableRow
            label=""
            field="problema_principal"
            value={lead.problema_principal}
            onSave={saveField}
            saving={savingField === 'problema_principal'}
            multiline
            placeholder="Clique para preencher ou corrigir o problema principal"
          />
        </div>

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

        {/* Observações */}
        <NotasPanel leadId={lead.id} responsavelId={lead.responsavel_id} />
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

function EditableRow({ label, field, value, link, valueClass, multiline = false, placeholder = 'Clique para editar', saving, onSave }: {
  label: string
  field: EditableLeadField
  value: string | null | undefined
  link?: string | null
  valueClass?: string
  multiline?: boolean
  placeholder?: string
  saving?: boolean
  onSave: (field: EditableLeadField, value: string) => Promise<boolean>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value || '')

  useEffect(() => {
    if (!editing) setDraft(value || '')
  }, [editing, value])

  const save = async () => {
    const ok = await onSave(field, draft)
    if (ok) setEditing(false)
  }

  const cancel = () => {
    setDraft(value || '')
    setEditing(false)
  }

  if (editing) {
    const inputClass = 'w-full rounded-lg border border-indigo-700 bg-gray-950 px-2 py-1.5 text-sm text-gray-100 outline-none focus:border-indigo-400'
    return (
      <div className="grid gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label || 'Campo'}</label>
        {multiline ? (
          <textarea
            value={draft}
            onChange={event => setDraft(event.target.value)}
            rows={3}
            autoFocus
            className={inputClass}
          />
        ) : (
          <input
            value={draft}
            onChange={event => setDraft(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') save()
              if (event.key === 'Escape') cancel()
            }}
            autoFocus
            className={inputClass}
          />
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white transition-colors hover:bg-indigo-500 disabled:bg-gray-700"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
          <button
            type="button"
            onClick={cancel}
            disabled={saving}
            className="rounded-lg border border-gray-700 px-2.5 py-1 text-xs font-semibold text-gray-400 transition-colors hover:text-white"
          >
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  const displayValue = value || ''
  return (
    <div className="flex items-start gap-2">
      {label && <span className="text-gray-500 shrink-0">{label}:</span>}
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={`min-w-0 text-left transition-colors hover:text-indigo-300 hover:underline ${displayValue ? valueClass || 'text-gray-200' : 'text-gray-600 italic'}`}
        title="Clique para editar"
      >
        {displayValue || placeholder}
      </button>
      {link && displayValue && (
        <a
          href={link.startsWith('http') ? link : `https://${link}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={event => event.stopPropagation()}
          className="shrink-0 text-xs text-indigo-500 hover:text-indigo-300"
          title="Abrir link"
        >
          abrir
        </a>
      )}
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

function SortButton({ column, activeSort, direction, onSort }: {
  column: SortKey
  activeSort: SortKey | null
  direction: SortDirection
  onSort: (column: SortKey) => void
}) {
  const active = activeSort === column
  const title = !active
    ? 'Ordenar asc'
    : direction === 'asc'
      ? 'Ordenar desc'
      : 'Remover ordenação'

  return (
    <button
      type="button"
      onClick={e => { e.stopPropagation(); onSort(column) }}
      title={title}
      className={`inline-flex h-5 w-5 items-center justify-center rounded border transition-colors ${
        active
          ? 'border-indigo-500/60 bg-indigo-500/10 text-indigo-300'
          : 'border-transparent text-gray-600 hover:border-gray-700 hover:bg-gray-800 hover:text-gray-300'
      }`}
    >
      <svg className="h-3.5 w-3.5" viewBox="0 0 10 14" aria-hidden="true">
        <path d="M5 1 1.5 5h7L5 1Z" className={active && direction === 'asc' ? 'fill-indigo-300' : 'fill-current'} />
        <path d="M5 13 8.5 9h-7L5 13Z" className={active && direction === 'desc' ? 'fill-indigo-300' : 'fill-current'} />
      </svg>
    </button>
  )
}

function HeaderControl({ label, column, activeSort, direction, onSort, onFilterClick, filterActive, filterOpen }: {
  label: string
  column: SortKey
  activeSort: SortKey | null
  direction: SortDirection
  onSort: (column: SortKey) => void
  onFilterClick?: () => void
  filterActive?: boolean
  filterOpen?: boolean
}) {
  const labelClass = `flex items-center gap-1.5 uppercase tracking-wider transition-colors ${
    filterActive ? 'text-indigo-400' : 'hover:text-white'
  }`

  return (
    <div className="flex items-center gap-1.5">
      {onFilterClick ? (
        <button type="button" onClick={onFilterClick} className={labelClass}>
          {label}
          {filterActive && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block shrink-0" />}
          <svg className={`w-3 h-3 opacity-60 transition-transform ${filterOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      ) : (
        <span className="uppercase tracking-wider">{label}</span>
      )}
      <SortButton column={column} activeSort={activeSort} direction={direction} onSort={onSort} />
    </div>
  )
}

function ResponsavelDot({ nome }: { nome: string | null }) {
  const initials = nome?.trim().slice(0, 2).toUpperCase()
  return (
    <span
      title={nome ? `Responsável: ${nome}` : 'Sem responsável'}
      className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${
        initials
          ? 'border-indigo-700/70 bg-indigo-950/50 text-indigo-200'
          : 'border-gray-700 bg-gray-800/70 text-gray-500'
      }`}
    >
      {initials || 'SR'}
    </span>
  )
}

function StageSlaBadge({ lead }: { lead: Lead }) {
  const days = getStageAgeDays(lead)

  if (days === null) {
    return (
      <span
        title="Sem data para calcular SLA"
        className="inline-flex h-7 min-w-9 items-center justify-center rounded-lg border border-gray-800 bg-gray-900/60 px-2 text-[11px] font-bold text-gray-600"
      >
        --
      </span>
    )
  }

  const expired = days >= SLA_STAGE_ALERT_DAYS
  const dayLabel = days === 1 ? 'dia' : 'dias'

  return (
    <span
      title={`Ha ${days} ${dayLabel} neste estagio. SLA: ${SLA_STAGE_ALERT_DAYS} dias.`}
      className={`inline-flex h-7 min-w-9 items-center justify-center rounded-lg border px-2 text-[11px] font-bold ${
        expired
          ? 'border-red-700 bg-red-950/70 text-red-300'
          : 'border-gray-700 bg-gray-800/70 text-gray-400'
      }`}
    >
      {days}d
    </span>
  )
}

function AppSidebar({ activeView, onViewChange, totalLeads }: {
  activeView: AppView
  onViewChange: (view: AppView) => void
  totalLeads: number
}) {
  const items: { value: AppView; label: string; description: string; icon: string }[] = [
    { value: 'leads', label: 'Leads', description: 'Tabela e operacao', icon: 'LD' },
    { value: 'dashboard', label: 'Dashboard', description: 'Resumo comercial', icon: 'DB' },
    { value: 'agenda', label: 'Agenda', description: 'Reunioes marcadas', icon: 'AG' },
  ]

  return (
    <aside className="border-b border-gray-800 bg-gray-950/95 p-4 lg:min-h-screen lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r lg:sticky lg:top-0">
      <div className="flex items-center justify-between gap-4 lg:block">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-indigo-300">High Digital</p>
          <h1 className="mt-2 text-xl font-bold text-white">Leads Hub</h1>
          <p className="mt-1 text-xs text-gray-500">{totalLeads} leads no banco</p>
        </div>
        <div className="hidden rounded-full border border-indigo-800/70 bg-indigo-950/30 px-3 py-1 text-xs font-semibold text-indigo-200 sm:block lg:mt-5 lg:inline-block">
          Comercial
        </div>
      </div>

      <nav className="mt-5 grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
        {items.map(item => {
          const active = activeView === item.value
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => onViewChange(item.value)}
              className={`group flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-all ${
                active
                  ? 'border-indigo-500/70 bg-indigo-500/10 text-white shadow-lg shadow-indigo-950/30'
                  : 'border-gray-800 bg-gray-900/60 text-gray-400 hover:border-gray-700 hover:bg-gray-900 hover:text-white'
              }`}
            >
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl border text-xs font-bold ${
                active
                  ? 'border-indigo-400/70 bg-indigo-500 text-white'
                  : 'border-gray-700 bg-gray-950 text-gray-500 group-hover:text-gray-200'
              }`}>
                {item.icon}
              </span>
              <span>
                <span className="block text-sm font-semibold">{item.label}</span>
                <span className="block text-xs text-gray-500">{item.description}</span>
              </span>
            </button>
          )
        })}
      </nav>

      <div className="mt-5 hidden rounded-2xl border border-gray-800 bg-gray-900/50 p-3 lg:block">
        <p className="text-xs font-semibold text-gray-300">Atalho de leitura</p>
        <p className="mt-1 text-xs leading-relaxed text-gray-500">
          Use o dashboard e a agenda para acompanhar volume, gargalos e reunioes marcadas.
        </p>
      </div>
    </aside>
  )
}

function DashboardMetric({ label, value, caption, color = 'white' }: {
  label: string
  value: string | number
  caption: string
  color?: 'white' | 'green' | 'red' | 'yellow' | 'indigo'
}) {
  const colors = {
    white: 'text-white',
    green: 'text-green-300',
    red: 'text-red-300',
    yellow: 'text-yellow-300',
    indigo: 'text-indigo-300',
  }

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-4 shadow-lg shadow-black/10">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</p>
      <p className={`mt-3 text-3xl font-bold ${colors[color]}`}>{value}</p>
      <p className="mt-1 text-xs text-gray-500">{caption}</p>
    </div>
  )
}

function DashboardFilterButton({ active, label, onClick }: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
        active
          ? 'border-indigo-500 bg-indigo-600 text-white'
          : 'border-gray-700 bg-gray-900 text-gray-400 hover:text-white'
      }`}
    >
      {label}
    </button>
  )
}

function MetricBar({ label, value, max, detail, color = 'bg-indigo-500' }: {
  label: string
  value: number
  max: number
  detail?: string
  color?: string
}) {
  const width = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0

  return (
    <div>
      {(label || detail) && (
        <div className="mb-1 flex items-center justify-between gap-3 text-xs">
          <span className="font-medium text-gray-300">{label}</span>
          <span className="text-gray-500">{detail ?? value}</span>
        </div>
      )}
      <div className="h-2 overflow-hidden rounded-full bg-gray-800">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  )
}

function DashboardView({ leads, origemLeadOptions, mercadoFilter, onMercadoChange, origemLeadFilter, onOrigemLeadChange, loading }: {
  leads: Lead[]
  origemLeadOptions: string[]
  mercadoFilter: OriginFilter
  onMercadoChange: (value: OriginFilter) => void
  origemLeadFilter: string
  onOrigemLeadChange: (value: string) => void
  loading: boolean
}) {
  const dashboardLeads = leads.filter(lead => {
    const matchesMarket = mercadoFilter === 'todos' || lead.origem === mercadoFilter
    return matchesMarket && matchesLeadOrigin(lead, origemLeadFilter)
  })
  const activeLeads = dashboardLeads.filter(lead => !FINAL_STAGES.has(getLeadStage(lead)))
  const won = dashboardLeads.filter(lead => getLeadStage(lead) === 'ganho').length
  const lost = dashboardLeads.filter(lead => getLeadStage(lead) === 'perdido').length
  const open = dashboardLeads.length - won - lost
  const stageAges = activeLeads
    .map(getStageAgeDays)
    .filter((value): value is number => value !== null)
  const avgStageAge = average(stageAges)
  const slaAlerts = activeLeads.filter(lead => {
    const days = getStageAgeDays(lead)
    return days !== null && days >= SLA_STAGE_ALERT_DAYS
  }).length
  const conversion = percent(won, dashboardLeads.length)

  const stageMetrics = STAGES.map(stage => {
    const items = dashboardLeads.filter(lead => getLeadStage(lead) === stage.value)
    const ages = items.map(getStageAgeDays).filter((value): value is number => value !== null)
    return {
      ...stage,
      count: items.length,
      avgDays: average(ages),
      percentage: percent(items.length, dashboardLeads.length),
    }
  })
  const maxStageCount = Math.max(...stageMetrics.map(stage => stage.count), 1)

  const originMetrics = (['brasil', 'eua'] as const).map(origin => {
    const count = dashboardLeads.filter(lead => lead.origem === origin).length
    return { label: getOriginLabel(origin), count }
  })
  const maxOriginCount = Math.max(...originMetrics.map(item => item.count), 1)

  const leadOriginMetrics = Array.from(
    dashboardLeads.reduce((map, lead) => {
      const label = getLeadOriginLabel(lead.origem_lead)
      map.set(label, (map.get(label) ?? 0) + 1)
      return map
    }, new Map<string, number>())
  )
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'pt-BR'))
  const maxLeadOriginCount = Math.max(...leadOriginMetrics.map(item => item.count), 1)
  const hasNoLeadOrigin = leads.some(lead => !lead.origem_lead)

  if (loading) {
    return (
      <div className="rounded-3xl border border-gray-800 bg-gray-900 p-10 text-center text-gray-500">
        Carregando dashboard...
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-300">Dashboard</p>
          <h2 className="mt-2 text-3xl font-bold text-white">Visao geral comercial</h2>
          <p className="mt-2 max-w-2xl text-sm text-gray-500">
            Resumo rapido para acompanhar volume, mercado, origem, ganhos, perdas e tempo parado em cada etapa.
          </p>
        </div>
        <div className="rounded-2xl border border-gray-800 bg-gray-900/70 px-4 py-3 text-sm text-gray-400">
          SLA atual: <span className="font-bold text-red-300">{SLA_STAGE_ALERT_DAYS} dias</span>
        </div>
      </div>

      <div className="mb-6 rounded-3xl border border-gray-800 bg-gray-900/70 p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Filtros do dashboard</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {([
                { value: 'todos', label: 'Todos' },
                { value: 'brasil', label: 'Brasil' },
                { value: 'eua', label: 'EUA' },
              ] as const).map(option => (
                <DashboardFilterButton
                  key={option.value}
                  active={mercadoFilter === option.value}
                  label={option.label}
                  onClick={() => onMercadoChange(option.value)}
                />
              ))}
            </div>
          </div>

          <div className="min-w-full xl:min-w-[320px]">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Origem
            </label>
            <select
              value={origemLeadFilter}
              onChange={event => onOrigemLeadChange(event.target.value)}
              className="w-full rounded-xl border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-200 outline-none transition-colors focus:border-indigo-500"
            >
              <option value="">Todas as origens</option>
              {hasNoLeadOrigin && <option value={SEM_ORIGEM_LEAD_FILTER}>Sem origem</option>}
              {origemLeadOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <DashboardMetric label="Leads" value={dashboardLeads.length} caption="No recorte atual" />
        <DashboardMetric label="Abertos" value={open} caption="Ainda em andamento" color="indigo" />
        <DashboardMetric label="Ganhos" value={won} caption={`${conversion}% de conversao`} color="green" />
        <DashboardMetric label="Perdidos" value={lost} caption={`${percent(lost, dashboardLeads.length)}% do total`} color="red" />
        <DashboardMetric label="SLA alerta" value={slaAlerts} caption={`Com ${SLA_STAGE_ALERT_DAYS}d ou mais`} color="yellow" />
        <DashboardMetric label="Tempo medio" value={formatAverageDays(avgStageAge)} caption="Em etapas abertas" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <section className="rounded-3xl border border-gray-800 bg-gray-900/70 p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-white">Leads por estagio</h3>
              <p className="text-xs text-gray-500">Quantidade e percentual no recorte atual</p>
            </div>
            <span className="rounded-full border border-gray-800 px-3 py-1 text-xs text-gray-500">
              {dashboardLeads.length} total
            </span>
          </div>
          <div className="grid gap-3">
            {stageMetrics.map(stage => (
              <div key={stage.value} className="rounded-2xl border border-gray-800 bg-gray-950/40 p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${stage.bg}`} />
                    <span className="text-sm font-medium text-gray-200">{stage.label}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-white">{stage.count}</p>
                    <p className="text-[11px] text-gray-600">{stage.percentage}%</p>
                  </div>
                </div>
                <MetricBar label="" value={stage.count} max={maxStageCount} color="bg-indigo-500" />
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-6">
          <section className="rounded-3xl border border-gray-800 bg-gray-900/70 p-5">
            <h3 className="font-semibold text-white">Tempo medio por estagio</h3>
            <p className="mb-4 text-xs text-gray-500">Media de dias desde a ultima troca de etapa</p>
            <div className="grid gap-3">
              {stageMetrics.filter(stage => stage.count > 0).map(stage => (
                <div key={stage.value} className="flex items-center justify-between rounded-2xl bg-gray-950/50 px-3 py-2">
                  <span className="text-sm text-gray-300">{stage.label}</span>
                  <span className={`rounded-lg border px-2 py-1 text-xs font-bold ${
                    (stage.avgDays ?? 0) >= SLA_STAGE_ALERT_DAYS
                      ? 'border-red-800 bg-red-950/50 text-red-300'
                      : 'border-gray-700 bg-gray-800 text-gray-400'
                  }`}>
                    {formatAverageDays(stage.avgDays)}
                  </span>
                </div>
              ))}
              {stageMetrics.every(stage => stage.count === 0) && (
                <p className="rounded-2xl border border-gray-800 p-4 text-center text-sm text-gray-500">
                  Nenhum lead nesse recorte.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-gray-800 bg-gray-900/70 p-5">
            <h3 className="font-semibold text-white">Mercado dos leads</h3>
            <p className="mb-4 text-xs text-gray-500">Brasil x EUA no recorte selecionado</p>
            <div className="grid gap-4">
              {originMetrics.map(item => (
                <MetricBar
                  key={item.label}
                  label={item.label}
                  value={item.count}
                  max={maxOriginCount}
                  detail={`${item.count} leads`}
                  color={item.label === 'Brasil' ? 'bg-green-500' : 'bg-blue-500'}
                />
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-gray-800 bg-gray-900/70 p-5">
            <h3 className="font-semibold text-white">Origem dos leads</h3>
            <p className="mb-4 text-xs text-gray-500">Volume por ultimo clique/campanha</p>
            <div className="grid gap-4">
              {leadOriginMetrics.slice(0, 6).map(item => (
                <MetricBar
                  key={item.label}
                  label={item.label}
                  value={item.count}
                  max={maxLeadOriginCount}
                  detail={`${item.count} leads`}
                  color="bg-cyan-500"
                />
              ))}
              {leadOriginMetrics.length === 0 && (
                <p className="rounded-2xl border border-gray-800 p-4 text-center text-sm text-gray-500">
                  Nenhuma origem no recorte.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function addDaysToDate(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10)
}

function startOfWeek(dateValue: string) {
  const date = new Date(`${dateValue}T12:00:00`)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  return addDaysToDate(date, diff)
}

function formatAgendaTime(value: string, timeZone: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatAgendaDate(value: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  }).format(value)
}

function sameAgendaDay(iso: string, day: Date, timeZone: string) {
  const dateLabel = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso))
  return dateLabel === toDateInputValue(day)
}

function AgendaView() {
  const [weekDate, setWeekDate] = useState(toDateInputValue(new Date()))
  const [items, setItems] = useState<Agendamento[]>([])
  const [timeZone, setTimeZone] = useState('America/New_York')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const weekStart = startOfWeek(weekDate)
  const weekDays = Array.from({ length: 7 }, (_, index) => addDaysToDate(weekStart, index))
  const from = new Date(weekStart)
  from.setHours(0, 0, 0, 0)
  const to = addDaysToDate(from, 7)
  const upcoming = items.filter(item => item.status === 'agendado' && new Date(item.inicio) >= new Date()).length
  const completed = items.filter(item => item.status === 'realizado').length
  const canceled = items.filter(item => item.status === 'cancelado').length
  const bookingUrl = typeof window !== 'undefined' ? `${window.location.origin}/agendar` : '/agendar'

  useEffect(() => {
    setLoading(true)
    setError('')
    fetch(`/api/agendamentos?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`)
      .then(response => response.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setItems(Array.isArray(data.agendamentos) ? data.agendamentos : [])
        setTimeZone(data.timeZone || 'America/New_York')
      })
      .catch(() => {
        setItems([])
        setError('Nao foi possivel carregar a agenda. Verifique se a tabela agendamentos ja foi criada.')
      })
      .finally(() => setLoading(false))
  }, [weekDate])

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-300">Agenda</p>
          <h2 className="mt-2 text-3xl font-bold text-white">Reunioes agendadas</h2>
          <p className="mt-2 max-w-2xl text-sm text-gray-500">
            Visao interna dos horarios marcados na agenda unica da High Digital.
          </p>
        </div>
        <a
          href={bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-2xl border border-indigo-500/60 bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-indigo-500"
        >
          Abrir link de agendamento
        </a>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardMetric label="Semana" value={items.length} caption="Agendamentos no periodo" />
        <DashboardMetric label="Proximas" value={upcoming} caption="Ainda futuras" color="indigo" />
        <DashboardMetric label="Realizadas" value={completed} caption="Marcadas como feitas" color="green" />
        <DashboardMetric label="Canceladas" value={canceled} caption="Nao ativas" color="red" />
      </div>

      <section className="mb-6 rounded-3xl border border-gray-800 bg-gray-900/70 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Controle da semana</p>
            <p className="mt-1 text-sm text-gray-400">Fuso da agenda: {timeZone}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setWeekDate(toDateInputValue(addDaysToDate(weekStart, -7)))}
              className="rounded-xl border border-gray-700 bg-gray-950 px-3 py-2 text-sm font-semibold text-gray-300 hover:text-white"
            >
              Semana anterior
            </button>
            <input
              type="date"
              value={weekDate}
              onChange={event => setWeekDate(event.target.value)}
              className="rounded-xl border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100 outline-none focus:border-indigo-500 [color-scheme:dark]"
            />
            <button
              type="button"
              onClick={() => setWeekDate(toDateInputValue(addDaysToDate(weekStart, 7)))}
              className="rounded-xl border border-gray-700 bg-gray-950 px-3 py-2 text-sm font-semibold text-gray-300 hover:text-white"
            >
              Proxima semana
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div className="mb-6 rounded-3xl border border-red-800 bg-red-950/40 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-7">
        {weekDays.map(day => {
          const dayItems = items.filter(item => sameAgendaDay(item.inicio, day, timeZone))
          return (
            <section key={day.toISOString()} className="min-h-[220px] rounded-3xl border border-gray-800 bg-gray-900/70 p-4">
              <div className="mb-4">
                <p className="text-sm font-bold capitalize text-white">{formatAgendaDate(day)}</p>
                <p className="mt-1 text-xs text-gray-600">{dayItems.length} agendamento{dayItems.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="grid gap-3">
                {loading ? (
                  <div className="rounded-2xl border border-gray-800 p-4 text-center text-xs text-gray-600">Carregando...</div>
                ) : dayItems.length ? (
                  dayItems.map(item => (
                    <article key={item.id} className="rounded-2xl border border-gray-800 bg-gray-950/70 p-3">
                      <p className="text-xs font-bold text-indigo-300">
                        {formatAgendaTime(item.inicio, timeZone)} - {formatAgendaTime(item.fim, timeZone)}
                      </p>
                      <h3 className="mt-2 text-sm font-semibold text-white">{item.nome}</h3>
                      <p className="mt-1 truncate text-xs text-gray-500" title={item.empresa || undefined}>{item.empresa || item.email}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full border border-gray-700 px-2 py-0.5 text-[10px] font-semibold uppercase text-gray-400">
                          {item.status}
                        </span>
                        {item.google_event_link && (
                          <a
                            href={item.google_event_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-full border border-indigo-800 px-2 py-0.5 text-[10px] font-semibold uppercase text-indigo-300 hover:text-indigo-100"
                          >
                            Google
                          </a>
                        )}
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-gray-800 p-4 text-center text-xs text-gray-600">
                    Sem reunioes
                  </div>
                )}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

export default function Page() {
  const [activeView, setActiveView] = useState<AppView>('leads')
  const [leads, setLeads] = useState<Lead[]>([])
  const [filtered, setFiltered] = useState<Lead[]>([])
  const [selected, setSelected] = useState<Lead | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'completed' | 'partial'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(true)
  const [responsaveis, setResponsaveis] = useState<Responsavel[]>([])
  const [origemFilter, setOrigemFilter] = useState<OriginFilter>('todos')
  const [dashboardMercadoFilter, setDashboardMercadoFilter] = useState<OriginFilter>('todos')
  const [dashboardOrigemLeadFilter, setDashboardOrigemLeadFilter] = useState<string>('')
  const [stageFilter, setStageFilter] = useState<string>('')
  const [stageDropdownOpen, setStageDropdownOpen] = useState(false)
  const stageDropdownRef = useRef<HTMLTableCellElement>(null)
  const [perfilFilter, setPerfilFilter] = useState<string>('')
  const [perfilDropdownOpen, setPerfilDropdownOpen] = useState(false)
  const perfilDropdownRef = useRef<HTMLTableCellElement>(null)
  const [faturamentoFilter, setFaturamentoFilter] = useState<string>('')
  const [faturamentoDropdownOpen, setFaturamentoDropdownOpen] = useState(false)
  const faturamentoDropdownRef = useRef<HTMLTableCellElement>(null)
  const [origemLeadFilter, setOrigemLeadFilter] = useState<string>('')
  const [origemLeadDropdownOpen, setOrigemLeadDropdownOpen] = useState(false)
  const origemLeadDropdownRef = useRef<HTMLTableCellElement>(null)
  const [sortKey, setSortKey] = useState<SortKey | null>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  useEffect(() => {
    fetch('/api/leads')
      .then(r => r.json())
      .then(data => { setLeads(data); setLoading(false) })
      .catch(() => setLoading(false))
    fetch('/api/responsaveis')
      .then(r => r.json())
      .then(setResponsaveis)
      .catch(() => {})
  }, [])

  // Fecha dropdowns ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (stageDropdownRef.current && !stageDropdownRef.current.contains(e.target as Node)) {
        setStageDropdownOpen(false)
      }
    }
    if (stageDropdownOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [stageDropdownOpen])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (perfilDropdownRef.current && !perfilDropdownRef.current.contains(e.target as Node)) {
        setPerfilDropdownOpen(false)
      }
    }
    if (perfilDropdownOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [perfilDropdownOpen])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (faturamentoDropdownRef.current && !faturamentoDropdownRef.current.contains(e.target as Node)) {
        setFaturamentoDropdownOpen(false)
      }
    }
    if (faturamentoDropdownOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [faturamentoDropdownOpen])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (origemLeadDropdownRef.current && !origemLeadDropdownRef.current.contains(e.target as Node)) {
        setOrigemLeadDropdownOpen(false)
      }
    }
    if (origemLeadDropdownOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [origemLeadDropdownOpen])

  useEffect(() => {
    let result = leads
    if (origemFilter !== 'todos') result = result.filter(l => l.origem === origemFilter)
    if (filter !== 'all') result = result.filter(l => l.response_type === filter)
    if (stageFilter) result = result.filter(l => (l.stage || 'nao_iniciado') === stageFilter)
    if (perfilFilter === SEM_PERFIL_FILTER) {
      result = result.filter(l => !perfilCode(l.perfil))
    } else if (perfilFilter) {
      result = result.filter(l => perfilCode(l.perfil) === perfilFilter)
    }
    if (faturamentoFilter) result = result.filter(l => l.faturamento_anual === faturamentoFilter)
    if (origemLeadFilter) result = result.filter(l => l.origem_lead === origemLeadFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(l =>
        [l.first_name, l.last_name, l.empresa, l.email, l.origem_lead].some(v => v?.toLowerCase().includes(q))
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
    if (sortKey) {
      result = [...result].sort((a, b) => compareLeads(a, b, sortKey, sortDirection))
    }
    setFiltered(result)
  }, [leads, search, filter, origemFilter, stageFilter, perfilFilter, faturamentoFilter, origemLeadFilter, dateFrom, dateTo, sortKey, sortDirection])

  const faturamentoOptions = Array.from(
    new Set(leads.map(l => l.faturamento_anual).filter((value): value is string => Boolean(value)))
  ).sort((a, b) => {
    const aValue = firstCurrencyNumber(a)
    const bValue = firstCurrencyNumber(b)
    if (aValue !== null && bValue !== null && aValue !== bValue) return aValue - bValue
    return a.localeCompare(b, 'pt-BR', { numeric: true, sensitivity: 'base' })
  })

  const origemLeadOptions = Array.from(
    new Set(leads.map(l => l.origem_lead).filter((value): value is string => Boolean(value)))
  ).sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true, sensitivity: 'base' }))

  const total = filtered.length
  const completed = filtered.filter(l => l.response_type === 'completed').length
  const partial = filtered.filter(l => l.response_type === 'partial').length
  const perfilCounts = {
    A: filtered.filter(l => perfilCode(l.perfil) === 'A').length,
    B: filtered.filter(l => perfilCode(l.perfil) === 'B').length,
    C: filtered.filter(l => perfilCode(l.perfil) === 'C').length,
    semPerfil: filtered.filter(l => !perfilCode(l.perfil)).length,
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc')
        return
      }
      setSortKey(null)
      setSortDirection('desc')
      return
    }
    setSortKey(key)
    setSortDirection('asc')
  }

  const togglePerfilFilter = (perfil: string) => {
    setPerfilFilter(current => current === perfil ? '' : perfil)
  }

  const handleStageChange = (leadId: number, stage: string) => {
    const previousLead = leads.find(l => l.id === leadId)
    const previous = previousLead?.stage ?? 'nao_iniciado'
    const previousStageDate = previousLead?.stage_date ?? null
    const stageDate = new Date().toISOString()

    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage, stage_date: stageDate } : l))
    fetch(`/api/leads/${leadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage }),
    })
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`) })
      .catch(() => {
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage: previous, stage_date: previousStageDate } : l))
        alert('Erro ao salvar estágio. Tente novamente.')
      })
  }

  const handleResponsavelChange = (leadId: number, responsavel_id: number | null) => {
    const resp = responsaveis.find(r => r.id === responsavel_id) ?? null
    setLeads(prev => prev.map(l => l.id === leadId
      ? { ...l, responsavel_id, responsavel_nome: resp?.nome ?? null }
      : l
    ))
    setSelected(prev => prev?.id === leadId
      ? { ...prev, responsavel_id, responsavel_nome: resp?.nome ?? null }
      : prev
    )
    fetch(`/api/leads/${leadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ responsavel_id }),
    })
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`) })
      .catch(() => alert('Erro ao salvar responsável. Tente novamente.'))
  }

  const handleLeadDataUpdate = async (leadId: number, patch: EditableLeadPatch) => {
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ...patch } : l))
      setSelected(prev => prev && prev.id === leadId ? { ...prev, ...patch } : prev)
      return true
    } catch {
      return false
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <AppSidebar activeView={activeView} onViewChange={setActiveView} totalLeads={leads.length} />
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          {activeView === 'dashboard' ? (
            <DashboardView
              leads={leads}
              origemLeadOptions={origemLeadOptions}
              mercadoFilter={dashboardMercadoFilter}
              onMercadoChange={setDashboardMercadoFilter}
              origemLeadFilter={dashboardOrigemLeadFilter}
              onOrigemLeadChange={setDashboardOrigemLeadFilter}
              loading={loading}
            />
          ) : activeView === 'agenda' ? (
            <AgendaView />
          ) : (
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">LEADS HIGH DIGITAL</h1>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-2">
            <div className="flex gap-3">
              <Stat label="Total" value={total} />
              <Stat label="Completos" value={completed} color="green" />
              <Stat label="Parciais" value={partial} color="yellow" />
            </div>
            <div className="flex flex-wrap justify-start sm:justify-end gap-2">
              <PerfilStat label="A" value={perfilCounts.A} color="green" active={perfilFilter === 'A'} onClick={() => togglePerfilFilter('A')} />
              <PerfilStat label="B" value={perfilCounts.B} color="yellow" active={perfilFilter === 'B'} onClick={() => togglePerfilFilter('B')} />
              <PerfilStat label="C" value={perfilCounts.C} color="red" active={perfilFilter === 'C'} onClick={() => togglePerfilFilter('C')} />
              {perfilCounts.semPerfil > 0 && (
                <PerfilStat label="Sem perfil" value={perfilCounts.semPerfil} color="gray" active={perfilFilter === SEM_PERFIL_FILTER} onClick={() => togglePerfilFilter(SEM_PERFIL_FILTER)} />
              )}
            </div>
          </div>
        </div>

        {/* Toggle Brasil / EUA */}
        <div className="flex gap-2 mb-4">
          {([
            { value: 'todos', label: '🌎 Todos' },
            { value: 'brasil', label: '🇧🇷 Brasil' },
            { value: 'eua',    label: '🇺🇸 EUA' },
          ] as const).map(o => (
            <button
              key={o.value}
              onClick={() => setOrigemFilter(o.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                origemFilter === o.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-900 border border-gray-700 text-gray-400 hover:text-white'
              }`}
            >
              {o.label}
            </button>
          ))}
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
          ) : (
            <table className="w-full table-fixed text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-xs text-gray-500">
                  <th className="w-[92px] text-left px-4 py-3 hidden sm:table-cell">
                    <HeaderControl label="Data" column="date" activeSort={sortKey} direction={sortDirection} onSort={handleSort} />
                  </th>
                  <th ref={origemLeadDropdownRef} className="w-[170px] text-left px-4 py-3 hidden md:table-cell relative">
                    <HeaderControl
                      label="Origem"
                      column="origem_lead"
                      activeSort={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                      onFilterClick={() => setOrigemLeadDropdownOpen(prev => !prev)}
                      filterActive={Boolean(origemLeadFilter)}
                      filterOpen={origemLeadDropdownOpen}
                    />
                    {origemLeadDropdownOpen && (
                      <div className="absolute top-full left-0 z-30 mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-xl py-1 min-w-[260px] max-h-72 overflow-y-auto">
                        <button
                          onClick={() => { setOrigemLeadFilter(''); setOrigemLeadDropdownOpen(false) }}
                          className={`w-full text-left px-3 py-1.5 text-xs normal-case tracking-normal hover:bg-gray-800 transition-colors flex items-center gap-2 ${!origemLeadFilter ? 'text-indigo-400 font-semibold' : 'text-gray-400'}`}
                        >
                          {!origemLeadFilter && <span className="text-indigo-400">✓</span>}
                          Todas as origens
                        </button>
                        <div className="border-t border-gray-800 my-1" />
                        {origemLeadOptions.map(option => (
                          <button
                            key={option}
                            onClick={() => { setOrigemLeadFilter(option); setOrigemLeadDropdownOpen(false) }}
                            className={`w-full text-left px-3 py-1.5 text-xs normal-case tracking-normal hover:bg-gray-800 transition-colors flex items-center gap-2 ${origemLeadFilter === option ? 'text-indigo-400 font-semibold' : 'text-gray-400'}`}
                          >
                            {origemLeadFilter === option && <span>✓</span>}
                            {option}
                          </button>
                        ))}
                      </div>
                    )}
                  </th>
                  <th className="text-left px-4 py-3">
                    <HeaderControl label="Nome" column="name" activeSort={sortKey} direction={sortDirection} onSort={handleSort} />
                  </th>
                  <th ref={perfilDropdownRef} className="w-[76px] text-left px-4 py-3 hidden md:table-cell relative">
                    <HeaderControl
                      label="Perfil"
                      column="perfil"
                      activeSort={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                      onFilterClick={() => setPerfilDropdownOpen(prev => !prev)}
                      filterActive={Boolean(perfilFilter)}
                      filterOpen={perfilDropdownOpen}
                    />
                    {perfilDropdownOpen && (
                      <div className="absolute top-full left-0 z-30 mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-xl py-1 min-w-[220px]">
                        <button
                          onClick={() => { setPerfilFilter(''); setPerfilDropdownOpen(false) }}
                          className={`w-full text-left px-3 py-1.5 text-xs normal-case tracking-normal hover:bg-gray-800 transition-colors flex items-center gap-2 ${!perfilFilter ? 'text-indigo-400 font-semibold' : 'text-gray-400'}`}
                        >
                          {!perfilFilter && <span className="text-indigo-400">✓</span>}
                          Todos os perfis
                        </button>
                        <div className="border-t border-gray-800 my-1" />
                        <button
                          onClick={() => { setPerfilFilter(SEM_PERFIL_FILTER); setPerfilDropdownOpen(false) }}
                          className={`w-full text-left px-3 py-1.5 text-xs normal-case tracking-normal hover:bg-gray-800 transition-colors flex items-center gap-2 ${perfilFilter === SEM_PERFIL_FILTER ? 'text-indigo-400 font-semibold' : 'text-gray-400'}`}
                        >
                          {perfilFilter === SEM_PERFIL_FILTER && <span>✓</span>}
                          Sem perfil
                        </button>
                        <div className="border-t border-gray-800 my-1" />
                        {[
                          { value: 'A',  label: 'A',  cls: 'text-green-300'  },
                          { value: 'B',  label: 'B',  cls: 'text-amber-300'  },
                          { value: 'C',  label: 'C',  cls: 'text-red-400'    },
                        ].map(p => (
                          <button
                            key={p.value}
                            onClick={() => { setPerfilFilter(p.value); setPerfilDropdownOpen(false) }}
                            className={`w-full text-left px-3 py-1.5 text-xs normal-case tracking-normal hover:bg-gray-800 transition-colors flex items-center gap-2 ${p.cls} ${perfilFilter === p.value ? 'font-semibold' : 'opacity-80'}`}
                          >
                            {perfilFilter === p.value && <span>✓</span>}
                            {p.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </th>
                  <th ref={faturamentoDropdownRef} className="w-[160px] text-left px-4 py-3 hidden lg:table-cell relative">
                    <HeaderControl
                      label="Faturamento"
                      column="faturamento"
                      activeSort={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                      onFilterClick={() => setFaturamentoDropdownOpen(prev => !prev)}
                      filterActive={Boolean(faturamentoFilter)}
                      filterOpen={faturamentoDropdownOpen}
                    />
                    {faturamentoDropdownOpen && (
                      <div className="absolute top-full left-0 z-30 mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-xl py-1 min-w-[260px] max-h-72 overflow-y-auto">
                        <button
                          onClick={() => { setFaturamentoFilter(''); setFaturamentoDropdownOpen(false) }}
                          className={`w-full text-left px-3 py-1.5 text-xs normal-case tracking-normal hover:bg-gray-800 transition-colors flex items-center gap-2 ${!faturamentoFilter ? 'text-indigo-400 font-semibold' : 'text-gray-400'}`}
                        >
                          {!faturamentoFilter && <span className="text-indigo-400">✓</span>}
                          Todos os faturamentos
                        </button>
                        <div className="border-t border-gray-800 my-1" />
                        {faturamentoOptions.map(option => (
                          <button
                            key={option}
                            onClick={() => { setFaturamentoFilter(option); setFaturamentoDropdownOpen(false) }}
                            className={`w-full text-left px-3 py-1.5 text-xs normal-case tracking-normal hover:bg-gray-800 transition-colors flex items-center gap-2 ${faturamentoFilter === option ? 'text-indigo-400 font-semibold' : 'text-gray-400'}`}
                          >
                            {faturamentoFilter === option && <span>✓</span>}
                            {option}
                          </button>
                        ))}
                      </div>
                    )}
                  </th>
                  <th ref={stageDropdownRef} className="w-[230px] text-left px-4 py-3 hidden md:table-cell relative">
                    <HeaderControl
                      label="Estágio"
                      column="stage"
                      activeSort={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                      onFilterClick={() => setStageDropdownOpen(prev => !prev)}
                      filterActive={Boolean(stageFilter)}
                      filterOpen={stageDropdownOpen}
                    />
                    {stageDropdownOpen && (
                      <div className="absolute top-full left-0 z-30 mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-xl py-1 min-w-[190px]">
                        <button
                          onClick={() => { setStageFilter(''); setStageDropdownOpen(false) }}
                          className={`w-full text-left px-3 py-1.5 text-xs normal-case tracking-normal hover:bg-gray-800 transition-colors flex items-center gap-2 ${!stageFilter ? 'text-indigo-400 font-semibold' : 'text-gray-400'}`}
                        >
                          {!stageFilter && <span className="text-indigo-400">✓</span>}
                          Todos os estágios
                        </button>
                        <div className="border-t border-gray-800 my-1" />
                        {STAGES.map(st => (
                          <button
                            key={st.value}
                            onClick={() => { setStageFilter(st.value); setStageDropdownOpen(false) }}
                            className={`w-full text-left px-3 py-1.5 text-xs normal-case tracking-normal hover:bg-gray-800 transition-colors flex items-center gap-2 ${st.color} ${stageFilter === st.value ? 'font-semibold' : 'opacity-80'}`}
                          >
                            {stageFilter === st.value && <span>✓</span>}
                            {st.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </th>
                  <th className="w-[130px] text-left px-4 py-3 hidden md:table-cell">
                    <HeaderControl label="Diagnóstico" column="diagnostico" activeSort={sortKey} direction={sortDirection} onSort={handleSort} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-20 text-center text-gray-500">Nenhum lead encontrado.</td>
                  </tr>
                )}
                {filtered.map((lead, i) => {
                  const name = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || '—'
                  return (
                    <tr
                      key={lead.id}
                      onClick={() => setSelected(lead)}
                      className={`border-b border-gray-800/60 cursor-pointer hover:bg-gray-800/50 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-900/50'}`}
                    >
                      <td className="px-4 py-3 text-gray-400 hidden sm:table-cell whitespace-nowrap">{formatDate(lead.submit_date || lead.stage_date)}</td>
                      <td className="px-4 py-3 text-gray-400 hidden md:table-cell">
                        <span className="block max-w-[170px] truncate" title={lead.origem_lead || undefined}>
                          {lead.origem_lead || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-2">
                          <ResponsavelDot nome={lead.responsavel_nome} />
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="max-w-[220px] truncate text-gray-100 font-medium" title={name}>{name}</p>
                              {formatPhone(lead.phone) && (
                            <a
                              href={`https://wa.me/${formatPhone(lead.phone)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              title={`WhatsApp: ${lead.phone}`}
                              className="text-green-500 hover:text-green-400 transition-colors shrink-0"
                            >
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.533 5.857L.057 23.857a.5.5 0 0 0 .612.612l6.004-1.476A11.933 11.933 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.7-.528-5.228-1.449l-.374-.222-3.875.952.97-3.773-.244-.389A9.956 9.956 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                            </a>
                          )}
                              {lead.response_type === 'completed'
                                ? <span className="rounded-full border border-green-800 bg-green-900/40 px-1.5 py-0.5 text-[10px] font-semibold text-green-400">Completo</span>
                                : <span className="rounded-full border border-yellow-800 bg-yellow-900/40 px-1.5 py-0.5 text-[10px] font-semibold text-yellow-400">Parcial</span>
                              }
                            </div>
                            {lead.empresa && <p className="text-gray-500 text-xs mt-0.5">{lead.empresa}</p>}
                            {lead.tipo_negocio && (
                              <p className="mt-0.5 max-w-[280px] truncate text-[11px] text-gray-600" title={lead.tipo_negocio}>
                                {lead.tipo_negocio}
                              </p>
                            )}
                            <CopyEmail email={lead.email} />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <PerfilBadge perfil={lead.perfil} />
                      </td>
                      <td className="px-4 py-3 text-gray-400 hidden lg:table-cell">{lead.faturamento_anual || '—'}</td>
                      <td className="px-4 py-3 hidden md:table-cell" onClick={e => e.stopPropagation()}>
                        {(() => {
                          const s = STAGES.find(s => s.value === (lead.stage || 'nao_iniciado')) ?? STAGES[0]
                          return (
                            <div className="flex items-center gap-2">
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
                              <StageSlaBadge lead={lead} />
                            </div>
                          )
                        })()}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {lead.diagnostico_url
                          ? <a href={lead.diagnostico_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-indigo-900/50 text-indigo-300 border border-indigo-800 hover:bg-indigo-800/50 hover:text-white transition-colors">Abrir →</a>
                          : <span className="px-2 py-0.5 rounded-full text-xs bg-gray-800/50 text-gray-500 border border-gray-800">Não gerado</span>
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
          )}
        </main>
      </div>

      {selected && (
        <Modal
          lead={selected}
          onClose={() => setSelected(null)}
          onDiagnosticoFound={(url) => setLeads(prev => prev.map(l => l.id === selected.id ? { ...l, diagnostico_url: url } : l))}
          responsaveis={responsaveis}
          onResponsavelChange={handleResponsavelChange}
          onLeadUpdate={handleLeadDataUpdate}
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

function PerfilStat({ label, value, color, active, onClick }: {
  label: string
  value: number
  color: 'green' | 'yellow' | 'red' | 'gray'
  active?: boolean
  onClick?: () => void
}) {
  const styles = {
    green: 'border-green-800/70 bg-green-950/30 text-green-300',
    yellow: 'border-yellow-800/70 bg-yellow-950/30 text-yellow-300',
    red: 'border-red-800/70 bg-red-950/30 text-red-300',
    gray: 'border-gray-700 bg-gray-800/70 text-gray-400',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title={active ? `Remover filtro ${label}` : `Filtrar perfil ${label}`}
      className={`min-w-[58px] rounded-lg border px-3 py-1.5 text-center transition-all hover:-translate-y-0.5 hover:border-indigo-500/70 ${styles[color]} ${
        active ? 'ring-2 ring-indigo-400/70 ring-offset-1 ring-offset-gray-950' : ''
      }`}
    >
      <p className="text-base font-bold leading-none">{value}</p>
      <p className="mt-1 text-[10px] font-semibold leading-none whitespace-nowrap">{label}</p>
    </button>
  )
}
