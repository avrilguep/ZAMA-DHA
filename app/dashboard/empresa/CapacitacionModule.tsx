'use client'

import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import * as XLSX from 'xlsx'
import FichaCapacitacion from './FichaCapacitacion'
import AsistenciaModal from './AsistenciaModal'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

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

  const [fichaAbierta, setFichaAbierta] = useState<any>(null)
  const [asistentesCapacitacion, setAsistentesCapacitacion] = useState<any[]>([])
  const [resultadosCapacitacion, setResultadosCapacitacion] = useState<any[]>([])
  const [asistenciaAbierta, setAsistenciaAbierta] = useState<any>(null)

  const [evaluaciones, setEvaluaciones] = useState<Record<string, any>>({})
  const [evalAbierta, setEvalAbierta] = useState<string | null>(null)
  const [preguntasNuevas, setPreguntasNuevas] = useState<any[]>([])
  const [subiendoEval, setSubiendoEval] = useState(false)

  async function cargarDatos() {

    const evalMap: Record<string, any> = {}
    const capsSnap = await getDocs(query(collection(db, 'capacitaciones'), where('empresa_id', '==', empresaId)))
    for (const cap of capsSnap.docs) {
      const evalQ = query(collection(db, 'evaluaciones'), where('curso_id', '==', cap.id))
      const evalSnap = await getDocs(evalQ)
      if (!evalSnap.empty) {
        evalMap[cap.id] = { id: evalSnap.docs[0].id, ...evalSnap.docs[0].data() }
      }
    }
    setEvaluaciones(evalMap)

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

  function agregarPregunta(tipo: 'multiple' | 'verdadero_falso') {
  if (tipo === 'multiple') {
    setPreguntasNuevas([...preguntasNuevas, {
      tipo: 'multiple',
      pregunta: '',
      opciones: ['', '', '', ''],
      respuesta_correcta: 0
    }])
  } else {
    setPreguntasNuevas([...preguntasNuevas, {
      tipo: 'verdadero_falso',
      pregunta: '',
      opciones: ['Verdadero', 'Falso'],
      respuesta_correcta: 0
    }])
  }
}

  function actualizarPregunta(index: number, campo: string, valor: any) {
    const nuevas = [...preguntasNuevas]
    nuevas[index] = { ...nuevas[index], [campo]: valor }
    setPreguntasNuevas(nuevas)
  }

  function actualizarOpcion(pregIndex: number, opIndex: number, valor: string) {
    const nuevas = [...preguntasNuevas]
    nuevas[pregIndex].opciones[opIndex] = valor
    setPreguntasNuevas(nuevas)
  }

  function eliminarPregunta(index: number) {
    setPreguntasNuevas(preguntasNuevas.filter((_, i) => i !== index))
  }

  async function subirEvaluacion(capId: string) {
    if (preguntasNuevas.length === 0) return
    setSubiendoEval(true)

    await addDoc(collection(db, 'evaluaciones'), {
      curso_id: capId,
      empresa_id: empresaId,
      preguntas: preguntasNuevas,
      creado_at: new Date()
    })

    await updateDoc(doc(db, 'capacitaciones', capId), {
      tiene_evaluacion: true
    })

    setPreguntasNuevas([])
    setEvalAbierta(null)
    await cargarDatos()
    setSubiendoEval(false)
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

  async function abrirFicha(cap: any) {
    // Asistencias registradas
    const asist = asistencias.filter(a => a.capacitacion_id === cap.id)
    
    // Si no hay asistencias registradas, mostrar empleados asignados
    if (asist.length === 0) {
      const asigQ = query(
        collection(db, 'asignaciones'),
        where('curso_id', '==', cap.id)
      )
      const asigSnap = await getDocs(asigQ)
      const asignados = asigSnap.docs.map(d => {
        const emp = empleados.find(e => e.id === d.data().empleado_id)
        return {
          id: d.id,
          empleado_id: d.data().empleado_id,
          empleado_nombre: emp?.nombre || 'Desconocido',
          departamento: emp?.departamento || '',
          asistio: null
        }
      })
      setAsistentesCapacitacion(asignados)
    } else {
      setAsistentesCapacitacion(asist)
    }
    
    setFichaAbierta(cap)
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

  async function exportarExcel() {
  const datos = capacitaciones.map(cap => ({
    'Nombre del curso': cap.nombre || '',
    'Objetivo': cap.objetivo || '',
    'Instructor': cap.instructor || '',
    'Fecha': cap.fecha || '',
    'Hora inicio': cap.horaInicio || '',
    'Hora fin': cap.horaFin || '',
    'Duración (hrs)': cap.duracion || 0,
    'Modalidad': cap.modalidad || '',
    'Departamento': cap.departamento || '',
    'Cupo': cap.cupo || '',
    'Estado': cap.estado || '',
    'Costo instructor': cap.costo_instructor || 0,
    'Costo material': cap.costo_material || 0,
    'Costo transporte': cap.costo_transporte || 0,
    'Costo plataforma': cap.costo_plataforma || 0,
    'Costo viáticos': cap.costo_viaticos || 0,
    'Costo otros': cap.costo_otros || 0,
    'Costo total': cap.costo_total || 0,
  }))

  const hoja = XLSX.utils.json_to_sheet(datos)
  const libro = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(libro, hoja, 'Programa de capacitación')

  hoja['!cols'] = [
    { wch: 30 }, { wch: 40 }, { wch: 25 }, { wch: 12 },
    { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 },
    { wch: 18 }, { wch: 8 }, { wch: 12 }, { wch: 16 },
    { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 },
    { wch: 16 }, { wch: 14 },
  ]

  const fecha = new Date().toLocaleDateString('es-MX').replace(/\//g, '-')
  XLSX.writeFile(libro, `programa-capacitacion-${fecha}.xlsx`)
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
            <div className="flex gap-2">
              <button
                onClick={exportarExcel}
                disabled={capacitaciones.length === 0}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition"
              >
                Exportar Excel
              </button>
              <button
                onClick={() => { setMostrarForm(!mostrarForm); setEditando(null); setForm(formVacio) }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
              >
                + Agregar curso
              </button>
            </div>
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

                      <button
                        onClick={() => abrirFicha(cap)}
                        className="text-xs text-teal-600 hover:underline"
                      >
                        Ver ficha
                      </button>

                      <button
                        onClick={() => setAsistenciaAbierta(cap)}
                        className="text-xs text-green-600 hover:underline"
                      >
                        Asistencia
                      </button>

                      <button
                        onClick={() => setEvalAbierta(evalAbierta === cap.id ? null : cap.id)}
                        className={`text-xs hover:underline ${evaluaciones[cap.id] ? 'text-gray-400' : 'text-purple-600'}`}
                      >
                        {evaluaciones[cap.id] ? 'Ver evaluación' : 'Subir evaluación'}
                      </button>

                    </div>
                  </div>

                  {evalAbierta === cap.id && (
  <div className="mt-4 border-t border-gray-100 pt-4 bg-gray-50 rounded-xl p-4">
    {evaluaciones[cap.id] ? (
      // Mostrar evaluación existente
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700">Evaluación del curso</p>
          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
            No se puede modificar
          </span>
        </div>
        {evaluaciones[cap.id].preguntas.map((preg: any, pi: number) => (
          <div key={pi} className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-sm font-medium text-gray-800">{pi + 1}. {preg.pregunta}</p>
            <p className="text-xs text-gray-400 mb-2">{preg.tipo === 'multiple' ? 'Opción múltiple' : 'Verdadero / Falso'}</p>
            <div className="flex flex-col gap-1">
              {preg.opciones.map((op: string, oi: number) => (
                <div key={oi} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                  preg.respuesta_correcta === oi ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-600'
                }`}>
                  {preg.respuesta_correcta === oi ? '✓' : '○'} {op}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    ) : (
      // Formulario nueva evaluación
      <div className="flex flex-col gap-4">
        <p className="text-sm font-medium text-gray-700">Crear evaluación</p>

        {preguntasNuevas.map((preg, pi) => (
          <div key={pi} className="bg-white rounded-xl p-4 border border-gray-200 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">
                {preg.tipo === 'multiple' ? 'Opción múltiple' : 'Verdadero / Falso'}
              </span>
              <button onClick={() => eliminarPregunta(pi)} className="text-xs text-red-400 hover:text-red-600">
                Eliminar
              </button>
            </div>
            <input
              type="text"
              value={preg.pregunta}
              onChange={e => actualizarPregunta(pi, 'pregunta', e.target.value)}
              placeholder="Escribe la pregunta"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex flex-col gap-2">
              {preg.opciones.map((op: string, oi: number) => (
                <div key={oi} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`correcta-${pi}`}
                    checked={preg.respuesta_correcta === oi}
                    onChange={() => actualizarPregunta(pi, 'respuesta_correcta', oi)}
                    className="accent-blue-600"
                  />
                  {preg.tipo === 'multiple' ? (
                    <input
                      type="text"
                      value={op}
                      onChange={e => actualizarOpcion(pi, oi, e.target.value)}
                      placeholder={`Opción ${oi + 1}`}
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                    />
                  ) : (
                    <span className="text-sm text-gray-700">{op}</span>
                  )}
                </div>
              ))}
              <p className="text-xs text-gray-400">Selecciona el círculo de la respuesta correcta</p>
            </div>
          </div>
        ))}

        <div className="flex gap-2">
          <button
            onClick={() => agregarPregunta('multiple')}
            className="flex-1 border border-dashed border-gray-300 text-gray-500 rounded-lg py-2 text-sm hover:border-blue-400 hover:text-blue-600 transition"
          >
            + Opción múltiple
          </button>
          <button
            onClick={() => agregarPregunta('verdadero_falso')}
            className="flex-1 border border-dashed border-gray-300 text-gray-500 rounded-lg py-2 text-sm hover:border-blue-400 hover:text-blue-600 transition"
          >
            + Verdadero / Falso
          </button>
        </div>

        {preguntasNuevas.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              ⚠ Una vez guardada, la evaluación no se podrá modificar.
            </p>
            <button
              onClick={() => subirEvaluacion(cap.id)}
              disabled={subiendoEval}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {subiendoEval ? 'Guardando...' : 'Guardar evaluación'}
            </button>
          </div>
        )}
      </div>
    )}
  </div>
)}
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
                    <p className="text-sm text-green-600">✓ Todos asistieron</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {ausentes.map(a => (
                        <div key={a.id} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="text-sm font-medium text-gray-700">{a.empleado_nombre}</p>
                              <p className="text-xs text-gray-400">{a.departamento} · {a.motivo || 'Sin motivo'}</p>
                            </div>
                            <select
                              value={a.estado_ausencia || 'Pendiente'}
                              onChange={async e => {
                                await updateDoc(doc(db, 'asistencias_capacitacion', a.id), {
                                  estado_ausencia: e.target.value
                                })
                                await cargarDatos()
                              }}
                              className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option>Pendiente</option>
                              <option>Justificada</option>
                              <option>Reprogramada</option>
                            </select>
                          </div>

                          {/* Reprogramar */}
                          {a.estado_ausencia === 'Reprogramada' && (
                            <div className="flex gap-2 mt-2">
                              <select
                                className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                onChange={async e => {
                                  if (!e.target.value) return
                                  await updateDoc(doc(db, 'asistencias_capacitacion', a.id), {
                                    reprogramado_a: e.target.value
                                  })
                                  await cargarDatos()
                                }}
                                defaultValue={a.reprogramado_a || ''}
                              >
                                <option value="">Seleccionar nueva fecha...</option>
                                {capacitaciones
                                  .filter(c => c.nombre === cap.nombre && c.id !== cap.id)
                                  .map(c => (
                                    <option key={c.id} value={c.id}>{c.fecha} — {c.nombre}</option>
                                  ))
                                }
                              </select>
                              {a.reprogramado_a && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-lg">
                                  ✓ Reprogramado
                                </span>
                              )}
                            </div>
                          )}
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

      {/* INDICADORES ->EN PAG */}
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

          {/* Total personas capacitadas */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="font-medium text-gray-800 mb-4">Total de personas capacitadas</p>
              {(() => {
                const totalEmpleados = empleados.length
                const capacitados = new Set(
                  asistencias.filter(a => a.asistio).map(a => a.empleado_id)
                ).size
                const pendientes = totalEmpleados - capacitados
                const aprobados = new Set(
                  asistencias.filter(a => a.asistio).map(a => a.empleado_id)
                ).size
                const pct = totalEmpleados > 0 ? Math.round((capacitados / totalEmpleados) * 100) : 0

                return (
                  <div className="flex flex-col gap-4 max-w-md mx-auto">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-400">Total empleados</p>
                        <p className="text-2xl font-semibold text-gray-800">{totalEmpleados}</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-400">Capacitados</p>
                        <p className="text-2xl font-semibold text-green-600">{capacitados}</p>
                      </div>
                      <div className="bg-amber-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-400">Pendientes</p>
                        <p className="text-2xl font-semibold text-amber-600">{pendientes}</p>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-400">% Avance</p>
                        <p className="text-2xl font-semibold text-blue-600">{pct}%</p>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3">
                      <div
                        className="bg-green-500 h-3 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })()}
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

          {/* Gráfica de barras - horas por mes */}
          {Object.keys(capacitacionesPorMes).length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="font-medium text-gray-800 mb-4">Gráfica de horas por mes</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={Object.entries(capacitacionesPorMes).map(([mes, data]: any) => ({
                  mes,
                  horas: data.horas
                }))}>
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="horas" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Gráfica circular - avance */}
          {(() => {
            const total = capacitaciones.length
            const realizadas = capacitaciones.filter(c => c.estado === 'Finalizado').length
            const pendientes = capacitaciones.filter(c => c.estado === 'Programado').length
            const enCurso = capacitaciones.filter(c => c.estado === 'En curso').length

            if (total === 0) return null

            const data = [
              { name: 'Finalizadas', value: realizadas, color: '#22c55e' },
              { name: 'En curso', value: enCurso, color: '#3b82f6' },
              { name: 'Programadas', value: pendientes, color: '#f59e0b' },
            ].filter(d => d.value > 0)

            return (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="font-medium text-gray-800 mb-4">Avance por estado</p>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={data}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {data.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )
          })()}

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

          {/* Historial por departamento */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="font-medium text-gray-800 mb-4">Horas por departamento</p>
            {(() => {
              const porDepto: Record<string, number> = {}
              capacitaciones.forEach(cap => {
                const depto = cap.departamento || 'General'
                const asist = asistencias.filter(a => a.capacitacion_id === cap.id && a.asistio).length
                porDepto[depto] = (porDepto[depto] || 0) + (asist * (parseFloat(cap.duracion) || 0))
              })

              if (Object.keys(porDepto).length === 0) return <p className="text-sm text-gray-400">Sin datos aún</p>

              return (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-100">
                      <th className="pb-2">Departamento</th>
                      <th className="pb-2">Horas hombre</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(porDepto).map(([depto, horas]) => (
                      <tr key={depto} className="border-b border-gray-50">
                        <td className="py-2">{depto}</td>
                        <td className="py-2 font-medium text-blue-600">{horas}h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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

       {fichaAbierta && (
        <FichaCapacitacion
          capacitacion={fichaAbierta}
          asistentes={asistentesCapacitacion}
          resultado={resultadosCapacitacion.length > 0 ? resultadosCapacitacion : undefined}
          onCerrar={() => setFichaAbierta(null)}
        />
      )}

      {asistenciaAbierta && (
        <AsistenciaModal
          capacitacion={asistenciaAbierta}
          empleados={empleados}
          empresaId={empresaId}
          onCerrar={() => setAsistenciaAbierta(null)}
          onGuardado={cargarDatos}
        />
      )}
    </div>  
  )
}

function PresupuestoSection({ empresaId, capacitaciones, presupuesto, onActualizar }: any) {
  const [monto, setMonto] = useState('')
  const [guardando, setGuardando] = useState(false)

  const [filtroMes, setFiltroMes] = useState('')
  const [filtroAnio, setFiltroAnio] = useState('')
  const [filtroDepto, setFiltroDepto] = useState('')
  const [filtroCurso, setFiltroCurso] = useState('')

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

  async function exportarPresupuestoPDF() {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const pdf = new jsPDF()
  const fechaHoy = new Date().toLocaleDateString('es-MX')

  pdf.setFillColor(30, 64, 175)
  pdf.rect(0, 0, 210, 28, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Reporte de presupuesto de capacitación', 105, 16, { align: 'center' })
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'normal')
  pdf.text(fechaHoy, 105, 23, { align: 'center' })

  pdf.setTextColor(0)
  autoTable(pdf, {
    startY: 35,
    body: [
      ['Presupuesto autorizado', `$${autorizado.toLocaleString('es-MX')} MXN`],
      ['Presupuesto utilizado', `$${utilizado.toLocaleString('es-MX')} MXN`],
      ['Presupuesto disponible', `$${disponible.toLocaleString('es-MX')} MXN`],
      ['% Utilizado', `${pct}%`],
    ],
    theme: 'grid',
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [239, 246, 255], cellWidth: 80 }
    },
    styles: { fontSize: 10 },
    margin: { left: 14, right: 14 }
  })

  autoTable(pdf, {
    startY: (pdf as any).lastAutoTable.finalY + 10,
    head: [['Curso', 'Fecha', 'Instructor', 'Material', 'Transporte', 'Plataforma', 'Viáticos', 'Otros', 'Total']],
    body: capacitacionesFiltradas.filter((c: any) => c.costo_total > 0).map((cap: any) => [
      cap.nombre,
      cap.fecha,
      `$${(parseFloat(cap.costo_instructor) || 0).toLocaleString('es-MX')}`,
      `$${(parseFloat(cap.costo_material) || 0).toLocaleString('es-MX')}`,
      `$${(parseFloat(cap.costo_transporte) || 0).toLocaleString('es-MX')}`,
      `$${(parseFloat(cap.costo_plataforma) || 0).toLocaleString('es-MX')}`,
      `$${(parseFloat(cap.costo_viaticos) || 0).toLocaleString('es-MX')}`,
      `$${(parseFloat(cap.costo_otros) || 0).toLocaleString('es-MX')}`,
      `$${(cap.costo_total || 0).toLocaleString('es-MX')}`,
    ]),
    theme: 'striped',
    headStyles: { fillColor: [30, 64, 175], fontSize: 8 },
    styles: { fontSize: 8 },
    margin: { left: 14, right: 14 }
  })

  pdf.save(`presupuesto-capacitacion-${fechaHoy}.pdf`)
  }

  async function exportarPresupuestoExcel() {
      const XLSX = await import('xlsx')

    const resumen = [
      { Concepto: 'Presupuesto autorizado', Monto: autorizado },
      { Concepto: 'Presupuesto utilizado', Monto: utilizado },
      { Concepto: 'Presupuesto disponible', Monto: disponible },
      { Concepto: '% Utilizado', Monto: `${pct}%` },
    ]

    const detalle = capacitacionesFiltradas.filter((c: any) => c.costo_total > 0).map((cap: any) => ({
      'Curso': cap.nombre,
      'Fecha': cap.fecha,
      'Departamento': cap.departamento || '',
      'Instructor': parseFloat(cap.costo_instructor) || 0,
      'Material': parseFloat(cap.costo_material) || 0,
      'Transporte': parseFloat(cap.costo_transporte) || 0,
      'Plataforma': parseFloat(cap.costo_plataforma) || 0,
      'Viáticos': parseFloat(cap.costo_viaticos) || 0,
      'Otros': parseFloat(cap.costo_otros) || 0,
      'Total': cap.costo_total || 0,
    }))

    const libro = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(resumen), 'Resumen')
    XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(detalle), 'Detalle por curso')

    const fecha = new Date().toLocaleDateString('es-MX').replace(/\//g, '-')
    XLSX.writeFile(libro, `presupuesto-capacitacion-${fecha}.xlsx`)
  }

  const utilizado = capacitaciones.reduce((acc: number, cap: any) => acc + (cap.costo_total || 0), 0)
  const autorizado = presupuesto?.autorizado || 0
  const disponible = autorizado - utilizado
  const pct = autorizado > 0 ? Math.round((utilizado / autorizado) * 100) : 0

  const capacitacionesFiltradas = capacitaciones.filter((c: any) => {
  if (filtroMes && c.fecha && !c.fecha.startsWith(`${filtroAnio || c.fecha.substring(0, 4)}-${filtroMes}`)) return false
  if (filtroAnio && c.fecha && !c.fecha.startsWith(filtroAnio)) return false
  if (filtroDepto && c.departamento !== filtroDepto) return false
  if (filtroCurso && c.id !== filtroCurso) return false
  return true
  })

  const utilizadoFiltrado = capacitacionesFiltradas.reduce((acc: number, cap: any) => acc + (cap.costo_total || 0), 0)

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

      {/* Filtros */}
<div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3">
  <p className="text-sm font-medium text-gray-700">Filtrar reporte</p>
  <div className="grid grid-cols-2 gap-3">
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-500">Año</label>
      <select
        value={filtroAnio}
        onChange={e => setFiltroAnio(e.target.value)}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Todos</option>
        {[...new Set(capacitaciones.map((c: any) => c.fecha?.substring(0, 4)).filter(Boolean))].map((anio: any) => (
          <option key={anio} value={anio}>{anio}</option>
        ))}
      </select>
    </div>

    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-500">Mes</label>
      <select
        value={filtroMes}
        onChange={e => setFiltroMes(e.target.value)}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Todos</option>
        {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => (
          <option key={m} value={m}>
            {new Date(2024, parseInt(m) - 1).toLocaleString('es-MX', { month: 'long' })}
          </option>
        ))}
      </select>
    </div>

      <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Departamento</label>
            <select
              value={filtroDepto}
              onChange={e => setFiltroDepto(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              {[...new Set(capacitaciones.map((c: any) => c.departamento).filter(Boolean))].map((d: any) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Curso</label>
            <select
              value={filtroCurso}
              onChange={e => setFiltroCurso(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              {capacitaciones.map((c: any) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        {(filtroMes || filtroAnio || filtroDepto || filtroCurso) && (
          <button
            onClick={() => { setFiltroMes(''); setFiltroAnio(''); setFiltroDepto(''); setFiltroCurso('') }}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Limpiar filtros
          </button>
        )}

        {/* Total filtrado */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
          <p className="text-xs text-gray-500">Total filtrado</p>
          <p className="text-lg font-semibold text-blue-600">${utilizadoFiltrado.toLocaleString('es-MX')} MXN</p>
          <p className="text-xs text-gray-400">{capacitacionesFiltradas.filter((c: any) => c.costo_total > 0).length} cursos</p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={exportarPresupuestoPDF}
          disabled={capacitaciones.filter((c: any) => c.costo_total > 0).length === 0}
          className="flex-1 bg-red-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition"
        >
          Exportar PDF
        </button>
        <button
          onClick={exportarPresupuestoExcel}
          disabled={capacitaciones.filter((c: any) => c.costo_total > 0).length === 0}
          className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition"
        >
          Exportar Excel
        </button>
      </div>
    </div>
  )
}