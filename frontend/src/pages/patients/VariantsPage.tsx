import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'

/* ═══════════════════════════════════════════════════════════
   VARIANTES GENÉTICAS — versión inicial
   Ruta: /patients/:id/variants
   ═══════════════════════════════════════════════════════════ */

const CLASIFICACIONES = [
  { v: 'PATHOGENIC', l: 'Patogénica', clase: 5, badge: 'badge-red' },
  { v: 'LIKELY_PATHOGENIC', l: 'Probablemente patogénica', clase: 4, badge: 'badge-red' },
  { v: 'VUS', l: 'Significado incierto (VUS)', clase: 3, badge: 'badge-yellow' },
  { v: 'LIKELY_BENIGN', l: 'Probablemente benigna', clase: 2, badge: 'badge-green' },
  { v: 'BENIGN', l: 'Benigna', clase: 1, badge: 'badge-green' },
]
const CLAS = (v: string) => CLASIFICACIONES.find(c => c.v === v)

const CIGOSIDAD = [
  { v: '', l: '—' },
  { v: 'HETEROZYGOUS', l: 'Heterocigota' },
  { v: 'HOMOZYGOUS', l: 'Homocigota' },
  { v: 'HEMIZYGOUS', l: 'Hemicigota' },
  { v: 'COMPOUND_HETEROZYGOUS', l: 'Heterocigota compuesta' },
]
const CIG = (v?: string) => CIGOSIDAD.find(c => c.v === v)?.l || '—'

const HERENCIA = [
  '', 'Autosómica dominante', 'Autosómica recesiva',
  'Ligada al X dominante', 'Ligada al X recesiva', 'Mitocondrial', 'Desconocida',
]

const vacio = () => ({
  gene: '', transcriptId: '', hgvsCoding: '', hgvsProtein: '',
  classification: 'VUS', zygosity: '', inheritancePattern: '',
  clinvarId: '', notes: '', reclassificationReason: '',
})

function Campo({ label, children, ancho }: any) {
  return <div style={{ gridColumn: ancho ? `span ${ancho}` : undefined }}><label>{label}</label>{children}</div>
}

