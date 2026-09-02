import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../../lib/api'

/* ═══════════════════════════════════════════════════════════════
   ENCUESTA DE HISTORIA FAMILIAR — CARDIOMIOPATÍAS (vista paciente)
   Estilo cálido (crema/marrón) heredado del formulario original.
   Las respuestas siguen el formato que espera pedigree.service.
   ═══════════════════════════════════════════════════════════════ */

const uid = () => Math.random().toString(36).slice(2, 9)

const emptyHijo = () => ({ id: uid(), nombre: '', sexo: '', fechaNac: '', edad: '', fechaNacAprox: false, fallecido: false, fechaMuerte: '', causaMuerte: '', edadMuerte: '', fechaMuerteAprox: false, autopsia: '', problemaCardiaco: false, descripcionProblema: '' })
const emptyHermano = () => ({ ...emptyHijo(), medioHermano: false, mismoProgenitor: '' })
const emptyTio = () => ({ id: uid(), nombre: '', sexo: '', fechaNac: '', edad: '', fechaNacAprox: false, fallecido: false, fechaMuerte: '', causaMuerte: '', edadMuerte: '', fechaMuerteAprox: false, problemaCardiaco: false, descripcionProblema: '' })
const emptyPariente = () => ({ id: uid(), nombre: '', fechaNac: '', edad: '', fechaNacAprox: false, vivo: 'si', fechaMuerte: '', causaMuerte: '', edadMuerte: '', fechaMuerteAprox: false, autopsia: '', problemasCorazon: 'no', descripcionCorazon: '' })

const initialResponses = () => ({
  hijos: [] as any[],
  hermanos: [] as any[],
  madre: emptyPariente(),
  padre: emptyPariente(),
  famMadre: { tios: [] as any[], abuela: emptyPariente(), abuelo: emptyPariente() },
  famPadre: { tios: [] as any[], abuela: emptyPariente(), abuelo: emptyPariente() },
})

const STEPS = ['Bienvenida', 'Sus Hijos', 'Hermanos/as', 'Su Madre', 'Su Padre', 'Familia Materna', 'Familia Paterna', 'Revisar y Enviar']

