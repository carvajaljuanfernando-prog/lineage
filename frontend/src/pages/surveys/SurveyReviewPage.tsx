import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '../../lib/api'

/* ═══════════════════════════════════════════════════════════
   REVISIÓN CLÍNICA DE LA ENCUESTA COMPLETADA
   Ruta: /surveys/review/:tokenId
   ═══════════════════════════════════════════════════════════ */

const SEXO: Record<string, string> = { H: 'Hombre', M: 'Mujer' }
const yn = (v: any) => v === 'si' ? 'Sí' : v === 'no' ? 'No' : v === 'no_se' ? 'No lo sé' : '—'

function Campo({ l, v, alerta }: { l: string; v: any; alerta?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--gray-100)' }}>
      <span style={{ color: 'var(--gray-500)', fontSize: 12.5 }}>{l}</span>
      <span style={{ fontSize: 12.5, textAlign: 'right', maxWidth: '62%', color: alerta ? 'var(--danger)' : 'var(--gray-800)', fontWeight: alerta ? 600 : 400 }}>
        {v || '—'}
      </span>
    </div>
  )
}

function Seccion({ titulo, children, contador }: any) {
  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>{titulo}</h3>
        {contador !== undefined && <span className="badge badge-gray">{contador}</span>}
      </div>
      {children}
    </div>
  )
}

/* Ficha de un pariente (madre, padre, abuelos) */
function FichaPariente({ p, titulo, femenino }: any) {
  if (!p || !p.nombre) {
    return (
      <div style={{ padding: '10px 0' }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{titulo}</div>
        <p style={{ color: 'var(--gray-400)', fontSize: 12.5 }}>El paciente no registró datos.</p>
      </div>
    )
  }
  const cardiaco = p.problemasCorazon === 'si'
  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid var(--gray-100)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>{titulo}</span>
        {cardiaco && <span className="badge badge-red">♥ Antecedente cardiaco</span>}
        {p.vivo === 'no' && <span className="badge badge-gray">Fallecido/a</span>}
      </div>
      <Campo l="Nombre" v={p.nombre} />
      <Campo l="Fecha de nacimiento" v={p.fechaNac} />
      <Campo l="Edad" v={p.edad} />
      <Campo l={femenino ? '¿Viva?' : '¿Vivo?'} v={yn(p.vivo)} />
      {p.vivo === 'no' && <>
        <Campo l="Causa de muerte" v={p.causaMuerte} />
        <Campo l="Edad al fallecer" v={p.edadMuerte} />
        <Campo l="¿Autopsia?" v={yn(p.autopsia)} />
      </>}
      <Campo l="Problemas de corazón" v={yn(p.problemasCorazon)} alerta={cardiaco} />
      {cardiaco && <Campo l="Descripción" v={p.descripcionCorazon} alerta />}
    </div>
  )
}

/* Ficha de miembro (hijo, hermano, tío) */
function FichaMiembro({ m, indice }: any) {
  const cardiaco = m.problemaCardiaco === true
  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid var(--gray-100)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>{indice}. {m.nombre}</span>
        <span className="badge badge-gray">{SEXO[m.sexo] || 'Sexo no indicado'}</span>
        {cardiaco && <span className="badge badge-red">♥ Antecedente cardiaco</span>}
        {m.fallecido && <span className="badge badge-gray">Fallecido/a</span>}
        {m.medioHermano && <span className="badge badge-yellow">Medio hermano/a{m.mismoProgenitor ? ` (mismo/a ${m.mismoProgenitor})` : ''}</span>}
      </div>
      <Campo l="Fecha de nacimiento" v={m.fechaNac} />
      {m.fallecido && <>
        <Campo l="Causa de muerte" v={m.causaMuerte} />
        <Campo l="Edad al fallecer" v={m.edadMuerte} />
        {m.autopsia && <Campo l="¿Autopsia?" v={yn(m.autopsia)} />}
      </>}
      {cardiaco && <Campo l="Problema cardiaco" v={m.descripcionProblema} alerta />}
    </div>
  )
}

