import { useEffect, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'

/* ═══════════════════════════════════════════════════════════
   PEDIGRÍ FAMILIAR — vista clínica
   Ruta: /patients/:id/pedigree
   ═══════════════════════════════════════════════════════════ */

type Member = {
  id: string
  relationship: string
  firstName?: string
  lastName?: string
  sex: string
  dateOfBirth?: string
  isAlive: boolean
  ageAtDeath?: number
  causeOfDeath?: string
  hasCardiacHistory: boolean
  cardiacDescription?: string
  generation: number
}

const REL_ES: Record<string, string> = {
  proband: 'Paciente índice', mother: 'Madre', father: 'Padre',
  son: 'Hijo', daughter: 'Hija', brother: 'Hermano', sister: 'Hermana',
  mat_grandmother: 'Abuela materna', mat_grandfather: 'Abuelo materno',
  pat_grandmother: 'Abuela paterna', pat_grandfather: 'Abuelo paterno',
  mat_uncle: 'Tío materno', mat_aunt: 'Tía materna',
  pat_uncle: 'Tío paterno', pat_aunt: 'Tía paterna',
}

const firstName = (m: Member) => m.firstName ? m.firstName.split(' ')[0] : (REL_ES[m.relationship] || '')
const birthYear = (d?: string) => d ? new Date(d).getFullYear().toString() : ''

export function PedigreePage() {
  const { id } = useParams<{ id: string }>()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const { data: tree, isLoading, error } = useQuery({
    queryKey: ['pedigree', id],
    queryFn: () => api.get(`/pedigree/patient/${id}`).then(r => r.data),
  })

  const { data: patient } = useQuery({
    queryKey: ['patient', id],
    queryFn: () => api.get(`/patients/${id}`).then(r => r.data),
  })

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !tree) return
    const ctx = canvas.getContext('2d')!
    const W = canvas.width, H = canvas.height
    const members: Member[] = tree.members || []

    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = '#faf7f2'; ctx.fillRect(0, 0, W, H)
    ctx.strokeStyle = 'rgba(139,90,60,0.05)'; ctx.lineWidth = 1
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }

    const S = 20, EDGE = '#2c3e50', AFF = '#c0392b', LINE = '#8b5e3c'

    const node = (x: number, y: number, male: boolean, aff: boolean, dead: boolean, proband: boolean, l1: string, l2: string) => {
      if (aff || proband) {
        const g = ctx.createRadialGradient(x, y, 2, x, y, S * 2.2)
        g.addColorStop(0, aff ? 'rgba(192,57,43,0.16)' : 'rgba(124,58,30,0.18)')
        g.addColorStop(1, 'transparent')
        ctx.fillStyle = g; ctx.beginPath()
        male ? ctx.rect(x - S * 1.8, y - S * 1.8, S * 3.6, S * 3.6) : ctx.arc(x, y, S * 1.8, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.save()
      ctx.lineWidth = proband ? 2.5 : 1.8
      ctx.strokeStyle = aff ? AFF : proband ? '#7c3a1e' : EDGE
      ctx.fillStyle = aff ? '#fecaca' : proband ? '#fde8d8' : '#fdf6ee'
      ctx.beginPath()
      male ? ctx.rect(x - S, y - S, 2 * S, 2 * S) : ctx.arc(x, y, S, 0, Math.PI * 2)
      ctx.fill(); ctx.stroke()
      if (dead) {
        ctx.strokeStyle = '#374151'; ctx.lineWidth = 1.8
        ctx.beginPath(); ctx.moveTo(x - S - 5, y + S + 5); ctx.lineTo(x + S + 5, y - S - 5); ctx.stroke()
      }
      if (proband) {
        ctx.fillStyle = '#7c3a1e'; ctx.font = 'bold 17px serif'; ctx.textAlign = 'left'
        ctx.fillText('↗', x + S + 2, y + 5)
      }
      ctx.restore()
      ctx.textAlign = 'center'; ctx.fillStyle = '#3b1f0e'
      if (l1) { ctx.font = '10px Georgia, serif'; ctx.fillText(l1.length > 13 ? l1.slice(0, 12) + '…' : l1, x, y + S + 14) }
      if (l2) { ctx.font = '9px Georgia, serif'; ctx.fillStyle = '#6b3a1e'; ctx.fillText(l2, x, y + S + 25) }
    }
    const ln = (x1: number, y1: number, x2: number, y2: number) => {
      ctx.save(); ctx.strokeStyle = LINE; ctx.lineWidth = 1.6
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore()
    }
    const couple = (x1: number, x2: number, y: number) => { ln(x1 + S, y, x2 - S, y); return (x1 + x2) / 2 }
    const drop = (mx: number, my: number, xs: number[], yc: number) => {
      const ym = my + (yc - my) * 0.45
      ln(mx, my, mx, ym)
      if (xs.length) ln(Math.min(...xs, mx), ym, Math.max(...xs, mx), ym)
      xs.forEach(x => ln(x, ym, x, yc - S))
    }

    const find = (rel: string) => members.find(m => m.relationship === rel)
    const findAll = (rels: string[]) => members.filter(m => rels.includes(m.relationship))
    const isM = (m?: Member) => m?.sex === 'MALE'

    const genY = [70, 190, 315, 440]
    ;['Generación III — Abuelos', 'Generación II — Padres/Tíos', 'Generación I — Paciente/Hermanos', 'Generación 0 — Hijos']
      .forEach((g, i) => {
        ctx.fillStyle = 'rgba(92,51,23,0.3)'; ctx.font = 'italic 9.5px Georgia, serif'; ctx.textAlign = 'left'
        ctx.fillText(g, 6, genY[i] + 4)
      })

    // Abuelos
    const abMatX1 = W * 0.17, abMatX2 = W * 0.29, abPatX1 = W * 0.60, abPatX2 = W * 0.72
    const abMat = find('mat_grandmother'), abMatP = find('mat_grandfather')
    const abPat = find('pat_grandmother'), abPatP = find('pat_grandfather')
    if (abMat) node(abMatX1, genY[0], false, abMat.hasCardiacHistory, !abMat.isAlive, false, firstName(abMat), birthYear(abMat.dateOfBirth) && `*${birthYear(abMat.dateOfBirth)}`)
    if (abMatP) node(abMatX2, genY[0], true, abMatP.hasCardiacHistory, !abMatP.isAlive, false, firstName(abMatP), '')
    if (abMat && abMatP) couple(abMatX1, abMatX2, genY[0])
    if (abPat) node(abPatX1, genY[0], false, abPat.hasCardiacHistory, !abPat.isAlive, false, firstName(abPat), '')
    if (abPatP) node(abPatX2, genY[0], true, abPatP.hasCardiacHistory, !abPatP.isAlive, false, firstName(abPatP), '')
    if (abPat && abPatP) couple(abPatX1, abPatX2, genY[0])

    // Padres
    const madre = find('mother'), padre = find('father')
    const madreX = W * 0.36, padreX = W * 0.52
    const abMatMid = (abMatX1 + abMatX2) / 2, abPatMid = (abPatX1 + abPatX2) / 2
    if (madre) {
      node(madreX, genY[1], false, madre.hasCardiacHistory, !madre.isAlive, false, firstName(madre), birthYear(madre.dateOfBirth) && `*${birthYear(madre.dateOfBirth)}`)
      if (abMat || abMatP) drop(abMatMid, genY[0] + S, [madreX], genY[1])
    }
    if (padre) {
      node(padreX, genY[1], true, padre.hasCardiacHistory, !padre.isAlive, false, firstName(padre), birthYear(padre.dateOfBirth) && `*${birthYear(padre.dateOfBirth)}`)
      if (abPat || abPatP) drop(abPatMid, genY[0] + S, [padreX], genY[1])
    }
    const parMid = (madre && padre) ? couple(madreX, padreX, genY[1]) : (madre ? madreX : padreX)

    // Tíos
    findAll(['mat_uncle', 'mat_aunt']).slice(0, 2).forEach((t, i) => {
      const tx = W * 0.06 + i * (2 * S + 18)
      node(tx, genY[1], isM(t), t.hasCardiacHistory, !t.isAlive, false, firstName(t), '')
      if (abMat || abMatP) drop(abMatMid, genY[0] + S, [tx], genY[1])
    })
    findAll(['pat_uncle', 'pat_aunt']).slice(0, 2).forEach((t, i) => {
      const tx = W * 0.78 + i * (2 * S + 18)
      node(tx, genY[1], isM(t), t.hasCardiacHistory, !t.isAlive, false, firstName(t), '')
      if (abPat || abPatP) drop(abPatMid, genY[0] + S, [tx], genY[1])
    })

    // Probando + hermanos
    const proband = find('proband')
    const probX = W * 0.46
    const hermanos = findAll(['brother', 'sister']).slice(0, 3)
    if (proband) {
      node(probX, genY[2], isM(proband), proband.hasCardiacHistory, !proband.isAlive, true, firstName(proband), birthYear(proband.dateOfBirth) && `*${birthYear(proband.dateOfBirth)}`)
      if (madre || padre) drop(parMid, genY[1] + S, [probX], genY[2])
    }
    hermanos.forEach((h, i) => {
      const hx = W * 0.08 + i * (2 * S + 22)
      node(hx, genY[2], isM(h), h.hasCardiacHistory, !h.isAlive, false, firstName(h), '')
      if (madre || padre) drop(parMid, genY[1] + S, [hx], genY[2])
    })

    // Hijos
    const hijos = findAll(['son', 'daughter']).slice(0, 5)
    if (hijos.length && proband) {
      const spX = probX + (isM(proband) ? 70 : -70)
      node(spX, genY[2], !isM(proband), false, false, false, 'Cónyuge', '')
      const pm = couple(Math.min(probX, spX), Math.max(probX, spX), genY[2])
      const startX = pm - ((hijos.length - 1) * (2 * S + 16)) / 2
      const xs = hijos.map((_, i) => startX + i * (2 * S + 16))
      hijos.forEach((h, i) => node(xs[i], genY[3], isM(h), h.hasCardiacHistory, !h.isAlive, false, firstName(h), ''))
      drop(pm, genY[2] + S, xs, genY[3])
    }

    // Leyenda
    const lx = W - 155, ly = H - 132
    ctx.fillStyle = 'rgba(250,247,242,0.96)'; ctx.strokeStyle = 'rgba(139,90,60,0.25)'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.roundRect(lx - 10, ly - 10, 150, 128, 6); ctx.fill(); ctx.stroke()
    ctx.fillStyle = '#3b1f0e'; ctx.font = 'bold 9.5px Georgia, serif'; ctx.textAlign = 'left'
    ctx.fillText('CONVENCIONES', lx, ly + 3)
    const items: any[] = [
      { sq: true, f: '#fdf6ee', s: EDGE, t: 'Hombre sano' },
      { sq: false, f: '#fdf6ee', s: EDGE, t: 'Mujer sana' },
      { sq: true, f: '#fecaca', s: AFF, t: 'Antecedente cardiaco' },
      { dead: true, t: 'Fallecido/a' },
      { prob: true, t: 'Paciente índice' },
    ]
    items.forEach((it, i) => {
      const yy = ly + 18 + i * 21, xx = lx
      if (it.dead) {
        ctx.strokeStyle = EDGE; ctx.fillStyle = '#fdf6ee'; ctx.lineWidth = 1.2
        ctx.beginPath(); ctx.rect(xx - 6, yy - 6, 12, 12); ctx.fill(); ctx.stroke()
        ctx.strokeStyle = '#374151'; ctx.beginPath(); ctx.moveTo(xx - 9, yy + 9); ctx.lineTo(xx + 9, yy - 9); ctx.stroke()
      } else if (it.prob) {
        ctx.strokeStyle = '#7c3a1e'; ctx.fillStyle = '#fde8d8'; ctx.lineWidth = 1.2
        ctx.beginPath(); ctx.rect(xx - 6, yy - 6, 12, 12); ctx.fill(); ctx.stroke()
        ctx.fillStyle = '#7c3a1e'; ctx.font = 'bold 11px serif'; ctx.fillText('↗', xx + 8, yy + 4)
      } else if (it.sq) {
        ctx.strokeStyle = it.s; ctx.fillStyle = it.f; ctx.lineWidth = 1.2
        ctx.beginPath(); ctx.rect(xx - 6, yy - 6, 12, 12); ctx.fill(); ctx.stroke()
      } else {
        ctx.strokeStyle = it.s; ctx.fillStyle = it.f; ctx.lineWidth = 1.2
        ctx.beginPath(); ctx.arc(xx, yy, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      }
      ctx.fillStyle = '#3b1f0e'; ctx.font = '9px Georgia, serif'; ctx.textAlign = 'left'
      ctx.fillText(it.t, xx + 16, yy + 3)
    })

    // Título
    ctx.fillStyle = '#3b1f0e'; ctx.font = 'italic bold 12px Georgia, serif'; ctx.textAlign = 'center'
    ctx.fillText(`Pedigrí Familiar — ${patient?.firstName || ''} ${patient?.lastName || ''}`, W / 2, 26)
  }, [tree, patient])

  useEffect(() => { draw() }, [draw])

  const descargar = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const a = document.createElement('a')
    a.download = `pedigri-${patient?.lastName || 'paciente'}.png`
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

  return (
    <div style={{ padding: '28px 30px' }}>
      <Link to={`/patients/${id}`} style={{ color: 'var(--gray-400)', fontSize: 13, textDecoration: 'none' }}>
        ← Volver al paciente
      </Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', margin: '10px 0 20px', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ marginBottom: 3 }}>Pedigrí familiar</h1>
          <p style={{ color: 'var(--gray-500)', fontSize: 13 }}>
            {patient?.firstName} {patient?.lastName} · {members.length} miembros · Actualizado {tree?.updatedAt ? new Date(tree.updatedAt).toLocaleDateString('es-CO') : '—'}
          </p>
        </div>
        <button className="btn btn-secondary" onClick={descargar}>⤓ Descargar imagen</button>
      </div>

      <div className="card" style={{ padding: 14, marginBottom: 16 }}>
        <canvas ref={canvasRef} width={900} height={560}
          style={{ width: '100%', borderRadius: 8, border: '1px solid var(--gray-200)', display: 'block' }} />
      </div>

      <div className="card">
        <div className="card-header"><h3>Familiares con antecedente cardiaco ({afectados.length})</h3></div>
        {afectados.length === 0
          ? <p style={{ color: 'var(--gray-400)', fontSize: 13 }}>No se registraron antecedentes cardiacos en la familia.</p>
          : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Familiar</th><th>Parentesco</th><th>Estado</th><th>Descripción</th></tr></thead>
                <tbody>
                  {afectados.map(m => (
                    <tr key={m.id}>
                      <td style={{ fontWeight: 500 }}>{m.firstName || '—'}</td>
                      <td style={{ color: 'var(--gray-600)' }}>{REL_ES[m.relationship] || m.relationship}</td>
                      <td>{m.isAlive ? <span className="badge badge-green">Vivo/a</span> : <span className="badge badge-gray">Fallecido/a{m.ageAtDeath ? ` a los ${m.ageAtDeath}` : ''}</span>}</td>
                      <td style={{ fontSize: 12.5, color: 'var(--gray-600)' }}>{m.cardiacDescription || m.causeOfDeath || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>
    </div>
  )
}