/* ── estilos ── */
const css = `
.sv * { box-sizing: border-box; }
.sv { min-height: 100vh; background: #f5ede0; font-family: Georgia, 'Times New Roman', serif; color: #3b1f0e; }
.sv-hdr { background: #3b1f0e; padding: 14px 18px; position: sticky; top: 0; z-index: 50; }
.sv-hdr-in { max-width: 780px; margin: 0 auto; display: flex; align-items: center; gap: 13px; }
.sv-steps { background: #2d1a0e; overflow-x: auto; display: flex; padding: 0 8px; }
.sv-step { padding: 9px 11px; background: none; border: none; border-bottom: 2px solid transparent; font-size: 11px; font-family: Georgia, serif; white-space: nowrap; color: #4a2a10; cursor: default; }
.sv-step.done { color: #c9a87c; border-bottom-color: rgba(201,168,124,.35); cursor: pointer; }
.sv-step.active { color: #f5ede0; border-bottom-color: #c9a87c; }
.sv-main { max-width: 780px; margin: 0 auto; padding: 22px 16px 90px; }
.sv-card { background: #fdfaf6; border: 1px solid #e0c9a8; border-radius: 10px; padding: 20px; margin-bottom: 14px; }
.sv-title { font-size: 19px; font-style: italic; margin: 0 0 4px; font-weight: 600; }
.sv-sub { color: #8b5e3c; font-size: 12.5px; margin: 0 0 16px; }
.sv label.lb { display: block; color: #6b3a1e; font-size: 11px; font-weight: 700; letter-spacing: .6px; text-transform: uppercase; margin-bottom: 4px; }
.sv input, .sv select, .sv textarea { width: 100%; background: #fdfaf6; border: 1px solid #c9a87c; border-radius: 6px; padding: 9px 11px; color: #2d1a0e; font-size: 14px; font-family: Georgia, serif; outline: none; }
.sv input:focus, .sv select:focus, .sv textarea:focus { border-color: #7c3a1e; box-shadow: 0 0 0 3px rgba(139,90,60,.12); }
.sv textarea { resize: vertical; min-height: 60px; }
.sv .g2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.sv .g3 { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 12px; }
@media (max-width: 560px) { .sv .g2, .sv .g3 { grid-template-columns: 1fr; } }
.sv .ir { display: flex; gap: 16px; flex-wrap: wrap; margin-top: 4px; }
.sv .ir label { display: flex; align-items: center; gap: 6px; font-size: 14px; cursor: pointer; color: #3b1f0e; }
.sv .ir input { width: auto; }
.sv .pb { background: rgba(245,237,224,.55); border: 1px solid #e0c9a8; border-radius: 8px; padding: 14px; margin-bottom: 10px; }
.sv .pb-h { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.sv .pb-t { font-weight: 700; font-size: 14px; }
.sv .hr { border: 0; border-top: 1px solid #e0c9a8; margin: 12px 0; }
.sv .btn { padding: 11px 24px; border-radius: 7px; font-size: 14.5px; font-family: Georgia, serif; cursor: pointer; border: 1px solid #c9a87c; background: transparent; color: #3b1f0e; }
.sv .btn:hover { background: rgba(139,90,60,.07); }
.sv .btn-p { background: #7c3a1e; border-color: #5c2a0e; color: #fdf6ee; }
.sv .btn-p:hover { background: #5c2a0e; }
.sv .btn-p:disabled { opacity: .55; cursor: not-allowed; }
.sv .btn-d { border-color: #fca5a5; color: #b91c1c; font-size: 12px; padding: 5px 12px; }
.sv .btn-add { width: 100%; padding: 11px; background: rgba(139,90,60,.05); border: 1.5px dashed #c9a87c; color: #7c3a1e; border-radius: 8px; font-family: Georgia, serif; cursor: pointer; font-size: 13.5px; }
.sv .btn-add:hover { background: rgba(139,90,60,.11); }
.sv .navbar { position: fixed; bottom: 0; left: 0; right: 0; background: #fdfaf6; border-top: 1px solid #e0c9a8; padding: 12px 16px; z-index: 60; }
.sv .navbar-in { max-width: 780px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; gap: 10px; }
.sv .save-hint { color: #8b5e3c; font-size: 11.5px; font-style: italic; }
.sv .aprox { display: flex; align-items: center; gap: 6px; margin-top: 5px; font-size: 12.5px; color: #8b5e3c; cursor: pointer; }
.sv .aprox input { width: auto; }
.sv .nota { font-size: 12px; color: #8b5e3c; font-style: italic; margin: -4px 0 10px; }
.sv .warn { background: #fef9f0; border: 1px solid #f0d08a; border-radius: 8px; padding: 12px 15px; color: #7c4a00; font-size: 13px; line-height: 1.7; margin-bottom: 14px; }
.sv .rrow { display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px solid rgba(224,201,168,.4); font-size: 13.5px; }
.sv .rl { color: #8b5e3c; } .sv .rv { text-align: right; max-width: 60%; }
@keyframes svspin { to { transform: rotate(360deg); } }
.sv .spin { display: inline-block; width: 14px; height: 14px; border: 2px solid #fdf6ee; border-top-color: transparent; border-radius: 50%; animation: svspin .7s linear infinite; vertical-align: -2px; margin-right: 7px; }
`

