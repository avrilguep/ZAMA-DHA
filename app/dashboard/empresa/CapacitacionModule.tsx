'use client'

import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import {
  collection, query, where, getDocs,
  addDoc, updateDoc, deleteDoc, doc
} from 'firebase/firestore'

interface Props {
  empresaId: string
  empleados: any[]
}

const ESTADOS = ['Programado', 'En curso', 'Finalizado']
const MODALIDADES = ['Presencial', 'Virtual', 'Híbrida']

const formVacio = {
  nombre: '',
  objetivo: '',
  instructor: '',
  fecha: '',
  horaInicio: '',
  horaFin: '',
  duracion: '',
  modalidad: 'Presencial',
  departamento: '',
  cupo: '',
  estado: 'Programado',
  costo_instructor: '',
  costo_material: '',
  costo_transporte: '',
  costo_plataforma: '',
  costo_viaticos: '',
  costo_otros: '',
}

export default function CapacitacionModule({ empresaId, empleados }: Props) {
  const [subseccion, setSubseccion] = useState<'programa' | 'ausentes' | 'indicadores' | 'presupuesto'>('programa')
  const [capacitaciones, setCapacitaciones] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState<string | null>(null)
  const [form, setForm] = useState(formVacio)
  const [guardando, setGuardando] = useState(false)
  const [presupuesto, setPresupuesto] = useState<any>(null)
  const [asistencias, setAsistencias] = useState<any[]>([])

  async function cargarDatos() {
    setLoading(true)
    const q = query(collection(db, 'capacitaciones'), where('empresa_id', '==', empresaId))
    const snap = await getDocs(q)
    setCapacitaciones(snap.docs.map(d => ({ id: d.id, ...d.data() })))

    const presQ = query(collection(db, 'presupuesto_capacitacion'), where('empresa_id', '==', empresaId))
    const presSnap = await getDocs(presQ)
    if (!presSnap.empty) setPresupuesto({ id: presSnap.docs[0].id, ...presSnap.docs[0].data() })

    const asigQ = query(collection(db, 'asistencias_capacitacion'), where('empresa_id', '==', empresaId))
    const asigSnap = await getDocs(asigQ)
    setAsistencias(asigSnap.docs.map(d => ({ id: d.id, ...d.data() })))

    setLoading(false)
  }

  useEffect(() => { cargarDatos() }, [])

  function actualizar(campo: string, valor: string) {
    setForm(prev => ({ ...prev, [campo]: valor }))
  }

  async function guardarCapacitacion() {
    if (!form.nombre || !form.fecha || !form.instructor) return
    setGuardando(true)

    const costoTotal = [
      form.costo_instructor, form.costo_material, form.costo_transporte,
      form.costo_plataforma, form.costo_viaticos, form.costo_otros
    ].reduce((acc, val) => acc + (parseFloat(val) || 0), 0)

    const datos = { ...form, empresa_id: empresaId, costo_total: costoTotal, creado_at: new Date() }

    if (editando) {
      await updateDoc(doc(db, 'capacitaciones', editando), datos)
    } else {
      await addDoc(collection(db, 'capacitaciones'), datos)

      // Descontar del presupuesto si existe
      if (presupuesto && costoTotal > 0) {
        await updateDoc(doc(db, 'presupuesto_capacitacion', presupuesto.id), {
          utilizado: (presupuesto.utilizado || 0) + costoTotal,
          disponible: (presupuesto.disponible || 0) - costoTotal
        })
      }
    }

    setForm(formVacio)
    setMostrarForm(false)
    setEditando(null)
    await cargarDatos()
    setGuardando(false)
  }

  async function eliminarCapacitacion(id: string) {
    if (!confirm('¿Eliminar esta capacitación?')) return
    await deleteDoc(doc(db, 'capacitaciones', id))
    await cargarDatos()
  }

  function editarCapacitacion(cap: any) {
    setForm({
      nombre: cap.nombre || '',
      objetivo: cap.objetivo || '',
      instructor: cap.instructor || '',
      fecha: cap.fecha || '',
      horaInicio: cap.horaInicio || '',
      horaFin: cap.horaFin || '',
      duracion: cap.duracion || '',
      modalidad: cap.modalidad || 'Presencial',
      departamento: cap.departamento || '',
      cupo: cap.cupo || '',
      estado: cap.estado || 'Programado',
      costo_instructor: cap.costo_instructor || '',
      costo_material: cap.costo_material || '',
      costo_transporte: cap.costo_transporte || '',
      costo_plataforma: cap.costo_plataforma || '',
      costo_viaticos: cap.costo_viaticos || '',
      costo_otros: cap.costo_otros || '',
    })
    setEditando(cap.id)
    setMostrarForm(true)
  }

  // Calcular indicadores
  const totalHorasHombre = capacitaciones.reduce((acc, cap) => {
    const asistentes = asistencias.filter(a => a.capacitacion_id === cap.id && a.asistio).length
    return acc + (asistentes * (parseFloat(cap.duracion) || 0))
  }, 0)

  const capacitacionesPorMes = capacitaciones.reduce((acc: any, cap) => {
    if (!cap.fecha) return acc
    const mes = cap.fecha.substring(0, 7)
    if (!acc[mes]) acc[mes] = { horas: 0, count: 0 }
    acc[mes].horas += parseFloat(cap.duracion) || 0
    acc[mes].count++
    return acc
  }, {})

  const input = (label: string, key: string, tipo = 'text', placeholder = '') => (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      <input
        type={tipo}
        value={form[key as keyof typeof form]}
        onChange={e => actualizar(key, e.target.value)}
        placeholder={placeholder}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )

  if (loading) return <p className="text-gray-400 text-sm">Cargando...</p>

  return (
    <div className="flex flex-col gap-6" >
      {/* Subtabs */}
      <div className="flex gap-2 flex-wrap">
        {([
          { key: 'programa', label: 'Programa' },
          { key: 'ausentes', label: 'Ausentes' },
          { key: 'indicadores', label: 'Indicadores' },
          { key: 'presupuesto', label: 'Presupuesto' },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setSubseccion(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              subseccion === tab.key
                ? 'bg-blue-100 text-blue-700'
                : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* PROGRAMA */}
      {subseccion === 'programa' && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-800">Programa de capacitación</h3>
            <button
              onClick={() => { setMostrarForm(!mostrarForm); setEditando(null); setForm(formVacio) }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
            >
              + Agregar curso
            </button>
          </div>

          {mostrarForm && (
            <div className="bg-white rounded-xl border border-blue-200 p-5 flex flex-col gap-4">
              <p className="font-medium text-gray-800">{editando ? 'Editar' : 'Nuevo'} curso de capacitación</p>

              <div className="grid grid-cols-2 gap-3">
                {input('Nombre del curso *', 'nombre', 'text', 'Ej. Seguridad industrial')}
                {input('Instructor *', 'instructor', 'text', 'Nombre del instructor')}
                {input('Fecha *', 'fecha', 'date')}
                {input('Hora inicio', 'horaInicio', 'time')}
                {input('Hora fin', 'horaFin', 'time')}
                {input('Duración (horas)', 'duracion', 'number', 'Ej. 4')}
                {input('Departamento', 'departamento', 'text', 'Ej. Producción')}
                {input('Cupo máximo', 'cupo', 'number', 'Ej. 30')}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Objetivo</label>
                <textarea
                  value={form.objetivo}
                  onChange={e => actualizar('objetivo', e.target.value)}
                  placeholder="Objetivo del curso"
                  rows={2}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">Modalidad</label>
                  <select
                    value={form.modalidad}
                    onChange={e => actualizar('modalidad', e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {MODALIDADES.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">Estado</label>
                  <select
                    value={form.estado}
                    onChange={e => actualizar('estado', e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {ESTADOS.map(e => <option key={e}>{e}</option>)}
                  </select>
                </div>
              </div>

              {/* Costos */}
              <div className="border-t border-gray-100 pt-3">
                <p className="text-xs font-medium text-gray-600 mb-3">Costos (MXN)</p>
                <div className="grid grid-cols-3 gap-3">
                  {input('Instructor', 'costo_instructor', 'number', '0')}
                  {input('Material', 'costo_material', 'number', '0')}
                  {input('Transporte', 'costo_transporte', 'number', '0')}
                  {input('Plataforma', 'costo_plataforma', 'number', '0')}
                  {input('Viáticos', 'costo_viaticos', 'number', '0')}
                  {input('Otros', 'costo_otros', 'number', '0')}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={guardarCapacitacion}
                  disabled={guardando || !form.nombre || !form.fecha || !form.instructor}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {guardando ? 'Guardando...' : editando ? 'Actualizar' : 'Guardar'}
                </button>
                <button
                  onClick={() => { setMostrarForm(false); setEditando(null); setForm(formVacio) }}
                  className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 transition"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {capacitaciones.length === 0 ? (
            <div className="bg-white rounded-xl p-8 border border-gray-200 text-center">
              <p className="text-gray-400 text-sm">No hay capacitaciones registradas</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {capacitaciones.map(cap => (
                <div key={cap.id} className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col gap-1">
                      <p className="font-medium text-gray-800">{cap.nombre}</p>
                      <p className="text-sm text-gray-500">
                        {cap.instructor} · {cap.fecha} · {cap.duracion}h · {cap.modalidad}
                      </p>
                      {cap.departamento && (
                        <p className="text-xs text-gray-400">Departamento: {cap.departamento}</p>
                      )}
                      {cap.objetivo && (
                        <p className="text-xs text-gray-400 mt-1">{cap.objetivo}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        cap.estado === 'Finalizado' ? 'bg-green-100 text-green-700'
                        : cap.estado === 'En curso' ? 'bg-blue-100 text-blue-700'
                        : 'bg-amber-100 text-amber-700'
                      }`}>
                        {cap.estado}
                      </span>
                      <button
                        onClick={() => editarCapacitacion(cap)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => eliminarCapacitacion(cap.id)}
                        className="text-xs text-red-400 hover:underline"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                  {cap.costo_total > 0 && (
                    <p className="text-xs text-gray-400 mt-2">
                      Costo total: ${cap.costo_total.toLocaleString('es-MX')} MXN
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AUSENTES */}
      {subseccion === 'ausentes' && (
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-semibold text-gray-800">Lista de ausentes</h3>
          {capacitaciones.filter(c => c.estado === 'Finalizado').length === 0 ? (
            <div className="bg-white rounded-xl p-8 border border-gray-200 text-center">
              <p className="text-gray-400 text-sm">No hay capacitaciones finalizadas aún</p>
            </div>
          ) : (
            capacitaciones.filter(c => c.estado === 'Finalizado').map(cap => {
              const ausentes = asistencias.filter(a => a.capacitacion_id === cap.id && !a.asistio)
              return (
                <div key={cap.id} className="bg-white rounded-xl border border-gray-200 p-5">
                  <p className="font-medium text-gray-800 mb-3">{cap.nombre} — {cap.fecha}</p>
                  {ausentes.length === 0 ? (
                    <p className="text-sm text-green-600">Todos asistieron</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {ausentes.map(a => (
                        <div key={a.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2">
                          <div>
                            <p className="text-sm text-gray-700">{a.empleado_nombre}</p>
                            <p className="text-xs text-gray-400">{a.departamento} · {a.motivo || 'Sin motivo'}</p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            a.estado_ausencia === 'Justificada' ? 'bg-green-100 text-green-700'
                            : a.estado_ausencia === 'Reprogramada' ? 'bg-blue-100 text-blue-700'
                            : 'bg-amber-100 text-amber-700'
                          }`}>
                            {a.estado_ausencia || 'Pendiente'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {/* INDICADORES */}
      {subseccion === 'indicadores' && (
        <div className="flex flex-col gap-6">
          <h3 className="text-lg font-semibold text-gray-800">Indicadores</h3>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-5 border border-gray-200">
              <p className="text-sm text-gray-500">Total Horas Hombre</p>
              <p className="text-3xl font-semibold text-blue-600 mt-1">{totalHorasHombre}</p>
              <p className="text-xs text-gray-400 mt-1">Asistentes × horas del curso</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-gray-200">
              <p className="text-sm text-gray-500">Capacitaciones programadas</p>
              <p className="text-3xl font-semibold text-gray-800 mt-1">{capacitaciones.length}</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-gray-200">
              <p className="text-sm text-gray-500">Finalizadas</p>
              <p className="text-3xl font-semibold text-green-600 mt-1">
                {capacitaciones.filter(c => c.estado === 'Finalizado').length}
              </p>
            </div>
          </div>

          {/* Horas por mes */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="font-medium text-gray-800 mb-4">Horas capacitadas por mes</p>
            {Object.keys(capacitacionesPorMes).length === 0 ? (
              <p className="text-sm text-gray-400">Sin datos aún</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-100">
                    <th className="pb-2">Mes</th>
                    <th className="pb-2">Cursos</th>
                    <th className="pb-2">Horas</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(capacitacionesPorMes).map(([mes, data]: any) => (
                    <tr key={mes} className="border-b border-gray-50">
                      <td className="py-2">{mes}</td>
                      <td className="py-2">{data.count}</td>
                      <td className="py-2 font-medium text-blue-600">{data.horas}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Avance general */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="font-medium text-gray-800 mb-4">Avance del plan anual</p>
            {(() => {
              const total = capacitaciones.length
              const realizadas = capacitaciones.filter(c => c.estado === 'Finalizado').length
              const pct = total > 0 ? Math.round((realizadas / total) * 100) : 0
              return (
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Programadas: {total}</span>
                    <span>Realizadas: {realizadas}</span>
                    <span>Pendientes: {total - realizadas}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-4">
                    <div
                      className="bg-blue-600 h-4 rounded-full transition-all flex items-center justify-end pr-2"
                      style={{ width: `${pct}%` }}
                    >
                      {pct > 10 && <span className="text-white text-xs font-medium">{pct}%</span>}
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* PRESUPUESTO */}
      {subseccion === 'presupuesto' && (
        <PresupuestoSection
          empresaId={empresaId}
          capacitaciones={capacitaciones}
          presupuesto={presupuesto}
          onActualizar={cargarDatos}
        />
      )}
    </div>
  )
}

function PresupuestoSection({ empresaId, capacitaciones, presupuesto, onActualizar }: any) {
  const [monto, setMonto] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function guardarPresupuesto() {
    if (!monto) return
    setGuardando(true)
    const autorizado = parseFloat(monto)
    const utilizado = capacitaciones.reduce((acc: number, cap: any) => acc + (cap.costo_total || 0), 0)

    if (presupuesto) {
      await updateDoc(doc(db, 'presupuesto_capacitacion', presupuesto.id), {
        autorizado,
        utilizado,
        disponible: autorizado - utilizado
      })
    } else {
      await addDoc(collection(db, 'presupuesto_capacitacion'), {
        empresa_id: empresaId,
        autorizado,
        utilizado,
        disponible: autorizado - utilizado,
        creado_at: new Date()
      })
    }
    setMonto('')
    await onActualizar()
    setGuardando(false)
  }

  const utilizado = capacitaciones.reduce((acc: number, cap: any) => acc + (cap.costo_total || 0), 0)
  const autorizado = presupuesto?.autorizado || 0
  const disponible = autorizado - utilizado
  const pct = autorizado > 0 ? Math.round((utilizado / autorizado) * 100) : 0

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-lg font-semibold text-gray-800">Presupuesto de capacitación</h3>

      {/* Configurar presupuesto */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3">
        <p className="text-sm font-medium text-gray-700">Presupuesto autorizado</p>
        <div className="flex gap-2">
          <input
            type="number"
            value={monto}
            onChange={e => setMonto(e.target.value)}
            placeholder={presupuesto ? `Actual: $${autorizado.toLocaleString('es-MX')}` : 'Monto en MXN'}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={guardarPresupuesto}
            disabled={guardando || !monto}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {guardando ? 'Guardando...' : 'Establecer'}
          </button>
        </div>
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <p className="text-sm text-gray-500">Autorizado</p>
          <p className="text-2xl font-semibold text-gray-800 mt-1">${autorizado.toLocaleString('es-MX')}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <p className="text-sm text-gray-500">Utilizado</p>
          <p className="text-2xl font-semibold text-amber-600 mt-1">${utilizado.toLocaleString('es-MX')}</p>
        </div>
        <div className={`rounded-xl p-5 border ${disponible < 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
          <p className="text-sm text-gray-500">Disponible</p>
          <p className={`text-2xl font-semibold mt-1 ${disponible < 0 ? 'text-red-600' : 'text-green-600'}`}>
            ${disponible.toLocaleString('es-MX')}
          </p>
        </div>
      </div>

      {/* Barra de uso */}
      {autorizado > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Uso del presupuesto</span>
            <span>{pct}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-green-500'}`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          {disponible < 0 && (
            <p className="text-xs text-red-500 mt-2">⚠ Presupuesto excedido por ${Math.abs(disponible).toLocaleString('es-MX')} MXN</p>
          )}
        </div>
      )}

      {/* Desglose por curso */}
      {capacitaciones.filter((c: any) => c.costo_total > 0).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="font-medium text-gray-800 mb-4">Desglose por curso</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="pb-2">Curso</th>
                <th className="pb-2">Fecha</th>
                <th className="pb-2">Costo total</th>
              </tr>
            </thead>
            <tbody>
              {capacitaciones.filter((c: any) => c.costo_total > 0).map((cap: any) => (
                <tr key={cap.id} className="border-b border-gray-50">
                  <td className="py-2">{cap.nombre}</td>
                  <td className="py-2 text-gray-400">{cap.fecha}</td>
                  <td className="py-2 font-medium">${(cap.costo_total || 0).toLocaleString('es-MX')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}