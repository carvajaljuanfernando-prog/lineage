import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../../lib/api'

// Import the survey form component (migrated from existing pedigri-familiar)
// This renders the full 8-step family history survey
export function SurveyPage() {
  const { token } = useParams<{ token: string }>()
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'completed'>('loading')
  const [error, setError] = useState('')
  const [surveyData, setSurveyData] = useState<any>(null)

  useEffect(() => {
    if (!token) return
    api.get(`/public/survey/${token}`)
      .then(r => {
        setSurveyData(r.data)
        setStatus('ready')
      })
      .catch(err => {
        setError(err.response?.data?.message || 'Enlace no válido o expirado')
        setStatus('error')
      })
  }, [token])

  const handleSubmit = async (responses: any) => {
    try {
      await api.post(`/public/survey/${token}/submit`, { responses })
      setStatus('completed')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al enviar la encuesta')
    }
  }

  const handleProgress = async (responses: any) => {
    try {
      await api.put(`/public/survey/${token}/progress`, { responses })
    } catch {}
  }

  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5ede0' }}>
        <div style={{ textAlign: 'center' }}>
          <span className="spinner" style={{ width: 32, height: 32 }} />
          <p style={{ marginTop: 14, color: '#6b3a1e', fontFamily: 'Georgia, serif' }}>Cargando encuesta…</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#f5ede0' }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠</div>
          <h2 style={{ fontFamily: 'Georgia, serif', color: '#3b1f0e', marginBottom: 12 }}>Enlace no disponible</h2>
          <p style={{ color: '#6b3a1e', lineHeight: 1.7 }}>{error}</p>
          <p style={{ color: '#8b5e3c', fontSize: 12, marginTop: 16 }}>
            Comuníquese con su equipo médico para solicitar un nuevo enlace.<br />
            <strong>fallacardiaca@institutodelcorazon.com</strong>
          </p>
        </div>
      </div>
    )
  }

  if (status === 'completed') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5ede0', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 480, background: '#fdfaf6', border: '1px solid #e0c9a8', borderRadius: 14, padding: 48 }}>
          <div style={{ fontSize: 56, color: '#7c3a1e', marginBottom: 16 }}>♥</div>
          <h2 style={{ fontFamily: 'Georgia, serif', color: '#3b1f0e', fontSize: 24, marginBottom: 12 }}>¡Gracias!</h2>
          <p style={{ color: '#6b3a1e', lineHeight: 1.8, fontSize: 14 }}>
            Su historia familiar fue recibida exitosamente. El equipo médico la revisará antes de su cita.
          </p>
          <p style={{ color: '#8b5e3c', fontSize: 12, marginTop: 16, lineHeight: 1.8 }}>
            Puede cerrar esta ventana.
          </p>
        </div>
      </div>
    )
  }

  // Ready — render the survey form
  // The actual survey component will be wired here in Phase 2
  // For now we show a placeholder that confirms the token works
  return (
    <div style={{ minHeight: '100vh', background: '#f5ede0', fontFamily: 'Georgia, serif' }}>
      <div style={{ background: '#3b1f0e', padding: '14px 20px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ color: '#ef4444', fontSize: 22 }}>♥</span>
          <div>
            <div style={{ color: '#f5ede0', fontSize: 14, fontWeight: 600 }}>
              {surveyData?.template?.name || 'Encuesta de Historia Familiar'}
            </div>
            <div style={{ color: '#c9a87c', fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
              Lineage · Clinical Genomics Platform
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 20px' }}>
        <div style={{ background: '#fdfaf6', border: '1px solid #e0c9a8', borderRadius: 10, padding: 24 }}>
          <p style={{ color: '#3b1f0e', fontSize: 15, marginBottom: 8 }}>
            Estimado/a <strong>{surveyData?.patientFirstName}</strong>,
          </p>
          <p style={{ color: '#6b3a1e', lineHeight: 1.8, marginBottom: 20 }}>
            Bienvenido/a a la encuesta de historia familiar de <strong>{surveyData?.template?.name}</strong>.
            Por favor complete la información sobre su familia — esto ayudará a su equipo médico a preparar su consulta.
          </p>

          {/* TODO: Mount the full SurveyForm component here (Phase 2) */}
          <div style={{ background: '#f5ede0', borderRadius: 8, padding: '20px', textAlign: 'center', color: '#8b5e3c' }}>
            <p style={{ fontSize: 13 }}>
              El formulario completo de encuesta se integrará en la siguiente fase del desarrollo.
              <br />Por ahora puede confirmar que el enlace funciona correctamente.
            </p>
            <button
              onClick={() => handleSubmit({ test: true })}
              style={{ marginTop: 16, padding: '10px 24px', background: '#7c3a1e', color: '#fdf6ee', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontFamily: 'Georgia, serif' }}
            >
              Confirmar encuesta de prueba
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