/* ── subcomponentes ── */
function Fld({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="lb">{label}</label>{children}</div>
}

function SiNo({ value, onChange, name, labels = ['Sí', 'No'] }: any) {
  return (
    <div className="ir">
      <label><input type="radio" name={name} checked={value === 'si'} onChange={() => onChange('si')} /> {labels[0]}</label>
      <label><input type="radio" name={name} checked={value === 'no'} onChange={() => onChange('no')} /> {labels[1]}</label>
    </div>
  )
}

function Bool({ value, onChange, name, yes = 'Sí', no = 'No' }: any) {
  return (
    <div className="ir">
      <label><input type="radio" name={name} checked={!value} onChange={() => onChange(false)} /> {no}</label>
      <label><input type="radio" name={name} checked={value === true} onChange={() => onChange(true)} /> {yes}</label>
    </div>
  )
}

/* Bloque para padres/abuelos (formato "pariente": vivo, problemasCorazon) */
function ParienteBlock({ p, onChange, titulo, femenino }: any) {
  const set = (k: string, v: any) => onChange({ ...p, [k]: v })
  return (
    <div className="pb">
      <div className="pb-h"><span className="pb-t">{titulo}</span></div>
      <div className="g3" style={{ marginBottom: 4 }}>
        <Fld label="Nombre completo"><input value={p.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Nombre y apellidos" /></Fld>
        <Fld label="Fecha de nacimiento"><input type="date" value={p.fechaNac} onChange={e => set('fechaNac', e.target.value)} /></Fld>
        <Fld label="Edad"><input type="number" min={0} max={130} value={p.edad} onChange={e => set('edad', e.target.value)} placeholder="años" /></Fld>
      </div>
      <label className="aprox" style={{ marginBottom: 10 }}>
        <input type="checkbox" checked={!!p.fechaNacAprox} onChange={e => set('fechaNacAprox', e.target.checked)} />
        La fecha o la edad son aproximadas (no las recuerdo con certeza)
      </label>
      <div style={{ marginBottom: 10 }}>
        <label className="lb">{femenino ? '¿Está viva?' : '¿Está vivo?'}</label>
        <SiNo value={p.vivo} onChange={(v: string) => set('vivo', v)} name={`vivo_${p.id}`} labels={femenino ? ['Sí, viva', 'No, fallecida'] : ['Sí, vivo', 'No, fallecido']} />
      </div>
      {p.vivo === 'no' && (
        <>
          <p className="nota">Responda lo que recuerde. Puede llenar solo la edad, solo la fecha, o ambas.</p>
          <div className="g3" style={{ marginBottom: 4 }}>
            <Fld label="Causa de la muerte"><input value={p.causaMuerte} onChange={e => set('causaMuerte', e.target.value)} placeholder="Si la conoce" /></Fld>
            <Fld label="Fecha de fallecimiento"><input type="date" value={p.fechaMuerte} onChange={e => set('fechaMuerte', e.target.value)} /></Fld>
            <Fld label="Edad al fallecer"><input type="number" min={0} max={130} value={p.edadMuerte} onChange={e => set('edadMuerte', e.target.value)} placeholder="años" /></Fld>
          </div>
          <label className="aprox" style={{ marginBottom: 10 }}>
            <input type="checkbox" checked={!!p.fechaMuerteAprox} onChange={e => set('fechaMuerteAprox', e.target.checked)} />
            La fecha o la edad de fallecimiento son aproximadas
          </label>
          <div style={{ marginBottom: 10, maxWidth: 280 }}>
            <Fld label="¿Se hizo autopsia?">
              <select value={p.autopsia} onChange={e => set('autopsia', e.target.value)}>
                <option value="">—</option><option value="si">Sí</option><option value="no">No</option><option value="no_se">No lo sé</option>
              </select>
            </Fld>
          </div>
        </>
      )}
      <hr className="hr" />
      <div style={{ marginBottom: 8 }}>
        <label className="lb">¿Ha tenido problemas de corazón?</label>
        <div className="ir">
          <label><input type="radio" name={`cor_${p.id}`} checked={p.problemasCorazon === 'no'} onChange={() => set('problemasCorazon', 'no')} /> No</label>
          <label><input type="radio" name={`cor_${p.id}`} checked={p.problemasCorazon === 'si'} onChange={() => set('problemasCorazon', 'si')} /> Sí</label>
          <label><input type="radio" name={`cor_${p.id}`} checked={p.problemasCorazon === 'no_se'} onChange={() => set('problemasCorazon', 'no_se')} /> No lo sé</label>
        </div>
      </div>
      {p.problemasCorazon === 'si' && (
        <Fld label="Describa el problema y la edad aproximada del diagnóstico">
          <textarea value={p.descripcionCorazon} onChange={e => set('descripcionCorazon', e.target.value)} placeholder="Ej: infarto a los 60 años, marcapasos, insuficiencia cardiaca…" rows={2} />
        </Fld>
      )}
    </div>
  )
}

/* Bloque para hijos/hermanos/tíos (formato bool: fallecido, problemaCardiaco) */
function MiembroBlock({ m, onChange, onRemove, titulo, esHermano }: any) {
  const set = (k: string, v: any) => onChange({ ...m, [k]: v })
  return (
    <div className="pb">
      <div className="pb-h">
        <span className="pb-t">{titulo}</span>
        <button className="btn btn-d" onClick={onRemove}>✕ Quitar</button>
      </div>
      <div className="g3" style={{ marginBottom: 4 }}>
        <Fld label="Nombre completo"><input value={m.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Nombre y apellidos" /></Fld>
        <Fld label="Sexo">
          <select value={m.sexo} onChange={e => set('sexo', e.target.value)}>
            <option value="">—</option><option value="H">Hombre</option><option value="M">Mujer</option>
          </select>
        </Fld>
        <Fld label="Fecha de nacimiento"><input type="date" value={m.fechaNac} onChange={e => set('fechaNac', e.target.value)} /></Fld>
      </div>
      <div className="g2" style={{ marginBottom: 4 }}>
        <Fld label="Edad"><input type="number" min={0} max={130} value={m.edad} onChange={e => set('edad', e.target.value)} placeholder="años" /></Fld>
      </div>
      <label className="aprox" style={{ marginBottom: 10 }}>
        <input type="checkbox" checked={!!m.fechaNacAprox} onChange={e => set('fechaNacAprox', e.target.checked)} />
        La fecha o la edad son aproximadas
      </label>
      {esHermano && (
        <div style={{ marginBottom: 10 }}>
          <label className="lb">¿Es medio hermano/a?</label>
          <div className="ir">
            <label><input type="checkbox" checked={m.medioHermano} onChange={e => set('medioHermano', e.target.checked)} /> Sí, es medio hermano/a</label>
            {m.medioHermano && (
              <select style={{ width: 'auto' }} value={m.mismoProgenitor} onChange={e => set('mismoProgenitor', e.target.value)}>
                <option value="">¿Comparten…?</option><option value="madre">Misma madre</option><option value="padre">Mismo padre</option>
              </select>
            )}
          </div>
        </div>
      )}
      <div style={{ marginBottom: 10 }}>
        <label className="lb">¿Ha fallecido?</label>
        <Bool value={m.fallecido} onChange={(v: boolean) => set('fallecido', v)} name={`fa_${m.id}`} yes="Sí, fallecido/a" />
      </div>
      {m.fallecido && (
        <>
          <p className="nota">Responda lo que recuerde. Puede llenar solo la edad, solo la fecha, o ambas.</p>
          <div className="g3" style={{ marginBottom: 4 }}>
            <Fld label="Causa de la muerte"><input value={m.causaMuerte} onChange={e => set('causaMuerte', e.target.value)} placeholder="Si la conoce" /></Fld>
            <Fld label="Fecha de fallecimiento"><input type="date" value={m.fechaMuerte} onChange={e => set('fechaMuerte', e.target.value)} /></Fld>
            <Fld label="Edad al fallecer"><input type="number" min={0} max={130} value={m.edadMuerte} onChange={e => set('edadMuerte', e.target.value)} placeholder="años" /></Fld>
          </div>
          <label className="aprox" style={{ marginBottom: 10 }}>
            <input type="checkbox" checked={!!m.fechaMuerteAprox} onChange={e => set('fechaMuerteAprox', e.target.checked)} />
            La fecha o la edad de fallecimiento son aproximadas
          </label>
          {m.autopsia !== undefined && (
            <div style={{ marginBottom: 10, maxWidth: 280 }}>
              <Fld label="¿Se hizo autopsia?">
                <select value={m.autopsia} onChange={e => set('autopsia', e.target.value)}>
                  <option value="">—</option><option value="si">Sí</option><option value="no">No</option><option value="no_se">No lo sé</option>
                </select>
              </Fld>
            </div>
          )}
        </>
      )}
      <hr className="hr" />
      <div style={{ marginBottom: 8 }}>
        <label className="lb">¿Ha tenido problemas de corazón?</label>
        <Bool value={m.problemaCardiaco} onChange={(v: boolean) => set('problemaCardiaco', v)} name={`co_${m.id}`} yes="Sí" />
      </div>
      {m.problemaCardiaco === true && (
        <Fld label="Describa el problema y la edad del diagnóstico">
          <textarea value={m.descripcionProblema} onChange={e => set('descripcionProblema', e.target.value)} placeholder="Ej: cardiomiopatía a los 40 años, arritmias…" rows={2} />
        </Fld>
      )}
    </div>
  )
}

/* Lista repetible (hijos, hermanos, tíos) */
function Lista({ items, onChange, empty, tituloBase, addLabel, esHermano }: any) {
  return (
    <>
      {items.map((m: any, i: number) => (
        <MiembroBlock key={m.id} m={m} esHermano={esHermano}
          titulo={`${tituloBase} ${i + 1}`}
          onChange={(nm: any) => onChange(items.map((x: any) => x.id === m.id ? nm : x))}
          onRemove={() => onChange(items.filter((x: any) => x.id !== m.id))} />
      ))}
      <button className="btn-add" onClick={() => onChange([...items, empty()])}>+ {addLabel}</button>
    </>
  )
}

/* ═══ PÁGINA PRINCIPAL ═══ */
export function SurveyPage() {
  const { token } = useParams<{ token: string }>()
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'completed'>('loading')
  const [error, setError] = useState('')
  const [meta, setMeta] = useState<any>(null)
  const [step, setStep] = useState(0)
  const [r, setR] = useState<any>(initialResponses())
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [sending, setSending] = useState(false)
  const saveTimer = useRef<any>(null)

  /* cargar token */
  useEffect(() => {
    if (!token) return
    api.get(`/public/survey/${token}`)
      .then(res => {
        setMeta(res.data)
        if (res.data.existingResponses) setR({ ...initialResponses(), ...res.data.existingResponses })
        setStatus('ready')
      })
      .catch(err => {
        setError(err.response?.data?.message || 'Enlace no válido o expirado')
        setStatus('error')
      })
  }, [token])

  /* auto-guardado con debounce de 2s */
  useEffect(() => {
    if (status !== 'ready') return
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      try {
        setSaving(true)
        await api.put(`/public/survey/${token}/progress`, { responses: r })
        setLastSaved(new Date())
      } catch { /* silencioso */ }
      finally { setSaving(false) }
    }, 2000)
    return () => clearTimeout(saveTimer.current)
  }, [r, status, token])

  const submit = async () => {
    setSending(true)
    try {
      await api.post(`/public/survey/${token}/submit`, { responses: r })
      setStatus('completed')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al enviar. Intente de nuevo.')
    } finally { setSending(false) }
  }

  /* ── pantallas de estado ── */
  if (status === 'loading') return (
    <><style>{css}</style>
    <div className="sv" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#6b3a1e' }}>Cargando encuesta…</p>
    </div></>
  )
  if (status === 'error') return (
    <><style>{css}</style>
    <div className="sv" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <div style={{ fontSize: 46, marginBottom: 14 }}>⚠</div>
        <h2 style={{ fontStyle: 'italic' }}>Enlace no disponible</h2>
        <p style={{ color: '#6b3a1e', lineHeight: 1.7 }}>{error}</p>
        <p style={{ color: '#8b5e3c', fontSize: 12, marginTop: 14 }}>Comuníquese con su equipo médico para solicitar un nuevo enlace.</p>
      </div>
    </div></>
  )
  if (status === 'completed') return (
    <><style>{css}</style>
    <div className="sv" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="sv-card" style={{ textAlign: 'center', maxWidth: 460, padding: 44 }}>
        <div style={{ fontSize: 54, color: '#7c3a1e', marginBottom: 14 }}>♥</div>
        <h2 style={{ fontStyle: 'italic', marginBottom: 10 }}>¡Gracias!</h2>
        <p style={{ color: '#6b3a1e', lineHeight: 1.8 }}>
          Su historia familiar fue recibida exitosamente. El equipo médico la revisará antes de su consulta. Ya puede cerrar esta ventana.
        </p>
      </div>
    </div></>
  )

  const nHijos = r.hijos.filter((h: any) => h.nombre).length
  const nHerm = r.hermanos.filter((h: any) => h.nombre).length

  return (
    <>
      <style>{css}</style>
      <div className="sv">
        {/* header */}
        <div className="sv-hdr">
          <div className="sv-hdr-in">
            <span style={{ color: '#ef4444', fontSize: 22 }}>♥</span>
            <div>
              <div style={{ color: '#f5ede0', fontSize: 14, fontWeight: 700 }}>{meta?.template?.name || 'Historia Familiar'}</div>
              <div style={{ color: '#c9a87c', fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase' }}>Encuesta de historia familiar</div>
            </div>
          </div>
        </div>

        {/* pasos */}
        <div className="sv-steps">
          {STEPS.map((s, i) => (
            <button key={s}
              className={'sv-step' + (i === step ? ' active' : i < step ? ' done' : '')}
              onClick={() => i < step && setStep(i)}>
              {i + 1}. {s}
            </button>
          ))}
        </div>

        <div className="sv-main">
          {/* ── 0 BIENVENIDA ── */}
          {step === 0 && (
            <div className="sv-card">
              <p className="sv-title">Bienvenido/a, {meta?.patientFirstName}</p>
              <div className="warn">
                Su equipo médico le ha pedido completar esta encuesta sobre la <b>historia de salud de su familia</b> antes de la consulta.
                La información es <b>confidencial</b> y solo la verá su equipo tratante.
              </div>
              <p style={{ lineHeight: 1.8, fontSize: 14.5 }}>
                Le preguntaremos por sus hijos, hermanos, padres, abuelos y tíos: fechas de nacimiento,
                problemas de corazón y, si alguno falleció, la causa. <b>No se preocupe si no conoce todos los datos</b> —
                responda lo que sepa; su avance <b>se guarda automáticamente</b> y puede continuar más tarde desde este mismo enlace.
              </p>
              <p style={{ lineHeight: 1.8, fontSize: 14.5, marginTop: 10 }}>
                Tiempo estimado: <b>10 a 15 minutos</b>.
              </p>
            </div>
          )}

          {/* ── 1 HIJOS ── */}
          {step === 1 && (
            <div className="sv-card">
              <p className="sv-title">Sus Hijos</p>
              <p className="sv-sub">Agregue cada uno de sus hijos e hijas. Si no tiene hijos, continúe al siguiente paso.</p>
              <Lista items={r.hijos} onChange={(v: any) => setR({ ...r, hijos: v })}
                empty={emptyHijo} tituloBase="Hijo/a" addLabel="Agregar hijo/a" />
            </div>
          )}

          {/* ── 2 HERMANOS ── */}
          {step === 2 && (
            <div className="sv-card">
              <p className="sv-title">Sus Hermanos y Hermanas</p>
              <p className="sv-sub">Incluya a todos, vivos o fallecidos. Si tiene medio hermanos, márquelo en cada caso.</p>
              <Lista items={r.hermanos} onChange={(v: any) => setR({ ...r, hermanos: v })}
                empty={emptyHermano} tituloBase="Hermano/a" addLabel="Agregar hermano/a" esHermano />
            </div>
          )}

          {/* ── 3 MADRE ── */}
          {step === 3 && (
            <div className="sv-card">
              <p className="sv-title">Su Madre</p>
              <p className="sv-sub">Información sobre la salud de su madre biológica.</p>
              <ParienteBlock p={r.madre} onChange={(v: any) => setR({ ...r, madre: v })} titulo="Datos de su madre" femenino />
            </div>
          )}

          {/* ── 4 PADRE ── */}
          {step === 4 && (
            <div className="sv-card">
              <p className="sv-title">Su Padre</p>
              <p className="sv-sub">Información sobre la salud de su padre biológico.</p>
              <ParienteBlock p={r.padre} onChange={(v: any) => setR({ ...r, padre: v })} titulo="Datos de su padre" />
            </div>
          )}

          {/* ── 5 FAMILIA MATERNA ── */}
          {step === 5 && (
            <div className="sv-card">
              <p className="sv-title">La Familia de su Madre</p>
              <p className="sv-sub">Abuelos maternos y tíos/as por parte de madre.</p>
              <p style={{ fontWeight: 700, fontSize: 14, margin: '4px 0 10px' }}>1. Su abuela materna (madre de su madre)</p>
              <ParienteBlock p={r.famMadre.abuela} onChange={(v: any) => setR({ ...r, famMadre: { ...r.famMadre, abuela: v } })} titulo="Abuela materna" femenino />
              <p style={{ fontWeight: 700, fontSize: 14, margin: '14px 0 10px' }}>2. Su abuelo materno (padre de su madre)</p>
              <ParienteBlock p={r.famMadre.abuelo} onChange={(v: any) => setR({ ...r, famMadre: { ...r.famMadre, abuelo: v } })} titulo="Abuelo materno" />
              <p style={{ fontWeight: 700, fontSize: 14, margin: '14px 0 10px' }}>3. Tíos y tías maternos (hermanos/as de su madre)</p>
              <Lista items={r.famMadre.tios} onChange={(v: any) => setR({ ...r, famMadre: { ...r.famMadre, tios: v } })}
                empty={emptyTio} tituloBase="Tío/a materno" addLabel="Agregar tío/a materno" />
            </div>
          )}

          {/* ── 6 FAMILIA PATERNA ── */}
          {step === 6 && (
            <div className="sv-card">
              <p className="sv-title">La Familia de su Padre</p>
              <p className="sv-sub">Abuelos paternos y tíos/as por parte de padre.</p>
              <p style={{ fontWeight: 700, fontSize: 14, margin: '4px 0 10px' }}>1. Su abuela paterna (madre de su padre)</p>
              <ParienteBlock p={r.famPadre.abuela} onChange={(v: any) => setR({ ...r, famPadre: { ...r.famPadre, abuela: v } })} titulo="Abuela paterna" femenino />
              <p style={{ fontWeight: 700, fontSize: 14, margin: '14px 0 10px' }}>2. Su abuelo paterno (padre de su padre)</p>
              <ParienteBlock p={r.famPadre.abuelo} onChange={(v: any) => setR({ ...r, famPadre: { ...r.famPadre, abuelo: v } })} titulo="Abuelo paterno" />
              <p style={{ fontWeight: 700, fontSize: 14, margin: '14px 0 10px' }}>3. Tíos y tías paternos (hermanos/as de su padre)</p>
              <Lista items={r.famPadre.tios} onChange={(v: any) => setR({ ...r, famPadre: { ...r.famPadre, tios: v } })}
                empty={emptyTio} tituloBase="Tío/a paterno" addLabel="Agregar tío/a paterno" />
            </div>
          )}

          {/* ── 7 REVISIÓN ── */}
          {step === 7 && (
            <div className="sv-card">
              <p className="sv-title">Revisar y Enviar</p>
              <p className="sv-sub">Verifique el resumen. Puede volver a cualquier paso para corregir antes de enviar.</p>
              <div className="rrow"><span className="rl">Hijos registrados</span><span className="rv">{nHijos}</span></div>
              <div className="rrow"><span className="rl">Hermanos/as registrados</span><span className="rv">{nHerm}</span></div>
              <div className="rrow"><span className="rl">Madre</span><span className="rv">{r.madre.nombre || 'Sin datos'}</span></div>
              <div className="rrow"><span className="rl">Padre</span><span className="rv">{r.padre.nombre || 'Sin datos'}</span></div>
              <div className="rrow"><span className="rl">Abuelos maternos</span><span className="rv">{[r.famMadre.abuela.nombre, r.famMadre.abuelo.nombre].filter(Boolean).join(' · ') || 'Sin datos'}</span></div>
              <div className="rrow"><span className="rl">Abuelos paternos</span><span className="rv">{[r.famPadre.abuela.nombre, r.famPadre.abuelo.nombre].filter(Boolean).join(' · ') || 'Sin datos'}</span></div>
              <div className="rrow"><span className="rl">Tíos/as registrados</span><span className="rv">{r.famMadre.tios.filter((t: any) => t.nombre).length + r.famPadre.tios.filter((t: any) => t.nombre).length}</span></div>
              <div className="warn" style={{ marginTop: 16, marginBottom: 0 }}>
                Al enviar, autorizo a mi equipo médico el uso de esta información con fines diagnósticos y de atención en salud, bajo estricta confidencialidad.
              </div>
              {error && <div className="warn" style={{ marginTop: 10, borderColor: '#fca5a5', color: '#b91c1c', background: '#fff5f5' }}>⚠ {error}</div>}
            </div>
          )}
        </div>

        {/* barra de navegación fija */}
        <div className="navbar">
          <div className="navbar-in">
            {step > 0 ? <button className="btn" onClick={() => setStep(step - 1)}>← Anterior</button> : <span />}
            <span className="save-hint">
              {saving ? 'Guardando…' : lastSaved ? `Guardado ${lastSaved.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}` : 'Se guarda automáticamente'}
            </span>
            {step < STEPS.length - 1
              ? <button className="btn btn-p" onClick={() => setStep(step + 1)}>Siguiente →</button>
              : <button className="btn btn-p" onClick={submit} disabled={sending}>
                  {sending ? <><span className="spin" />Enviando…</> : '✓ Enviar Encuesta'}
                </button>}
          </div>
        </div>
      </div>
    </>
  )
}
