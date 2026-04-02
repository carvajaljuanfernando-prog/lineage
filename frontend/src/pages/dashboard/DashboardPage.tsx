import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../lib/auth.store'
import { api } from '../../lib/api'

export function DashboardPage() {
  const { user } = useAuthStore()

  const { data: patients } = useQuery({
    queryKey: ['patients-count'],
    queryFn: () => api.get('/patients?limit=1').then(r => r.data),
  })

  const { data: tenant } = useQuery({
    queryKey: ['my-tenant'],
    queryFn: () => api.get('/tenants/me').then(r => r.data),
  })

  const stats = [
    { label: 'Pacientes registrados', value: patients?.total ?? '—', icon: '◈', color: 'var(--lineage-600)' },
    { label: 'Encuestas completadas', value: '—', icon: '◉', color: 'var(--success)' },
    { label: 'Variantes VUS activas', value: '—', icon: '⬟', color: 'var(--warning)' },
    { label: 'Usuarios del equipo', value: tenant?._count?.users ?? '—', icon: '◎', color: 'var(--lineage-500)' },
  ]

  return (
    <div style={{ padding: '28px 30px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ marginBottom: 4 }}>
          Bienvenido, {user?.firstName}
        </h1>
        <p style={{ color: 'var(--gray-500)', fontSize: 14 }}>
          {tenant?.name || 'Cargando información del centro…'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: 28 }}>
        {stats.map(stat => (
          <div key={stat.label} className="card" style={{ textAlign: 'center', padding: '18px 16px' }}>
            <div style={{ fontSize: 22, color: stat.color, marginBottom: 8 }}>{stat.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--gray-900)', marginBottom: 4 }}>{stat.value}</div>
            <div style={{ fontSize: 11.5, color: 'var(--gray-500)', letterSpacing: '.3px' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <h2 style={{ fontSize: 15 }}>Acciones rápidas</h2>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <a href="/patients/new" className="btn btn-primary">
            ◈ Registrar nuevo paciente
          </a>
          <button className="btn btn-secondary">
            ◉ Ver encuestas pendientes
          </button>
          <button className="btn btn-secondary">
            ⬟ Revisar variantes VUS
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="alert alert-info">
        <strong>🧬 Lineage v0.1</strong> — Plataforma en etapa inicial.
        Módulo activo: Registro de pacientes y encuesta de historia familiar (cardiomiopatías).
        Los módulos de variantes genéticas y seguimiento VUS están en desarrollo.
      </div>
    </div>
  )
}
