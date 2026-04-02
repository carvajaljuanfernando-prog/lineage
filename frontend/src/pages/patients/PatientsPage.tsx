import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import type { Patient } from '../../types'

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  PENDING:     { label: 'Pendiente', cls: 'badge-gray' },
  SENT:        { label: 'Enviada', cls: 'badge-blue' },
  IN_PROGRESS: { label: 'En progreso', cls: 'badge-yellow' },
  COMPLETED:   { label: 'Completada', cls: 'badge-green' },
  REVIEWED:    { label: 'Revisada', cls: 'badge-green' },
  EXPIRED:     { label: 'Expirada', cls: 'badge-red' },
}

const SEX_LABEL: Record<string, string> = {
  MALE: 'Hombre', FEMALE: 'Mujer', OTHER: 'Otro', UNKNOWN: '—',
}

export function PatientsPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['patients', page, search],
    queryFn: () => api.get(`/patients?page=${page}&limit=20${search ? `&search=${search}` : ''}`).then(r => r.data),
    placeholderData: (prev) => prev,
  })

  const patients: Patient[] = data?.patients || []

  return (
    <div style={{ padding: '28px 30px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ marginBottom: 3 }}>Pacientes</h1>
          <p style={{ color: 'var(--gray-500)', fontSize: 13 }}>
            {data?.total ?? 0} pacientes registrados
          </p>
        </div>
        <Link to="/patients/new" className="btn btn-primary">
          + Nuevo paciente
        </Link>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 18 }}>
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Buscar por nombre o documento…"
          style={{ maxWidth: 360 }}
        />
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <span className="spinner" />
          </div>
        ) : patients.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--gray-400)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>◈</div>
            <p style={{ fontSize: 14 }}>No hay pacientes registrados aún.</p>
            <Link to="/patients/new" className="btn btn-primary" style={{ marginTop: 16, display: 'inline-flex' }}>
              Registrar primer paciente
            </Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>Sexo</th>
                  <th>Documento</th>
                  <th>Ciudad</th>
                  <th>Encuesta</th>
                  <th>Registrado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => {
                  const lastToken = p.surveyTokens?.[0]
                  const statusInfo = lastToken ? STATUS_LABELS[lastToken.status] : null
                  return (
                    <tr key={p.id}>
                      <td>
                        <div style={{ fontWeight: 500, color: 'var(--gray-900)' }}>
                          {p.firstName} {p.lastName}
                        </div>
                        {p.email && (
                          <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 2 }}>{p.email}</div>
                        )}
                      </td>
                      <td style={{ color: 'var(--gray-600)' }}>{SEX_LABEL[p.sex]}</td>
                      <td style={{ color: 'var(--gray-600)', fontSize: 13 }}>
                        {p.documentType && <span style={{ color: 'var(--gray-400)', fontSize: 11 }}>{p.documentType} </span>}
                        {p.documentNum || '—'}
                      </td>
                      <td style={{ color: 'var(--gray-600)' }}>{p.city || '—'}</td>
                      <td>
                        {statusInfo
                          ? <span className={`badge ${statusInfo.cls}`}>{statusInfo.label}</span>
                          : <span className="badge badge-gray">Sin encuesta</span>
                        }
                      </td>
                      <td style={{ color: 'var(--gray-400)', fontSize: 12 }}>
                        {new Date(p.createdAt).toLocaleDateString('es-CO')}
                      </td>
                      <td>
                        <Link to={`/patients/${p.id}`} className="btn btn-ghost btn-sm">
                          Ver →
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Anterior</button>
          <span style={{ padding: '5px 12px', fontSize: 13, color: 'var(--gray-600)' }}>Página {page} de {data.pages}</span>
          <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.min(data.pages, p + 1))} disabled={page === data.pages}>Siguiente →</button>
        </div>
      )}
    </div>
  )
}
