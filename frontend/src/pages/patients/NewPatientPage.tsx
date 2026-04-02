import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { api } from '../../lib/api'

export function NewPatientPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    firstName: '', lastName: '', sex: 'MALE',
    documentType: 'CC', documentNum: '', dateOfBirth: '',
    email: '', phone: '', city: '', country: 'CO',
    referralReason: '', clinicalNotes: '',
  })
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/patients', data).then(r => r.data),
    onSuccess: (patient) => navigate(`/patients/${patient.id}`),
    onError: (err: any) => setError(err.response?.data?.message || 'Error al registrar el paciente'),
  })

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div style={{ padding: '28px 30px', maxWidth: 700 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Link to="/patients" style={{ color: 'var(--gray-400)', fontSize: 13, textDecoration: 'none' }}>
          ← Pacientes
        </Link>
        <h1 style={{ marginTop: 6 }}>Registrar nuevo paciente</h1>
        <p style={{ color: 'var(--gray-500)', fontSize: 13, marginTop: 4 }}>
          Una vez registrado podrá generar el enlace de encuesta de historia familiar.
        </p>
      </div>

      {error && <div className="alert alert-danger" style={{ marginBottom: 18 }}>{error}</div>}

      {/* Identification */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header"><h3>Datos de identificación</h3></div>
        <div className="grid-2" style={{ marginBottom: 14 }}>
          <div>
            <label>Nombre(s) *</label>
            <input value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="Nombres" required />
          </div>
          <div>
            <label>Apellidos *</label>
            <input value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Apellidos" required />
          </div>
        </div>
        <div className="grid-2" style={{ marginBottom: 14 }}>
          <div>
            <label>Sexo *</label>
            <select value={form.sex} onChange={e => set('sex', e.target.value)}>
              <option value="MALE">Hombre</option>
              <option value="FEMALE">Mujer</option>
              <option value="OTHER">Otro</option>
              <option value="UNKNOWN">Desconocido</option>
            </select>
          </div>
          <div>
            <label>Fecha de nacimiento</label>
            <input type="date" value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} />
          </div>
        </div>
        <div className="grid-2">
          <div>
            <label>Tipo de documento</label>
            <select value={form.documentType} onChange={e => set('documentType', e.target.value)}>
              <option value="CC">Cédula de ciudadanía</option>
              <option value="TI">Tarjeta de identidad</option>
              <option value="CE">Cédula de extranjería</option>
              <option value="PA">Pasaporte</option>
              <option value="RC">Registro civil</option>
            </select>
          </div>
          <div>
            <label>Número de documento</label>
            <input value={form.documentNum} onChange={e => set('documentNum', e.target.value)} placeholder="Número" />
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header"><h3>Datos de contacto</h3></div>
        <div className="grid-2" style={{ marginBottom: 14 }}>
          <div>
            <label>Correo electrónico</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="correo@ejemplo.com" />
            <p style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 3 }}>Se usará para enviar el enlace de la encuesta</p>
          </div>
          <div>
            <label>Teléfono</label>
            <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+57 300 000 0000" />
          </div>
        </div>
        <div className="grid-2">
          <div>
            <label>Ciudad</label>
            <input value={form.city} onChange={e => set('city', e.target.value)} placeholder="Bucaramanga" />
          </div>
          <div>
            <label>País</label>
            <select value={form.country} onChange={e => set('country', e.target.value)}>
              <option value="CO">Colombia</option>
              <option value="MX">México</option>
              <option value="AR">Argentina</option>
              <option value="CL">Chile</option>
              <option value="PE">Perú</option>
              <option value="VE">Venezuela</option>
              <option value="ES">España</option>
              <option value="US">Estados Unidos</option>
              <option value="OTHER">Otro</option>
            </select>
          </div>
        </div>
      </div>

      {/* Clinical */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header"><h3>Datos clínicos</h3></div>
        <div style={{ marginBottom: 14 }}>
          <label>Motivo de consulta / derivación</label>
          <textarea
            value={form.referralReason}
            onChange={e => set('referralReason', e.target.value)}
            placeholder="Ej: Sospecha de cardiomiopatía hipertrófica familiar. Hermano diagnosticado a los 35 años."
            rows={3}
          />
        </div>
        <div>
          <label>Notas clínicas iniciales</label>
          <textarea
            value={form.clinicalNotes}
            onChange={e => set('clinicalNotes', e.target.value)}
            placeholder="Observaciones adicionales para el equipo clínico"
            rows={2}
          />
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          className="btn btn-primary"
          onClick={() => mutation.mutate(form)}
          disabled={mutation.isPending || !form.firstName || !form.lastName}
        >
          {mutation.isPending ? <><span className="spinner" /> Registrando…</> : '✓ Registrar paciente'}
        </button>
        <Link to="/patients" className="btn btn-secondary">Cancelar</Link>
      </div>
    </div>
  )
}
