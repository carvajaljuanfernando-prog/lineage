import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../../lib/auth.store'

export function LoginPage() {
  const [form, setForm] = useState({ tenantSlug: '', email: '', password: '' })
  const [error, setError] = useState('')
  const { login, isLoading } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await login(form.tenantSlug, form.email, form.password)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Credenciales inválidas')
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
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, marginTop: 4, letterSpacing: '1px', textTransform: 'uppercase' }}>Clinical Genomics Platform</p>
        </div>

        {/* Card */}
        <div style={{ background: 'white', borderRadius: 14, padding: '28px 28px', boxShadow: 'var(--shadow-lg)' }}>
          <h2 style={{ marginBottom: 20, fontSize: 17, color: 'var(--gray-800)' }}>Iniciar sesión</h2>

          {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 14 }}>
              <label>Centro clínico (ID)</label>
              <input
                value={form.tenantSlug}
                onChange={e => setForm({ ...form, tenantSlug: e.target.value })}
                placeholder="ej: instituto-corazon-bga"
                required
              />
              <p style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 4 }}>El identificador único de su centro</p>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label>Correo electrónico</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="correo@ejemplo.com"
                required
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label>Contraseña</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                required
              />
            </div>
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
