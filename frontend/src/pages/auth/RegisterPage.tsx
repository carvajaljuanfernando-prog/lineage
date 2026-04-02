import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../../lib/auth.store'
import { api } from '../../lib/api'

export function RegisterPage() {
  const [form, setForm] = useState({
    centerName: '', tenantSlug: '', firstName: '', lastName: '',
    email: '', password: '', specialty: '', country: 'CO',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const generateSlug = (name: string) =>
    name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').slice(0, 40)

  const handleCenterName = (val: string) => {
    setForm({ ...form, centerName: val, tenantSlug: generateSlug(val) })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/register', form)
      setAuth(data)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al registrar el centro')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, var(--lineage-900) 0%, var(--lineage-800) 100%)',
      padding: '30px 20px',
    }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🧬</div>
          <h1 style={{ color: 'white', fontFamily: 'var(--font-display)', fontSize: 24 }}>Lineage</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 3, letterSpacing: '1px', textTransform: 'uppercase' }}>Registrar nuevo centro clínico</p>
        </div>

        <div style={{ background: 'white', borderRadius: 14, padding: '28px', boxShadow: 'var(--shadow-lg)' }}>
          {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--gray-100)' }}>
              <h3 style={{ marginBottom: 14, color: 'var(--gray-600)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '.5px' }}>Centro Clínico</h3>
              <div style={{ marginBottom: 12 }}>
                <label>Nombre del centro *</label>
                <input value={form.centerName} onChange={e => handleCenterName(e.target.value)} placeholder="Instituto del Corazón de Bucaramanga" required />
              </div>
              <div>
                <label>Identificador único (slug)</label>
                <input value={form.tenantSlug} onChange={e => setForm({ ...form, tenantSlug: e.target.value })} placeholder="instituto-corazon-bga" required />
                <p style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 3 }}>Este ID se usará para iniciar sesión. Solo letras minúsculas y guiones.</p>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <h3 style={{ marginBottom: 14, color: 'var(--gray-600)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '.5px' }}>Administrador del Centro</h3>
              <div className="grid-2" style={{ marginBottom: 12 }}>
                <div>
                  <label>Nombre *</label>
                  <input value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} required />
                </div>
                <div>
                  <label>Apellido *</label>
                  <input value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} required />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label>Especialidad</label>
                <input value={form.specialty} onChange={e => setForm({ ...form, specialty: e.target.value })} placeholder="Cardiología, Genética Médica…" />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label>Correo electrónico *</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div>
                <label>Contraseña * (mínimo 8 caracteres)</label>
                <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} minLength={8} required />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '10px' }}>
              {loading ? <span className="spinner" /> : 'Crear cuenta y acceder'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 12.5, marginTop: 18 }}>
          ¿Ya tiene cuenta?{' '}
          <Link to="/login" style={{ color: 'var(--lineage-400)', textDecoration: 'none' }}>Iniciar sesión</Link>
        </p>
      </div>
    </div>
  )
}
