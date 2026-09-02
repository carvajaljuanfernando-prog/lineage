import { useEffect, useRef, useCallback, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'

/* ═══════════════════════════════════════════════════════════
   PEDIGRÍ FAMILIAR — vista clínica
   Ruta: /patients/:id/pedigree
   Modos: completo · anonimizado · sin datos
   ═══════════════════════════════════════════════════════════ */

type Member = {
  id: string
  relationship: string
  firstName?: string
  lastName?: string
  sex: string
  dateOfBirth?: string
  ageAtRecord?: number
  birthApprox?: boolean
  isAlive: boolean
  dateOfDeath?: string
  ageAtDeath?: number
  deathApprox?: boolean
  causeOfDeath?: string
  hasCardiacHistory: boolean
  cardiacDescription?: string
  generation: number
}

type Modo = 'completo' | 'anonimo' | 'vacio'

const REL_ES: Record<string, string> = {
  proband: 'Paciente índice', mother: 'Madre', father: 'Padre',
  son: 'Hijo', daughter: 'Hija', brother: 'Hermano', sister: 'Hermana',
  mat_grandmother: 'Abuela materna', mat_grandfather: 'Abuelo materno',
  pat_grandmother: 'Abuela paterna', pat_grandfather: 'Abuelo paterno',
  mat_uncle: 'Tío materno', mat_aunt: 'Tía materna',
  pat_uncle: 'Tío paterno', pat_aunt: 'Tía paterna',
}

/* generación de base de datos → número romano de pedigrí */
const ROMANO: Record<number, string> = { 2: 'I', 1: 'II', 0: 'III', [-1]: 'IV' }

const edadDe = (m: Member): number | null => {
  if (!m.isAlive) return m.ageAtDeath ?? null
  if (m.ageAtRecord != null) return m.ageAtRecord
  if (m.dateOfBirth) {
    const a = Math.floor((Date.now() - new Date(m.dateOfBirth).getTime()) / (365.25 * 24 * 3600 * 1000))
    return a >= 0 && a < 130 ? a : null
  }
  return null
}

export function PedigreePage() {
  const { id } = useParams<{ id: string }>()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [modo, setModo] = useState<Modo>('completo')

  const { data: tree, isLoading, error } = useQuery({
    queryKey: ['pedigree', id],
    queryFn: () => api.get(`/pedigree/patient/${id}`).then(r => r.data),
  })
  const { data: patient } = useQuery({
    queryKey: ['patient', id],
    queryFn: () => api.get(`/patients/${id}`).then(r => r.data),
  })

  /* ── numeración de pedigrí: I-1, II-2, III-1… ── */
  const numeracion = useCallback((members: Member[]) => {
    const map = new Map<string, string>()
    const ordenGen = [2, 1, 0, -1]
    ordenGen.forEach(g => {
      const enGen = members.filter(m => m.generation === g)
      // orden estable: por relación y luego nombre
      enGen.sort((a, b) => (a.relationship + (a.firstName || '')).localeCompare(b.relationship + (b.firstName || '')))
      enGen.forEach((m, i) => map.set(m.id, `${ROMANO[g] || '?'}-${i + 1}`))
    })
    return map
  }, [])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !tree) return
    const ctx = canvas.getContext('2d')!
    const W = canvas.width, H = canvas.height
    const members: Member[] = tree.members || []
    const nums = numeracion(members)

    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = '#faf7f2'; ctx.fillRect(0, 0, W, H)
    ctx.strokeStyle = 'rgba(139,90,60,0.05)'; ctx.lineWidth = 1
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }

    const S = 19, EDGE = '#2c3e50', AFF = '#c0392b', LINE = '#8b5e3c'
    const MARGEN_IZQ = 108          // espacio reservado para etiquetas de generación
    const genY = [95, 235, 375, 500]  // I(abuelos) II(padres) III(probando) IV(hijos)

    /* etiquetas de generación en columna izquierda */
    ;['I', 'II', 'III', 'IV'].forEach((r, i) => {
      ctx.fillStyle = 'rgba(92,51,23,0.55)'
      ctx.font = 'bold 13px Georgia, serif'; ctx.textAlign = 'left'
      ctx.fillText(r, 14, genY[i] + 5)
    })
    ctx.strokeStyle = 'rgba(139,90,60,0.18)'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(MARGEN_IZQ - 22, 60); ctx.lineTo(MARGEN_IZQ - 22, H - 30); ctx.stroke()

    /* ── colecciones de líneas (se dibujan ANTES que los nodos) ── */
    const lineas: [number, number, number, number][] = []
    const ln = (x1: number, y1: number, x2: number, y2: number) => lineas.push([x1, y1, x2, y2])
    const pareja = (x1: number, x2: number, y: number) => { ln(x1 + S, y, x2 - S, y); return (x1 + x2) / 2 }
    /* fratría: baja del punto medio de la pareja, barra horizontal, verticales a cada hijo */
    const fratria = (mx: number, my: number, xs: number[], yc: number) => {
      if (!xs.length) return
      const ym = yc - 42
      ln(mx, my + S, mx, ym)
      ln(Math.min(...xs, mx), ym, Math.max(...xs, mx), ym)
      xs.forEach(x => ln(x, ym, x, yc - S))
    }

    /* ── nodos: se acumulan y se pintan al final, encima de las líneas ── */
    type NodoDef = { x: number; y: number; m?: Member; label?: string; esConyuge?: boolean }
    const nodos: NodoDef[] = []

    const find = (rel: string) => members.find(m => m.relationship === rel)
    const findAll = (rels: string[]) => members.filter(m => rels.includes(m.relationship))
    const isM = (m?: Member) => m?.sex === 'MALE'

    /* ═ GEN I — abuelos ═ */
    const anchoUtil = W - MARGEN_IZQ - 30
    const abMatX1 = MARGEN_IZQ + anchoUtil * 0.14, abMatX2 = MARGEN_IZQ + anchoUtil * 0.28
    const abPatX1 = MARGEN_IZQ + anchoUtil * 0.60, abPatX2 = MARGEN_IZQ + anchoUtil * 0.74
    const abMat = find('mat_grandmother'), abMatP = find('mat_grandfather')
    const abPat = find('pat_grandmother'), abPatP = find('pat_grandfather')
    if (abMat) nodos.push({ x: abMatX1, y: genY[0], m: abMat })
    if (abMatP) nodos.push({ x: abMatX2, y: genY[0], m: abMatP })
    if (abMat && abMatP) pareja(abMatX1, abMatX2, genY[0])
    if (abPat) nodos.push({ x: abPatX1, y: genY[0], m: abPat })
    if (abPatP) nodos.push({ x: abPatX2, y: genY[0], m: abPatP })
    if (abPat && abPatP) pareja(abPatX1, abPatX2, genY[0])
    const abMatMid = (abMat && abMatP) ? (abMatX1 + abMatX2) / 2 : (abMat ? abMatX1 : abMatX2)
    const abPatMid = (abPat && abPatP) ? (abPatX1 + abPatX2) / 2 : (abPat ? abPatX1 : abPatX2)

    /* ═ GEN II — padres y tíos ═ */
    const madre = find('mother'), padre = find('father')
    const madreX = MARGEN_IZQ + anchoUtil * 0.38, padreX = MARGEN_IZQ + anchoUtil * 0.52
    const tiosMat = findAll(['mat_uncle', 'mat_aunt']).slice(0, 3)
    const tiosPat = findAll(['pat_uncle', 'pat_aunt']).slice(0, 3)

    const hijosDeAbMat: number[] = []
    tiosMat.forEach((t, i) => {
      const tx = MARGEN_IZQ + anchoUtil * 0.02 + i * (2 * S + 24)
      nodos.push({ x: tx, y: genY[1], m: t }); hijosDeAbMat.push(tx)
    })
    if (madre) { nodos.push({ x: madreX, y: genY[1], m: madre }); hijosDeAbMat.push(madreX) }
    if (abMat || abMatP) fratria(abMatMid, genY[0], hijosDeAbMat, genY[1])

    const hijosDeAbPat: number[] = []
    if (padre) { nodos.push({ x: padreX, y: genY[1], m: padre }); hijosDeAbPat.push(padreX) }
    tiosPat.forEach((t, i) => {
      const tx = MARGEN_IZQ + anchoUtil * 0.82 + i * (2 * S + 24)
      nodos.push({ x: tx, y: genY[1], m: t }); hijosDeAbPat.push(tx)
    })
    if (abPat || abPatP) fratria(abPatMid, genY[0], hijosDeAbPat, genY[1])

    const parMid = (madre && padre) ? pareja(madreX, padreX, genY[1]) : (madre ? madreX : padreX)

    /* ═ GEN III — probando y hermanos ═ */
    const proband = find('proband')
    const hermanos = findAll(['brother', 'sister']).slice(0, 4)
    const hijos = findAll(['son', 'daughter']).slice(0, 5)

    /* la fratría se centra bajo los padres */
    const fratriaIII = [...hermanos, ...(proband ? [proband] : [])]
    const sepIII = 2 * S + 34
    const startIII = parMid - ((fratriaIII.length - 1) * sepIII) / 2
    const xsIII: number[] = []
    let probX = parMid
    fratriaIII.forEach((m, i) => {
      const x = startIII + i * sepIII
      xsIII.push(x)
      nodos.push({ x, y: genY[2], m })
      if (m.relationship === 'proband') probX = x
    })
    if (madre || padre) fratria(parMid, genY[1], xsIII, genY[2])

    /* ═ GEN IV — hijos del probando ═ */
    if (hijos.length && proband) {
      const spX = probX + (2 * S + 46)   // cónyuge siempre a la derecha
      nodos.push({ x: spX, y: genY[2], esConyuge: true })
      const pm = pareja(probX, spX, genY[2])
      const sepIV = 2 * S + 26
      const startIV = pm - ((hijos.length - 1) * sepIV) / 2
      const xsIV = hijos.map((_, i) => startIV + i * sepIV)
      hijos.forEach((h, i) => nodos.push({ x: xsIV[i], y: genY[3], m: h }))
      fratria(pm, genY[2], xsIV, genY[3])
    }

    /* ── pintar líneas ── */
    ctx.strokeStyle = LINE; ctx.lineWidth = 1.7
    lineas.forEach(([x1, y1, x2, y2]) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke() })

    /* ── pintar nodos ── */
    const etiquetas = (m: Member): string[] => {
      if (modo === 'vacio') return [nums.get(m.id) || '']
      const edad = edadDe(m)
      const apx = (m.isAlive ? m.birthApprox : m.deathApprox) ? '~' : ''
      const linea2 = edad != null ? `${apx}${edad} años${m.isAlive ? '' : ' †'}` : (m.isAlive ? '' : '†')
      if (modo === 'anonimo') return [nums.get(m.id) || '', linea2]
      const nom = m.firstName ? m.firstName.split(' ')[0] : (REL_ES[m.relationship] || '')
      return [nom, linea2]
    }

    nodos.forEach(n => {
      const male = n.esConyuge ? !isM(proband) : isM(n.m)
      const aff = n.m?.hasCardiacHistory === true
      const dead = n.m ? !n.m.isAlive : false
      const prob = n.m?.relationship === 'proband'
      const { x, y } = n

      if (aff || prob) {
        const g = ctx.createRadialGradient(x, y, 2, x, y, S * 2.2)
        g.addColorStop(0, aff ? 'rgba(192,57,43,0.16)' : 'rgba(124,58,30,0.18)')
        g.addColorStop(1, 'transparent')
        ctx.fillStyle = g; ctx.beginPath()
        male ? ctx.rect(x - S * 1.8, y - S * 1.8, S * 3.6, S * 3.6) : ctx.arc(x, y, S * 1.8, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.save()
      ctx.lineWidth = prob ? 2.6 : 1.8
      ctx.strokeStyle = aff ? AFF : prob ? '#7c3a1e' : EDGE
      ctx.fillStyle = aff ? '#fecaca' : prob ? '#fde8d8' : '#fdf6ee'
      if (n.esConyuge) { ctx.setLineDash([4, 3]); ctx.strokeStyle = '#9aa7b4' }
      ctx.beginPath()
      male ? ctx.rect(x - S, y - S, 2 * S, 2 * S) : ctx.arc(x, y, S, 0, Math.PI * 2)
      ctx.fill(); ctx.stroke(); ctx.setLineDash([])
      if (dead) {
        ctx.strokeStyle = '#374151'; ctx.lineWidth = 1.9
        ctx.beginPath(); ctx.moveTo(x - S - 6, y + S + 6); ctx.lineTo(x + S + 6, y - S - 6); ctx.stroke()
      }
      if (prob) {
        ctx.fillStyle = '#7c3a1e'; ctx.font = 'bold 17px serif'; ctx.textAlign = 'left'
        ctx.fillText('↗', x + S + 4, y + S + 4)
      }
      ctx.restore()

      ctx.textAlign = 'center'
      if (n.esConyuge) {
        if (modo === 'completo') {
          ctx.fillStyle = '#8b96a3'; ctx.font = 'italic 10px Georgia, serif'
          ctx.fillText('Cónyuge', x, y + S + 15)
        }
        return
      }
      if (!n.m) return
      const [l1, l2] = etiquetas(n.m)
      if (l1) {
        ctx.fillStyle = '#3b1f0e'; ctx.font = modo === 'completo' ? '10.5px Georgia, serif' : 'bold 11px Georgia, serif'
        ctx.fillText(l1.length > 14 ? l1.slice(0, 13) + '…' : l1, x, y + S + 15)
      }
      if (l2) {
        ctx.fillStyle = '#6b3a1e'; ctx.font = '9.5px Georgia, serif'
        ctx.fillText(l2, x, y + S + 27)
      }
    })

    /* ── leyenda ── */
    const LW = 168, LH = 132
    const lx = W - LW - 16, ly = H - LH - 14
    ctx.fillStyle = 'rgba(253,250,246,0.97)'; ctx.strokeStyle = 'rgba(139,90,60,0.3)'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.roundRect(lx, ly, LW, LH, 7); ctx.fill(); ctx.stroke()
    ctx.fillStyle = '#3b1f0e'; ctx.font = 'bold 9.5px Georgia, serif'; ctx.textAlign = 'left'
    ctx.fillText('CONVENCIONES', lx + 12, ly + 18)
    const items: any[] = [
      { t: 'sq', f: '#fdf6ee', s: EDGE, txt: 'Hombre' },
      { t: 'ci', f: '#fdf6ee', s: EDGE, txt: 'Mujer' },
      { t: 'sq', f: '#fecaca', s: AFF, txt: 'Antecedente cardiaco' },
      { t: 'dead', txt: 'Fallecido/a' },
      { t: 'prob', txt: 'Paciente índice' },
    ]
    items.forEach((it, i) => {
      const yy = ly + 36 + i * 19, xx = lx + 19
      ctx.lineWidth = 1.2
      if (it.t === 'dead') {
        ctx.strokeStyle = EDGE; ctx.fillStyle = '#fdf6ee'
        ctx.beginPath(); ctx.rect(xx - 6, yy - 6, 12, 12); ctx.fill(); ctx.stroke()
        ctx.strokeStyle = '#374151'; ctx.beginPath(); ctx.moveTo(xx - 9, yy + 9); ctx.lineTo(xx + 9, yy - 9); ctx.stroke()
      } else if (it.t === 'prob') {
        ctx.strokeStyle = '#7c3a1e'; ctx.fillStyle = '#fde8d8'
        ctx.beginPath(); ctx.rect(xx - 6, yy - 6, 12, 12); ctx.fill(); ctx.stroke()
        ctx.fillStyle = '#7c3a1e'; ctx.font = 'bold 10px serif'; ctx.textAlign = 'left'
        ctx.fillText('↗', xx + 7, yy + 8)
      } else if (it.t === 'sq') {
        ctx.strokeStyle = it.s; ctx.fillStyle = it.f
        ctx.beginPath(); ctx.rect(xx - 6, yy - 6, 12, 12); ctx.fill(); ctx.stroke()
      } else {
        ctx.strokeStyle = it.s; ctx.fillStyle = it.f
        ctx.beginPath(); ctx.arc(xx, yy, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      }
      ctx.fillStyle = '#3b1f0e'; ctx.font = '9px Georgia, serif'; ctx.textAlign = 'left'
      ctx.fillText(it.txt, xx + 20, yy + 3.5)
    })

    /* ── título ── */
    ctx.textAlign = 'center'; ctx.fillStyle = '#3b1f0e'
    ctx.font = 'italic bold 13px Georgia, serif'
    const titulo = modo === 'completo'
      ? `Pedigrí Familiar — ${patient?.firstName || ''} ${patient?.lastName || ''}`.trim()
      : 'Pedigrí Familiar'
    ctx.fillText(titulo, W / 2, 32)
    if (modo !== 'completo') {
      ctx.fillStyle = 'rgba(92,51,23,0.55)'; ctx.font = 'italic 9.5px Georgia, serif'
      ctx.fillText('Datos anonimizados — numeración estándar de pedigrí', W / 2, 48)
    }
    if (members.some(m => m.birthApprox || m.deathApprox) && modo !== 'vacio') {
      ctx.fillStyle = 'rgba(92,51,23,0.5)'; ctx.font = 'italic 9px Georgia, serif'; ctx.textAlign = 'left'
      ctx.fillText('~ edad aproximada', 14, H - 16)
    }
  }, [tree, patient, modo, numeracion])

  useEffect(() => { draw() }, [draw])

  const descargar = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const sufijo = modo === 'completo' ? 'completo' : modo === 'anonimo' ? 'anonimizado' : 'sin-datos'
    const base = modo === 'completo' ? (patient?.lastName || 'paciente') : 'pedigri'
    const a = document.createElement('a')
    a.download = `pedigri-${base}-${sufijo}.png`
    a.href = canvas.toDataURL('image/png')
    a.click()
  }

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center' }}><span className="spinner" /></div>
  if (error) return (
    <div style={{ padding: 40 }}>
      <div className="alert alert-warning">
        Aún no se ha generado el pedigrí de este paciente. Revise una encuesta completada y pulse "Generar pedigrí".
      </div>
      <Link to={`/patients/${id}`} className="btn btn-secondary" style={{ marginTop: 14 }}>← Volver al paciente</Link>
    </div>
  )

  const members: Member[] = tree?.members || []
  const afectados = members.filter(m => m.hasCardiacHistory)
  const nums = numeracion(members)

  const MODOS: { id: Modo; label: string; desc: string }[] = [
    { id: 'completo', label: 'Completo', desc: 'Nombres y edades — para la historia clínica' },
    { id: 'anonimo', label: 'Anonimizado', desc: 'Numeración y edades — para presentaciones y publicaciones' },
    { id: 'vacio', label: 'Sin datos', desc: 'Solo símbolos y numeración — para docencia' },
  ]

  return (
    <div style={{ padding: '28px 30px' }}>
      <Link to={`/patients/${id}`} style={{ color: 'var(--gray-400)', fontSize: 13, textDecoration: 'none' }}>
        ← Volver al paciente
      </Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', margin: '10px 0 18px', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ marginBottom: 3 }}>Pedigrí familiar</h1>
          <p style={{ color: 'var(--gray-500)', fontSize: 13 }}>
            {patient?.firstName} {patient?.lastName} · {members.length} miembros
            {tree?.updatedAt && ` · Actualizado ${new Date(tree.updatedAt).toLocaleDateString('es-CO')}`}
          </p>
        </div>
        <button className="btn btn-primary" onClick={descargar}>⤓ Descargar imagen</button>
      </div>

      {/* Selector de modo */}
      <div className="card" style={{ padding: '14px 16px', marginBottom: 14 }}>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 9 }}>
          Modo de visualización y exportación
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {MODOS.map(m => (
            <button key={m.id} onClick={() => setModo(m.id)}
              title={m.desc}
              style={{
                padding: '7px 14px', borderRadius: 7, cursor: 'pointer', fontSize: 13,
                fontFamily: 'var(--font-sans)',
                border: `1px solid ${modo === m.id ? 'var(--lineage-600)' : 'var(--gray-300)'}`,
                background: modo === m.id ? 'var(--lineage-50)' : 'white',
                color: modo === m.id ? 'var(--lineage-700)' : 'var(--gray-600)',
                fontWeight: modo === m.id ? 600 : 400,
              }}>
              {m.label}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 9 }}>
          {MODOS.find(m => m.id === modo)?.desc}
        </p>
        {modo !== 'completo' && (
          <div className="alert alert-info" style={{ marginTop: 10, padding: '9px 12px', fontSize: 12 }}>
            Los nombres se sustituyen por la numeración estándar de pedigrí (I-1, II-2, III-1…), que mantiene la
            trazabilidad interna sin exponer identidades.
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 14, marginBottom: 16 }}>
        <canvas ref={canvasRef} width={980} height={600}
          style={{ width: '100%', borderRadius: 8, border: '1px solid var(--gray-200)', display: 'block' }} />
      </div>

      <div className="card">
        <div className="card-header"><h3>Familiares con antecedente cardiaco ({afectados.length})</h3></div>
        {afectados.length === 0
          ? <p style={{ color: 'var(--gray-400)', fontSize: 13 }}>No se registraron antecedentes cardiacos en la familia.</p>
          : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>N.º</th><th>Familiar</th><th>Parentesco</th><th>Estado</th><th>Descripción</th></tr></thead>
                <tbody>
                  {afectados.map(m => {
                    const edad = edadDe(m)
                    const apx = (m.isAlive ? m.birthApprox : m.deathApprox) ? '~' : ''
                    return (
                      <tr key={m.id}>
                        <td style={{ color: 'var(--gray-500)', fontSize: 12 }}>{nums.get(m.id)}</td>
                        <td style={{ fontWeight: 500 }}>{m.firstName || '—'}</td>
                        <td style={{ color: 'var(--gray-600)' }}>{REL_ES[m.relationship] || m.relationship}</td>
                        <td>
                          {m.isAlive
                            ? <span className="badge badge-green">Vivo/a{edad != null ? ` · ${apx}${edad} a` : ''}</span>
                            : <span className="badge badge-gray">Fallecido/a{edad != null ? ` · ${apx}${edad} a` : ''}</span>}
                        </td>
                        <td style={{ fontSize: 12.5, color: 'var(--gray-600)' }}>{m.cardiacDescription || m.causeOfDeath || '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
      </div>
    </div>
  )
}
