import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../lib/auth.store'

const navItems = [
  { to: '/dashboard', icon: '⬡', label: 'Panel Principal' },
  { to: '/patients',  icon: '◈', label: 'Pacientes' },
  { to: '/surveys',   icon: '◉', label: 'Encuestas' },
  { to: '/variants',  icon: '⬟', label: 'Variantes' },
  { to: '/users',     icon: '◎', label: 'Equipo' },
]

export function DashboardLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* ── SIDEBAR ── */}
      <aside style={{
        width: 220, background: 'var(--lineage-900)',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50,
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22, color: '#60a5d8' }}>🧬</span>
            <div>
              <div style={{ color: 'white', fontWeight: 600, fontSize: 16, letterSpacing: '.5px' }}>Lineage</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase' }}>Clinical Genomics</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 10px' }}>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 8,
                marginBottom: 2, textDecoration: 'none',
                fontSize: 13.5, fontWeight: 500,
                background: isActive ? 'rgba(96,165,216,0.15)' : 'transparent',
                color: isActive ? '#93c5fd' : 'rgba(255,255,255,0.55)',
                transition: 'all .15s',
              })}
            >
              <span style={{ fontSize: 15 }}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User info */}
        <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12.5, marginBottom: 2, fontWeight: 500 }}>
            {user?.firstName} {user?.lastName}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginBottom: 10 }}>
            {user?.role?.replace('_', ' ')}
          </div>
          <button
            onClick={handleLogout}
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.5)', padding: '6px 12px',
              borderRadius: 6, cursor: 'pointer', fontSize: 12, width: '100%',
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main style={{ marginLeft: 220, flex: 1, minHeight: '100vh' }}>
        <Outlet />
      </main>
    </div>
  )
}