export function SurveyReviewPage() {
  const { tokenId } = useParams<{ tokenId: string }>()
  const navigate = useNavigate()
  const [msg, setMsg] = useState('')
  const [verConsent, setVerConsent] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ['survey-responses', tokenId],
    queryFn: () => api.get(`/surveys/responses/${tokenId}`).then(r => r.data),
  })

  const buildPedigree = useMutation({
    mutationFn: () => api.post(`/pedigree/build/${tokenId}`).then(r => r.data),
    onSuccess: () => {
      setMsg('')
      navigate(`/patients/${data.patientId}/pedigree`)
    },
    onError: (e: any) => setMsg(e.response?.data?.message || 'No se pudo generar el pedigrí'),
  })

  const descargarConsentimiento = () => {
    if (!data?.consentSnapshot) return
    const enc = [
      '='.repeat(70),
      'CONSTANCIA DE AUTORIZACIÓN PARA TRATAMIENTO DE DATOS PERSONALES',
      '='.repeat(70),
      '',
      `Paciente: ${data.patient?.firstName || ''} ${data.patient?.lastName || ''}`,
      `Firmado por: ${data.consentFullName || '—'}`,
      `Documento: ${data.consentDocumentNum || '—'}`,
      `Fecha y hora de aceptación: ${data.consentAcceptedAt ? new Date(data.consentAcceptedAt).toLocaleString('es-CO') : '—'}`,
      `Versión del documento: ${data.consentVersion || '—'}`,
      `Uso para investigación (anonimizado): ${data.consentResearch ? 'AUTORIZADO' : 'NO AUTORIZADO'}`,
      `Dirección IP de origen: ${data.consentIpAddress || '—'}`,
      `Navegador: ${data.consentUserAgent || '—'}`,
      '',
      '='.repeat(70),
      'TEXTO ÍNTEGRO ACEPTADO POR EL PACIENTE',
      '='.repeat(70),
      '',
      data.consentSnapshot,
    ].join('\n')
    const blob = new Blob([enc], { type: 'text/plain;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `consentimiento-${data.patient?.lastName || 'paciente'}.txt`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center' }}><span className="spinner" /></div>
  if (error || !data) return <div style={{ padding: 40 }}><div className="alert alert-danger">No se encontró la encuesta.</div></div>

  const r = data.responses || {}
  const paciente = data.patient
  const hijos = (r.hijos || []).filter((h: any) => h.nombre)
  const hermanos = (r.hermanos || []).filter((h: any) => h.nombre)
  const tiosMat = (r.famMadre?.tios || []).filter((t: any) => t.nombre)
  const tiosPat = (r.famPadre?.tios || []).filter((t: any) => t.nombre)

  const afectados = [
    ...hijos.filter((h: any) => h.problemaCardiaco === true),
    ...hermanos.filter((h: any) => h.problemaCardiaco === true),
    ...tiosMat.filter((t: any) => t.problemaCardiaco === true),
    ...tiosPat.filter((t: any) => t.problemaCardiaco === true),
    ...(r.madre?.problemasCorazon === 'si' ? [1] : []),
    ...(r.padre?.problemasCorazon === 'si' ? [1] : []),
    ...(r.famMadre?.abuela?.problemasCorazon === 'si' ? [1] : []),
    ...(r.famMadre?.abuelo?.problemasCorazon === 'si' ? [1] : []),
    ...(r.famPadre?.abuela?.problemasCorazon === 'si' ? [1] : []),
    ...(r.famPadre?.abuelo?.problemasCorazon === 'si' ? [1] : []),
  ].length

  const fallecidosCardiacos = [...hijos, ...hermanos, ...tiosMat, ...tiosPat]
    .filter((m: any) => m.fallecido && /card|coraz|súbit|subit|infart/i.test(m.causaMuerte || ''))

  return (
    <div style={{ padding: '28px 30px' }}>
      <Link to={`/patients/${data.patientId}`} style={{ color: 'var(--gray-400)', fontSize: 13, textDecoration: 'none' }}>
        ← Volver al paciente
      </Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', margin: '10px 0 22px', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ marginBottom: 3 }}>Revisión de encuesta</h1>
          <p style={{ color: 'var(--gray-500)', fontSize: 13 }}>
            {paciente?.firstName} {paciente?.lastName} · {data.template?.name}
            {data.completedAt && ` · Completada el ${new Date(data.completedAt).toLocaleDateString('es-CO')}`}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => buildPedigree.mutate()} disabled={buildPedigree.isPending}>
          {buildPedigree.isPending ? <><span className="spinner" /> Generando…</> : '◉ Generar pedigrí'}
        </button>
      </div>

      {msg && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{msg}</div>}

      {/* Resumen de alertas */}
      <div className="grid-3" style={{ marginBottom: 18 }}>
        <div className="card" style={{ textAlign: 'center', padding: '14px 12px' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--gray-900)' }}>{hijos.length + hermanos.length + tiosMat.length + tiosPat.length + 2}</div>
          <div style={{ fontSize: 11.5, color: 'var(--gray-500)' }}>Familiares registrados</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '14px 12px' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: afectados > 0 ? 'var(--danger)' : 'var(--gray-900)' }}>{afectados}</div>
          <div style={{ fontSize: 11.5, color: 'var(--gray-500)' }}>Con antecedente cardiaco</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '14px 12px' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: fallecidosCardiacos.length > 0 ? 'var(--warning)' : 'var(--gray-900)' }}>{fallecidosCardiacos.length}</div>
          <div style={{ fontSize: 11.5, color: 'var(--gray-500)' }}>Muertes de posible causa cardiaca</div>
        </div>
      </div>

      {fallecidosCardiacos.length > 0 && (
        <div className="alert alert-warning" style={{ marginBottom: 18 }}>
          <b>⚠ Atención:</b> se reportaron muertes cuya causa sugiere origen cardiaco
          ({fallecidosCardiacos.map((m: any) => `${m.nombre} — ${m.causaMuerte}`).join('; ')}).
          Considere solicitar informes de autopsia si están disponibles.
        </div>
      )}

      {/* Consentimiento informado */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Consentimiento informado</h3>
          {data.consentAccepted
            ? <span className="badge badge-green">Aceptado ✓</span>
            : <span className="badge badge-red">No registrado</span>}
        </div>
        {data.consentAccepted ? (
          <>
            <Campo l="Firmado por" v={data.consentFullName} />
            <Campo l="Documento" v={data.consentDocumentNum} />
            <Campo l="Fecha y hora" v={data.consentAcceptedAt ? new Date(data.consentAcceptedAt).toLocaleString('es-CO') : '—'} />
            <Campo l="Versión del documento" v={data.consentVersion} />
            <Campo l="Uso para investigación (anonimizado)" v={data.consentResearch ? 'Autorizado' : 'No autorizado'} />
            <Campo l="Dirección IP" v={data.consentIpAddress} />
            <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setVerConsent(v => !v)}>
                {verConsent ? 'Ocultar texto aceptado' : 'Ver texto aceptado'}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={descargarConsentimiento}>
                ⤓ Descargar constancia
              </button>
            </div>
            {verConsent && (
              <pre style={{
                marginTop: 14, background: 'var(--gray-50)', border: '1px solid var(--gray-200)',
                borderRadius: 8, padding: 14, fontSize: 11.5, lineHeight: 1.7,
                whiteSpace: 'pre-wrap', fontFamily: 'var(--font-sans)', color: 'var(--gray-700)',
                maxHeight: 340, overflowY: 'auto',
              }}>{data.consentSnapshot}</pre>
            )}
          </>
        ) : (
          <div className="alert alert-warning">
            Esta encuesta no tiene consentimiento registrado. Corresponde a un enlace generado antes de que la
            plataforma incorporara el consentimiento digital.
          </div>
        )}
      </div>

      {/* Secciones */}
      <Seccion titulo="Hijos" contador={hijos.length}>
        {hijos.length === 0
          ? <p style={{ color: 'var(--gray-400)', fontSize: 12.5 }}>Sin hijos registrados.</p>
          : hijos.map((h: any, i: number) => <FichaMiembro key={h.id || i} m={h} indice={i + 1} />)}
      </Seccion>

      <Seccion titulo="Hermanos y hermanas" contador={hermanos.length}>
        {hermanos.length === 0
          ? <p style={{ color: 'var(--gray-400)', fontSize: 12.5 }}>Sin hermanos registrados.</p>
          : hermanos.map((h: any, i: number) => <FichaMiembro key={h.id || i} m={h} indice={i + 1} />)}
      </Seccion>

      <Seccion titulo="Padres">
        <FichaPariente p={r.madre} titulo="Madre" femenino />
        <FichaPariente p={r.padre} titulo="Padre" />
      </Seccion>

      <Seccion titulo="Familia materna">
        <FichaPariente p={r.famMadre?.abuela} titulo="Abuela materna" femenino />
        <FichaPariente p={r.famMadre?.abuelo} titulo="Abuelo materno" />
        {tiosMat.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Tíos/as maternos ({tiosMat.length})</div>
            {tiosMat.map((t: any, i: number) => <FichaMiembro key={t.id || i} m={t} indice={i + 1} />)}
          </div>
        )}
      </Seccion>

      <Seccion titulo="Familia paterna">
        <FichaPariente p={r.famPadre?.abuela} titulo="Abuela paterna" femenino />
        <FichaPariente p={r.famPadre?.abuelo} titulo="Abuelo paterno" />
        {tiosPat.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Tíos/as paternos ({tiosPat.length})</div>
            {tiosPat.map((t: any, i: number) => <FichaMiembro key={t.id || i} m={t} indice={i + 1} />)}
          </div>
        )}
      </Seccion>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
        <button className="btn btn-primary" onClick={() => buildPedigree.mutate()} disabled={buildPedigree.isPending}>
          {buildPedigree.isPending ? <><span className="spinner" /> Generando…</> : '◉ Generar pedigrí familiar'}
        </button>
      </div>
    </div>
  )
}
