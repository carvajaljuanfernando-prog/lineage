import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type { Patient, SurveyToken } from '../../types'

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  PENDING:     { label: 'Generada', cls: 'badge-gray' },
  SENT:        { label: 'Enviada', cls: 'badge-blue' },
  OPENED:      { label: 'Abierta', cls: 'badge-yellow' },
  IN_PROGRESS: { label: 'En progreso', cls: 'badge-yellow' },
  COMPLETED:   { label: 'Completada ✓', cls: 'badge-green' },
  REVIEWED:    { label: 'Revisada ✓', cls: 'badge-green' },
  EXPIRED:     { label: 'Expirada', cls: 'badge-red' },
}

export function PatientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const [copied, setCopied] = useState(false)
  const [surveyLink, setSurveyLink] = useState('')

  const { data: patient, isLoading } = useQuery<Patient>({
    queryKey: ['patient', id],
    queryFn: () => api.get(`/patients/${id}`).then(r => r.data),
  })

  const { data: templates } = useQuery({
    queryKey: ['templates'],
    queryFn: () => api.get('/surveys/templates').then(r => r.data),
  })

  const generateToken = useMutation({
    mutationFn: (templateId: string) =>
      api.post('/surveys/generate-token', { patientId: id, templateId }).then(r => r.data),
    onSuccess: (data) => {
      setSurveyLink(data.surveyUrl)
      qc.invalidateQueries({ queryKey: ['patient', id] })
    },
  })

  const copyLink = () => {
    navigator.clipboard.writeText(surveyLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (isLoading) return (
    <div style={{ padding: 40, textAlign: 'center' }}><span className="spinner" /></div>
  )
  if (!patient) return (
    <div style={{ padding: 40 }}><div className="alert alert-danger">Paciente no encontrado</div></div>
  )

  const fullName = `${patient.firstName} ${patient.lastName}`
  const age = patient.dateOfBirth
    ? Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null

  return (
    <div style={{ padding: '28px 30px' }}>
      {/* Breadcrumb */}
      <Link to="/patients" style={{ color: 'var(--gray-400)', fontSize: 13, textDecoration: 'none' }}>
        ← Pacientes
      </Link>

      {/* Patient header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', margin: '12px 0 24px' }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'var(--lineage-100)', color: 'var(--lineage-700)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 600,
          }}>
            {patient.firstName[0]}{patient.lastName[0]}
          </div>
          <div>
            <h1 style={{ marginBottom: 3, fontSize: 22 }}>{fullName}</h1>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {age && <span className="badge badge-gray">{age} años</span>}
              <span className="badge badge-gray">{patient.sex === 'MALE' ? 'Hombre' : patient.sex === 'FEMALE' ? 'Mujer' : patient.sex}</span>
              {patient.city && <span style={{ color: 'var(--gray-400)', fontSize: 12 }}>📍 {patient.city}</span>}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
        {/* LEFT COLUMN */}
        <div>
          {/* Basic data */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header"><h3>Datos del paciente</h3></div>
            <div className="grid-2">
              {[
                ['Nombre completo', fullName],
                ['Documento', `${patient.documentType || ''} ${patient.documentNum || '—'}`],
                ['Fecha de nacimiento', patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString('es-CO') : '—'],
                ['Correo', patient.email || '—'],
                ['Teléfono', patient.phone || '—'],
                ['Ciudad', patient.city || '—'],
              ].map(([label, value]) => (
                <div key={label}>
                  <div style={{ fontSize: 11, color: 'var(--gray-400)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '.4px' }}>{label}</div>
                  <div style={{ fontSize: 13.5, color: 'var(--gray-800)' }}>{value}</div>
                </div>
              ))}
            </div>
            {patient.referralReason && (
              <>
                <hr className="divider" />
                <div>
                  <div style={{ fontSize: 11, color: 'var(--gray-400)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.4px' }}>Motivo de consulta</div>
                  <p style={{ fontSize: 13.5, color: 'var(--gray-700)', lineHeight: 1.6 }}>{patient.referralReason}</p>
                </div>
              </>
            )}
          </div>

          {/* Survey history */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Historial de encuestas</h3>
            </div>
            {(!patient.surveyTokens || patient.surveyTokens.length === 0) ? (
              <p style={{ color: 'var(--gray-400)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                No se han generado encuestas aún.
              </p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Plantilla</th>
                      <th>Estado</th>
                      <th>Creada</th>
                      <th>Completada</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {patient.surveyTokens.map((t: SurveyToken) => {
                      const st = STATUS_LABELS[t.status] || { label: t.status, cls: 'badge-gray' }
                      return (
                        <tr key={t.id}>
                          <td style={{ fontSize: 13 }}>{t.template?.name || '—'}</td>
                          <td><span className={`badge ${st.cls}`}>{st.label}</span></td>
                          <td style={{ color: 'var(--gray-400)', fontSize: 12 }}>{new Date(t.createdAt).toLocaleDateString('es-CO')}</td>
                          <td style={{ color: 'var(--gray-400)', fontSize: 12 }}>{t.completedAt ? new Date(t.completedAt).toLocaleDateString('es-CO') : '—'}</td>
                          <td>
                            {t.status === 'COMPLETED' && (
                              <Link to={`/surveys/review/${t.id}`} className="btn btn-ghost btn-sm">Revisar</Link>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div>
          {/* Generate survey */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header"><h3>Generar encuesta</h3></div>
            <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 14, lineHeight: 1.6 }}>
              Seleccione la plantilla y genere un enlace de un solo uso para que el paciente complete su historia familiar.
            </p>
            <div style={{ marginBottom: 12 }}>
              <label>Plantilla de encuesta</label>
              <select id="template-select" defaultValue="">
                <option value="" disabled>Seleccionar plantilla…</option>
                {(templates || []).map((t: any) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
              disabled={generateToken.isPending}
              onClick={() => {
                const sel = document.getElementById('template-select') as HTMLSelectElement
                if (sel.value) generateToken.mutate(sel.value)
              }}
            >
              {generateToken.isPending ? <><span className="spinner" /> Generando…</> : '◉ Generar enlace'}
            </button>

            {surveyLink && (
              <div style={{ marginTop: 14, padding: '12px', background: 'var(--gray-50)', borderRadius: 8, border: '1px solid var(--gray-200)' }}>
                <p style={{ fontSize: 11, color: 'var(--gray-500)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.4px' }}>Enlace generado</p>
                <p style={{ fontSize: 12, color: 'var(--lineage-600)', wordBreak: 'break-all', marginBottom: 10 }}>{surveyLink}</p>
                <button className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={copyLink}>
                  {copied ? '✓ Copiado' : '⎘ Copiar enlace'}
                </button>
                <p style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 8, lineHeight: 1.5 }}>
                  Comparta este enlace con el paciente por correo o WhatsApp. Expira en 30 días.
                </p>
              </div>
            )}
          </div>

          {/* Pedigree status */}
          <div className="card">
            <div className="card-header"><h3>Pedigrí familiar</h3></div>
            {patient.familyTree ? (
              <div>
                <div className="alert alert-success" style={{ marginBottom: 12 }}>
                  Pedigrí generado con {patient.familyTree.members?.length || 0} miembros familiares.
                </div>
                <Link to={`/patients/${id}/pedigree`} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
                  Ver pedigrí completo
                </Link>
              </div>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--gray-400)', textAlign: 'center', padding: '12px 0' }}>
                El pedigrí se generará automáticamente cuando el paciente complete la encuesta.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
