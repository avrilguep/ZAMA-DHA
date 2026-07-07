'use client'

import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import {
  collection, query, where, getDocs,
  addDoc, updateDoc, doc
} from 'firebase/firestore'

interface Props {
  capacitacion: any
  empleados: any[]
  empresaId: string
  onCerrar: () => void
  onGuardado: () => void
}

export default function AsistenciaModal({ capacitacion, empleados, empresaId, onCerrar, onGuardado }: Props) {
  const [fechaSeleccionada, setFechaSeleccionada] = useState(capacitacion.fecha || '')
  const [asistencias, setAsistencias] = useState<Record<string, boolean>>({})
  const [motivos, setMotivos] = useState<Record<string, string>>({})
  const [historial, setHistorial] = useState<any[]>([])
  const [guardando, setGuardando] = useState(false)
  const [loading, setLoading] = useState(true)
  const [vista, setVista] = useState<'registrar' | 'historial'>('registrar')

  async function cargarHistorial() {
    const q = query(
      collection(db, 'asistencias_capacitacion'),
      where('capacitacion_id', '==', capacitacion.id)
    )
    const snap = await getDocs(q)
    const datos = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    setHistorial(datos)

    // Cargar asistencia del día seleccionado
    const asistMap: Record<string, boolean> = {}
    const motivoMap: Record<string, string> = {}

    const delDia = datos.filter((d: any) => d.fecha === fechaSeleccionada)
    if (delDia.length > 0) {
      delDia.forEach((d: any) => {
        asistMap[d.empleado_id] = d.asistio
        motivoMap[d.empleado_id] = d.motivo || ''
      })
    } else {
      empleados.forEach(emp => { asistMap[emp.id] = true })
    }

    setAsistencias(asistMap)
    setMotivos(motivoMap)
    setLoading(false)
  }

  useEffect(() => { cargarHistorial() }, [fechaSeleccionada])

  async function guardar() {
    setGuardando(true)

    for (const emp of empleados) {
      const asistio = asistencias[emp.id] ?? true
      const motivo = motivos[emp.id] || ''

      const q = query(
        collection(db, 'asistencias_capacitacion'),
        where('capacitacion_id', '==', capacitacion.id),
        where('empleado_id', '==', emp.id),
        where('fecha', '==', fechaSeleccionada)
      )
      const snap = await getDocs(q)

      if (snap.empty) {
        await addDoc(collection(db, 'asistencias_capacitacion'), {
          capacitacion_id: capacitacion.id,
          empresa_id: empresaId,
          empleado_id: emp.id,
          empleado_nombre: emp.nombre,
          departamento: emp.departamento || '',
          asistio,
          motivo,
          estado_ausencia: asistio ? '' : 'Pendiente',
          fecha: fechaSeleccionada,
          creado_at: new Date()
        })
      } else {
        await updateDoc(doc(db, 'asistencias_capacitacion', snap.docs[0].id), {
          asistio,
          motivo,
          estado_ausencia: asistio ? '' : 'Pendiente'
        })
      }
    }

    await cargarHistorial()
    onGuardado()
    setGuardando(false)
  }

  // Agrupar historial por fecha
  const historialPorFecha = historial.reduce((acc: any, a: any) => {
    if (!acc[a.fecha]) acc[a.fecha] = []
    acc[a.fecha].push(a)
    return acc
  }, {})

  const asistieron = Object.values(asistencias).filter(Boolean).length
  const faltaron = empleados.length - asistieron

  if (loading) return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8">
        <p className="text-gray-400 text-sm">Cargando...</p>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        <div className="bg-blue-600 px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold">Asistencia</h2>
            <p className="text-blue-200 text-sm">{capacitacion.nombre}</p>
          </div>
          <button onClick={onCerrar} className="text-white hover:text-blue-200 text-xl">✕</button>
        </div>

        <div className="p-6 flex flex-col gap-4">

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setVista('registrar')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                vista === 'registrar' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              Registrar
            </button>
            <button
              onClick={() => setVista('historial')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                vista === 'historial' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              Historial ({Object.keys(historialPorFecha).length} días)
            </button>
          </div>

          {vista === 'registrar' && (
            <>
              {/* Selector de fecha */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Fecha de la sesión</label>
                <input
                  type="date"
                  value={fechaSeleccionada}
                  onChange={e => setFechaSeleccionada(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Resumen */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-lg px-4 py-3 text-center">
                  <p className="text-xs text-gray-400">Total</p>
                  <p className="text-xl font-semibold text-gray-800">{empleados.length}</p>
                </div>
                <div className="bg-green-50 rounded-lg px-4 py-3 text-center">
                  <p className="text-xs text-gray-400">Asistieron</p>
                  <p className="text-xl font-semibold text-green-600">{asistieron}</p>
                </div>
                <div className="bg-red-50 rounded-lg px-4 py-3 text-center">
                  <p className="text-xs text-gray-400">Faltaron</p>
                  <p className="text-xl font-semibold text-red-500">{faltaron}</p>
                </div>
              </div>

              {/* Lista empleados */}
              <div className="flex flex-col gap-2">
                {empleados.map(emp => (
                  <div key={emp.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{emp.nombre}</p>
                        <p className="text-xs text-gray-400">{emp.departamento || 'Sin departamento'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Asistió</span>
                        <button
                          onClick={() => setAsistencias(prev => ({ ...prev, [emp.id]: !prev[emp.id] }))}
                          className={`w-10 h-5 rounded-full transition-colors ${
                            asistencias[emp.id] !== false ? 'bg-green-500' : 'bg-red-400'
                          }`}
                        >
                          <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-0.5 ${
                            asistencias[emp.id] !== false ? 'translate-x-5' : 'translate-x-0'
                          }`} />
                        </button>
                      </div>
                    </div>
                    {asistencias[emp.id] === false && (
                      <input
                        type="text"
                        value={motivos[emp.id] || ''}
                        onChange={e => setMotivos(prev => ({ ...prev, [emp.id]: e.target.value }))}
                        placeholder="Motivo de ausencia (opcional)"
                        className="mt-2 w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={guardar}
                disabled={guardando || !fechaSeleccionada}
                className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {guardando ? 'Guardando...' : 'Guardar asistencia'}
              </button>
            </>
          )}

          {vista === 'historial' && (
            <div className="flex flex-col gap-4">
              {Object.keys(historialPorFecha).length === 0 ? (
                <p className="text-sm text-gray-400 text-center">No hay registros de asistencia aún</p>
              ) : (
                Object.entries(historialPorFecha)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([fecha, registros]: any) => {
                    const asistieron = registros.filter((r: any) => r.asistio).length
                    const total = registros.length
                    return (
                      <div key={fecha} className="bg-gray-50 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-medium text-gray-800">{fecha}</p>
                          <span className="text-xs text-gray-500">{asistieron}/{total} asistieron</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          {registros.map((r: any) => (
                            <div key={r.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-1.5">
                              <p className="text-xs text-gray-700">{r.empleado_nombre}</p>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                r.asistio ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                              }`}>
                                {r.asistio ? 'Asistió' : 'No asistió'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}