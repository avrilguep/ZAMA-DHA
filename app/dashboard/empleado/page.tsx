'use client'

import { generarConstanciaPDF } from '@/lib/generarConstancia'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth, db } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import {
  doc, getDoc, collection, query,
  where, getDocs, addDoc, updateDoc
} from 'firebase/firestore'

export default function EmpleadoDashboard() {
  const [empleado, setEmpleado] = useState<any>(null)
  const [cursos, setCursos] = useState<any[]>([])
  const [asignaciones, setAsignaciones] = useState<any[]>([])
  const [constancias, setConstancias] = useState<any[]>([])
  const [evaluaciones, setEvaluaciones] = useState<Record<string, any>>({})
  const [resultados, setResultados] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState('')

  // Estado para la evaluación en curso
  const [evalAbierta, setEvalAbierta] = useState<string | null>(null)
  const [respuestas, setRespuestas] = useState<Record<number, number>>({})
  const [enviando, setEnviando] = useState(false)
  const [resultadoActual, setResultadoActual] = useState<any>(null)

  const router = useRouter()

  async function cargarDatos(uid: string) {
    const empleadoDoc = await getDoc(doc(db, 'empleados', uid))
    if (!empleadoDoc.exists()) { router.push('/'); return }
    setEmpleado(empleadoDoc.data())

    const empleadoData = empleadoDoc.data()

    // Cargar nombre de la empresa
    if (empleadoData.empresa_id) {
    const empresaDoc = await getDoc(doc(db, 'empresas', empleadoData.empresa_id))
    if (empresaDoc.exists()) {
        empleadoData.empresa_nombre = empresaDoc.data().nombre
    }
    }
    setEmpleado(empleadoData)

    const asigQ = query(collection(db, 'asignaciones'), where('empleado_id', '==', uid))
    const asigSnap = await getDocs(asigQ)
    const asigData = asigSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[]
    setAsignaciones(asigData)

    const cursosData = await Promise.all(
      asigData.map(async a => {
        const cursoDoc = await getDoc(doc(db, 'cursos', a.curso_id))
        return {
          id: cursoDoc.id,
          asignacion_id: a.id,
          completado: a.completado,
          ...cursoDoc.data()
        }
      })
    )
    setCursos(cursosData)

    // Cargar evaluaciones disponibles
    const evalMap: Record<string, any> = {}
    for (const curso of cursosData) {
      const evalQ = query(collection(db, 'evaluaciones'), where('curso_id', '==', curso.id))
      const evalSnap = await getDocs(evalQ)
      if (!evalSnap.empty) {
        evalMap[curso.id] = { id: evalSnap.docs[0].id, ...evalSnap.docs[0].data() }
      }
    }
    setEvaluaciones(evalMap)

    // Cargar resultados de evaluaciones del empleado
    const resQ = query(collection(db, 'resultados_evaluacion'), where('empleado_id', '==', uid))
    const resSnap = await getDocs(resQ)
    const resMap: Record<string, any> = {}
    resSnap.docs.forEach(d => {
      resMap[d.data().curso_id] = { id: d.id, ...d.data() }
    })
    setResultados(resMap)

    // Cargar constancias
    const constQ = query(collection(db, 'constancias'), where('empleado_id', '==', uid))
    const constSnap = await getDocs(constQ)
    setConstancias(constSnap.docs.map(d => ({ id: d.id, ...d.data() })))

    setLoading(false)
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push('/'); return }
      setUserId(user.uid)
      await cargarDatos(user.uid)
    })
    return () => unsub()
  }, [])

  async function handleLogout() {
    await auth.signOut()
    window.location.replace('/')
  }

  async function completarCurso(cursoId: string, asignacionId: string) {
    await updateDoc(doc(db, 'asignaciones', asignacionId), {
      completado: true,
      completado_at: new Date()
    })
    await cargarDatos(userId)
  }

  async function enviarEvaluacion(cursoId: string) {
    const evaluacion = evaluaciones[cursoId]
    if (!evaluacion) return
    setEnviando(true)

    const preguntas = evaluacion.preguntas
    let correctas = 0

    preguntas.forEach((preg: any, i: number) => {
      if (respuestas[i] === preg.respuesta_correcta) correctas++
    })

    const total = preguntas.length
    const porcentaje = Math.round((correctas / total) * 100)
    const aprobado = porcentaje >= 70

    // Guardar resultado
    await addDoc(collection(db, 'resultados_evaluacion'), {
      empleado_id: userId,
      curso_id: cursoId,
      empleado_nombre: empleado.nombre,
      empleado_email: empleado.email,
      curso_titulo: cursos.find(c => c.id === cursoId)?.titulo,
      correctas,
      total,
      porcentaje,
      aprobado,
      respuestas,
      fecha: new Date()
    })

    // Si aprobó generar constancia
    if (aprobado) {
      const yaExiste = constancias.find(c => c.curso_id === cursoId)
      if (!yaExiste) {
        await addDoc(collection(db, 'constancias'), {
          empleado_id: userId,
          curso_id: cursoId,
          empleado_nombre: empleado.nombre,
          empleado_email: empleado.email,
          curso_titulo: cursos.find(c => c.id === cursoId)?.titulo,
          firmado: false,
          generado_at: new Date()
        })
      }
    }

    setResultadoActual({ porcentaje, aprobado, correctas, total })
    setEvalAbierta(null)
    setRespuestas({})
    setEnviando(false)
    await cargarDatos(userId)
  }

  async function firmarConstancia(constanciaId: string, cursoId: string) {
  await updateDoc(doc(db, 'constancias', constanciaId), {
    firmado: true,
    firmado_at: new Date()
  })

  const curso = cursos.find(c => c.id === cursoId)
  const resultado = resultados[cursoId]

  await generarConstanciaPDF({
    empleadoNombre: empleado.nombre,
    cursoTitulo: curso?.titulo || '',
    empresaNombre: empleado.empresa_nombre || 'Empresa',
    fecha: new Date().toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    porcentaje: resultado?.porcentaje || 100
  })

  await cargarDatos(userId)
}

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-400 text-sm">Cargando...</p>
    </div>
  )

  const cursosPendientes = cursos.filter(c => !c.completado)
  const cursosCompletados = cursos.filter(c => c.completado)

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Logo" className="w-10 h-8 object-contain" />
          <span className="font-semibold text-gray-800">{empleado?.nombre}</span>
        </div>
        <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-800 transition">
          Cerrar sesión
        </button>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col gap-8">

        {/* Resultado de evaluación reciente */}
        {resultadoActual && (
          <div className={`rounded-xl p-5 border ${resultadoActual.aprobado ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <p className={`font-semibold ${resultadoActual.aprobado ? 'text-green-700' : 'text-red-700'}`}>
              {resultadoActual.aprobado ? '¡Aprobaste la evaluación!' : 'No aprobaste esta vez'}
            </p>
            <p className={`text-sm mt-1 ${resultadoActual.aprobado ? 'text-green-600' : 'text-red-600'}`}>
              Obtuviste {resultadoActual.correctas} de {resultadoActual.total} correctas ({resultadoActual.porcentaje}%)
            </p>
            {!resultadoActual.aprobado && (
              <p className="text-xs text-red-500 mt-1">Se requiere al menos 70% para aprobar</p>
            )}
            <button onClick={() => setResultadoActual(null)} className="text-xs text-gray-400 mt-2 hover:text-gray-600">
              Cerrar
            </button>
          </div>
        )}

        {/* Cursos pendientes */}
        {cursosPendientes.length > 0 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold text-gray-800">Mis cursos</h2>
            {cursosPendientes.map(curso => (
              <div key={curso.id} className="bg-white rounded-xl p-5 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800">{curso.titulo}</p>
                    {curso.descripcion && (
                      <p className="text-sm text-gray-400 mt-1">{curso.descripcion}</p>
                    )}
                  </div>
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">Pendiente</span>
                </div>
                <button
                  onClick={() => completarCurso(curso.id, curso.asignacion_id)}
                  className="mt-4 w-full bg-teal-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-teal-700 transition"
                >
                  Marcar como completado
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Cursos completados */}
        {cursosCompletados.length > 0 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold text-gray-800">Completados</h2>
            {cursosCompletados.map(curso => {
              const evaluacion = evaluaciones[curso.id]
              const resultado = resultados[curso.id]
              const constancia = constancias.find(c => c.curso_id === curso.id)
              const evalAbiertaEste = evalAbierta === curso.id

              return (
                <div key={curso.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-800">{curso.titulo}</p>
                        {curso.descripcion && (
                          <p className="text-sm text-gray-400 mt-1">{curso.descripcion}</p>
                        )}
                      </div>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Completado</span>
                    </div>

                    {/* Estado de evaluación */}
                    <div className="mt-4">
                      {!evaluacion ? (
                        // No hay evaluación subida aún
                        <div className="bg-gray-50 border border-dashed border-gray-200 rounded-lg px-4 py-3">
                          <p className="text-sm text-gray-500">
                            La empresa aún no ha subido la evaluación de <span className="font-medium">{curso.titulo}</span>. Espera para completar el curso.
                          </p>
                        </div>
                      ) : resultado ? (
                        // Ya tiene resultado
                        <div className={`rounded-lg px-4 py-3 ${resultado.aprobado ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                          <p className={`text-sm font-medium ${resultado.aprobado ? 'text-green-700' : 'text-red-700'}`}>
                            {resultado.aprobado ? 'Evaluación aprobada' : 'Evaluación no aprobada'} — {resultado.porcentaje}%
                          </p>
                          <p className={`text-xs mt-0.5 ${resultado.aprobado ? 'text-green-600' : 'text-red-500'}`}>
                            {resultado.correctas} de {resultado.total} respuestas correctas
                          </p>
                        </div>
                      ) : (
                        // Hay evaluación pero no la ha hecho
                        <button
                          onClick={() => { setEvalAbierta(evalAbiertaEste ? null : curso.id); setRespuestas({}) }}
                          className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 transition"
                        >
                          {evalAbiertaEste ? 'Cancelar evaluación' : 'Hacer evaluación'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Formulario de evaluación */}
                  {evalAbiertaEste && evaluacion && !resultado && (
                    <div className="border-t border-gray-100 p-5 bg-gray-50 flex flex-col gap-4">
                      <p className="text-sm font-medium text-gray-700">Evaluación — {curso.titulo}</p>

                      {evaluacion.preguntas.map((preg: any, pi: number) => (
                        <div key={pi} className="bg-white rounded-xl p-4 border border-gray-200 flex flex-col gap-3">
                          <p className="text-sm font-medium text-gray-800">{pi + 1}. {preg.pregunta}</p>
                          <div className="flex flex-col gap-2">
                            {preg.opciones.map((op: string, oi: number) => (
                              <label
                                key={oi}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition ${
                                  respuestas[pi] === oi
                                    ? 'bg-blue-50 border border-blue-300'
                                    : 'border border-gray-200 hover:bg-gray-50'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`preg-${pi}`}
                                  checked={respuestas[pi] === oi}
                                  onChange={() => setRespuestas({ ...respuestas, [pi]: oi })}
                                  className="accent-blue-600"
                                />
                                <span className="text-sm text-gray-700">{op}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}

                      <button
                        onClick={() => enviarEvaluacion(curso.id)}
                        disabled={enviando || Object.keys(respuestas).length < evaluacion.preguntas.length}
                        className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
                      >
                        {enviando ? 'Enviando...' : 'Enviar evaluación'}
                      </button>
                      <p className="text-xs text-gray-400 text-center">Se requiere 70% para aprobar</p>
                    </div>
                  )}

                  {/* Constancia */}
                  {constancia && (
                    <div className="border-t border-gray-100 p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-700">Constancia</p>
                          <p className="text-xs text-gray-400">
                            {constancia.firmado ? 'Firmada de recibido' : 'Pendiente de firma'}
                          </p>
                        </div>
                        {constancia.firmado ? (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Firmada</span>
                        ) : (
                          <button
                            onClick={() => firmarConstancia(constancia.id, curso.id)}
                            className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 transition"
                            >
                            Firmar y descargar constancia
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {cursos.length === 0 && (
          <div className="bg-white rounded-xl p-8 border border-gray-200 text-center">
            <p className="text-gray-400 text-sm">No tienes cursos asignados aún</p>
          </div>
        )}
      </div>
    </div>
  )
}