export function VariantsPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const [form, setForm] = useState<any>(vacio())
  const [editando, setEditando] = useState<string | null>(null)
  const [abierto, setAbierto] = useState(false)
  const [error, setError] = useState('')

  const { data: patient } = useQuery({
    queryKey: ['patient', id],
    queryFn: () => api.get(`/patients/${id}`).then(r => r.data),
  })
  const { data: variants = [], isLoading } = useQuery({
    queryKey: ['variants', id],
    queryFn: () => api.get(`/variants/patient/${id}`).then(r => r.data),
  })

  const cerrar = () => { setAbierto(false); setEditando(null); setForm(vacio()); setError('') }

  const guardar = useMutation({
    mutationFn: () => editando
      ? api.put(`/variants/${editando}`, form).then(r => r.data)
      : api.post(`/variants/patient/${id}`, form).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['variants', id] }); cerrar() },
    onError: (e: any) => setError(e.response?.data?.message || 'No se pudo guardar la variante'),
  })

  const eliminar = useMutation({
    mutationFn: (vid: string) => api.delete(`/variants/${vid}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['variants', id] }),
  })

  const editar = (v: any) => {
    setForm({
      gene: v.gene || '', transcriptId: v.transcriptId || '',
      hgvsCoding: v.hgvsCoding || '', hgvsProtein: v.hgvsProtein || '',
      classification: v.classification, zygosity: v.zygosity || '',
      inheritancePattern: v.inheritancePattern || '', clinvarId: v.clinvarId || '',
      notes: v.notes || '', reclassificationReason: '',
    })
    setEditando(v.id); setAbierto(true); setError('')
  }

  const vus = variants.filter((v: any) => v.classification === 'VUS')
  const clasificacionOriginal = editando
    ? variants.find((v: any) => v.id === editando)?.classification
    : null
  const cambiaClasificacion = editando && clasificacionOriginal && clasificacionOriginal !== form.classification

  return (
    <div style={{ padding: '28px 30px' }}>
      <Link to={`/patients/${id}`} style={{ color: 'var(--gray-400)', fontSize: 13, textDecoration: 'none' }}>
        ← Volver al paciente
      </Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', margin: '10px 0 20px', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ marginBottom: 3 }}>Variantes genéticas</h1>
          <p style={{ color: 'var(--gray-500)', fontSize: 13 }}>
            {patient?.firstName} {patient?.lastName} · {variants.length} variante(s) registrada(s)
            {vus.length > 0 && ` · ${vus.length} VUS`}
          </p>
        </div>
        {!abierto && (
          <button className="btn btn-primary" onClick={() => { setForm(vacio()); setAbierto(true) }}>
            + Registrar variante
          </button>
        )}
      </div>

      {/* Formulario */}
      {abierto && (
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="card-header">
            <h3>{editando ? 'Editar variante' : 'Nueva variante'}</h3>
          </div>

          {error && <div className="alert alert-danger" style={{ marginBottom: 14 }}>{error}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <Campo label="Gen *">
              <input value={form.gene} onChange={e => setForm({ ...form, gene: e.target.value.toUpperCase() })}
                placeholder="MYBPC3" />
            </Campo>
            <Campo label="Transcrito de referencia">
              <input value={form.transcriptId} onChange={e => setForm({ ...form, transcriptId: e.target.value })}
                placeholder="NM_000256.3" />
            </Campo>
            <Campo label="Cigosidad">
              <select value={form.zygosity} onChange={e => setForm({ ...form, zygosity: e.target.value })}>
                {CIGOSIDAD.map(c => <option key={c.v} value={c.v}>{c.l}</option>)}
              </select>
            </Campo>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <Campo label="HGVS — nivel ADNc">
              <input value={form.hgvsCoding} onChange={e => setForm({ ...form, hgvsCoding: e.target.value })}
                placeholder="c.2905+1G>A" style={{ fontFamily: 'monospace' }} />
            </Campo>
            <Campo label="HGVS — nivel proteína">
              <input value={form.hgvsProtein} onChange={e => setForm({ ...form, hgvsProtein: e.target.value })}
                placeholder="p.Gly970Arg" style={{ fontFamily: 'monospace' }} />
            </Campo>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <Campo label="Clasificación ACMG/AMP *">
              <select value={form.classification} onChange={e => setForm({ ...form, classification: e.target.value })}>
                {CLASIFICACIONES.map(c => <option key={c.v} value={c.v}>Clase {c.clase} — {c.l}</option>)}
              </select>
            </Campo>
            <Campo label="Patrón de herencia">
              <select value={form.inheritancePattern} onChange={e => setForm({ ...form, inheritancePattern: e.target.value })}>
                {HERENCIA.map(h => <option key={h} value={h}>{h || '—'}</option>)}
              </select>
            </Campo>
            <Campo label="ID de ClinVar">
              <input value={form.clinvarId} onChange={e => setForm({ ...form, clinvarId: e.target.value })}
                placeholder="VCV000012345" />
            </Campo>
          </div>

          {cambiaClasificacion && (
            <div style={{ marginBottom: 12 }}>
              <div className="alert alert-warning" style={{ marginBottom: 10 }}>
                Está cambiando la clasificación de <b>{CLAS(clasificacionOriginal!)?.l}</b> a <b>{CLAS(form.classification)?.l}</b>.
                Este cambio queda registrado en el historial de la variante.
              </div>
              <Campo label="Motivo de la reclasificación">
                <input value={form.reclassificationReason}
                  onChange={e => setForm({ ...form, reclassificationReason: e.target.value })}
                  placeholder="Ej: nueva evidencia funcional publicada; segregación familiar" />
              </Campo>
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <Campo label="Notas">
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="Laboratorio, fecha del informe, criterios aplicados, observaciones…" rows={3} />
            </Campo>
          </div>

          {form.classification === 'VUS' && (
            <div className="alert alert-info" style={{ marginBottom: 14, fontSize: 12.5 }}>
              Al guardarse como VUS, esta variante quedará marcada para <b>seguimiento automático</b>.
              La revisión periódica en bases de datos externas se activará cuando ese módulo esté disponible.
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" disabled={!form.gene || guardar.isPending}
              onClick={() => { setError(''); guardar.mutate() }}>
              {guardar.isPending ? <><span className="spinner" /> Guardando…</> : editando ? 'Guardar cambios' : 'Registrar variante'}
            </button>
            <button className="btn btn-secondary" onClick={cerrar}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Listado */}
      {isLoading ? (
        <div style={{ padding: 40, textAlign: 'center' }}><span className="spinner" /></div>
      ) : variants.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 46, color: 'var(--gray-400)' }}>
          <div style={{ fontSize: 30, marginBottom: 12 }}>⬟</div>
          <p style={{ fontSize: 14 }}>No hay variantes registradas para este paciente.</p>
        </div>
      ) : (
        variants.map((v: any) => {
          const c = CLAS(v.classification)
          return (
            <div key={v.id} className="card" style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 260 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap', marginBottom: 6 }}>
                    <span style={{ fontSize: 16, fontWeight: 600, fontStyle: 'italic' }}>{v.gene}</span>
                    <span className={`badge ${c?.badge}`}>Clase {c?.clase} — {c?.l}</span>
                    {v.isVUS && v.trackingActive && <span className="badge badge-blue">Seguimiento activo</span>}
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--gray-700)', marginBottom: 4 }}>
                    {[v.transcriptId, v.hgvsCoding].filter(Boolean).join(':')}
                    {v.hgvsProtein && <span style={{ color: 'var(--gray-500)' }}> · {v.hgvsProtein}</span>}
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--gray-500)' }}>
                    {CIG(v.zygosity)}
                    {v.inheritancePattern && ` · ${v.inheritancePattern}`}
                    {v.clinvarId && ` · ClinVar ${v.clinvarId}`}
                  </div>
                  {v.notes && (
                    <p style={{ fontSize: 12.5, color: 'var(--gray-600)', marginTop: 8, lineHeight: 1.6 }}>{v.notes}</p>
                  )}
                  {v.reclassifications?.length > 0 && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--gray-100)' }}>
                      <div style={{ fontSize: 11, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 5 }}>
                        Historial de reclasificación
                      </div>
                      {v.reclassifications.map((r: any) => (
                        <div key={r.id} style={{ fontSize: 12, color: 'var(--gray-600)', marginBottom: 3 }}>
                          {new Date(r.reclassifiedAt).toLocaleDateString('es-CO')} ·{' '}
                          {CLAS(r.previousClass)?.l} → <b>{CLAS(r.newClass)?.l}</b>
                          {r.evidenceSummary && ` · ${r.evidenceSummary}`}
                          <span style={{ color: 'var(--gray-400)' }}> ({r.source})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => editar(v)}>Editar</button>
                  <button className="btn btn-danger btn-sm"
                    onClick={() => { if (confirm(`¿Eliminar la variante de ${v.gene}?`)) eliminar.mutate(v.id) }}>
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
