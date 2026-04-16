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
  submit_date: string | null
  stage_date: string | null
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

function Modal({ lead, onClose }: { lead: Lead; onClose: () => void }) {
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
        {lead.diagnostico_url && (
          <div className="mt-4">
            <a
              href={lead.diagnostico_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors"
            >
              Ver diagnóstico →
            </a>
          </div>
        )}
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

      {selected && <Modal lead={selected} onClose={() => setSelected(null)} />}
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
