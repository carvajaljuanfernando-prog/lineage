import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../../lib/auth.store'

export function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  // Solo aparece si el mismo correo está en varios centros
  const [tenantOptions, setTenantOptions] = useState<{ slug: string; name: string }[]>([])
  const [tenantSlug, setTenantSlug] = useState('')
  const { login, isLoading } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await login(form.email, form.password, tenantSlug || undefined)
      navigate('/dashboard')
    } catch (err: any) {
      const data = err.response?.data
      if (data?.error === 'MULTIPLE_TENANTS' && Array.isArray(data.tenants)) {
        setTenantOptions(data.tenants)
        setError('Su correo está registrado en varios centros. Seleccione con cuál desea ingresar.')
        return
      }
      setError(data?.message || 'Correo o contraseña incorrectos')
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, var(--lineage-900) 0%, var(--lineage-800) 100%)',
    }}>
      <div style={{ width: '100%', maxWidth: 400, padding: '0 20px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🧬</div>
          <h1 style={{ color: 'white', fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 500 }}>Lineage</h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, marginTop: 4, letterSpacing: '1px', textTransform: 'uppercase' }}>
            Clinical Genomics Platform
          </p>
        </div>

        {/* Card */}
        <div style={{ background: 'white', borderRadius: 14, padding: '28px', boxShadow: 'var(--shadow-lg)' }}>
          <h2 style={{ marginBottom: 20, fontSize: 17, color: 'var(--gray-800)' }}>Iniciar sesión</h2>

          {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 14 }}>
              <label>Correo electrónico</label>
              <input
                type="email"
                value={form.email}
                onChange={e => { setForm({ ...form, email: e.target.value }); setTenantOptions([]); setTenantSlug('') }}
                placeholder="correo@ejemplo.com"
                autoComplete="username"
                autoFocus
                required
              />
            </div>

            <div style={{ marginBottom: tenantOptions.length ? 14 : 20 }}>
              <label>Contraseña</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>

            {/* Solo visible cuando el correo pertenece a más de un centro */}
            {tenantOptions.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <label>Centro clínico</label>
                <select value={tenantSlug} onChange={e => setTenantSlug(e.target.value)} required>
                  <option value="">Seleccione un centro…</option>
                  {tenantOptions.map(t => (
                    <option key={t.slug} value={t.slug}>{t.name}</option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
              style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
            >
              {isLoading ? <span className="spinner" /> : 'Ingresar'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 12.5, marginTop: 20 }}>
          ¿Su centro aún no está registrado?{' '}
          <Link to="/registro" style={{ color: 'var(--lineage-400)', textDecoration: 'none' }}>Crear cuenta</Link>
        </p>
      </div>
    </div>
  )
}
