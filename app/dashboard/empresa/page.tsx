'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth, db } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import {
  doc, getDoc, collection, query, where,
  getDocs, addDoc, deleteDoc, updateDoc
} from 'firebase/firestore'



export default function EmpresaDashboard() {
  const [empresa, setEmpresa] = useState<any>(null)
  const [empleados, setEmpleados] = useState<any[]>([])
  const [invitados, setInvitados] = useState<any[]>([])
  const [cursos, setCursos] = useState<any[]>([])
  const [asignaciones, setAsignaciones] = useState<any[]>([])
  const [seccion, setSeccion] = useState<'inicio' | 'empleados' | 'cursos' | 'reportes'>('inicio')
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState('')
  const [resultadosEval, setResultadosEval] = useState<Record<string, any[]>>({})

  const [tituloCurso, setTituloCurso] = useState('')
  const [descCurso, setDescCurso] = useState('')
  const [creandoCurso, setCreandoCurso] = useState(false)
  const [mostrarFormCurso, setMostrarFormCurso] = useState(false)
  const [preguntasNuevas, setPreguntasNuevas] = useState<any[]>([])
  const [mostrarEval, setMostrarEval] = useState(false)


  const [evaluaciones, setEvaluaciones] = useState<Record<string, any>>({})
  const [cursoEvalAbierto, setCursoEvalAbierto] = useState<string | null>(null)

  const [emailEmpleado, setEmailEmpleado] = useState('')
  const [deptoEmpleado, setDeptoEmpleado] = useState('')
  const [agregandoEmp, setAgregandoEmp] = useState(false)
  const [mostrarFormEmp, setMostrarFormEmp] = useState(false)
  const [errorEmp, setErrorEmp] = useState('')

  const router = useRouter()


  

async function descargarReportePorCurso() {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const pdf = new jsPDF()
  const fechaHoy = new Date().toLocaleDateString('es-MX')

  // Cargar logo
  let logoBase64 = ''
  try {
    const res = await fetch('/logo.png')
    const blob = await res.blob()
    logoBase64 = await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.readAsDataURL(blob)
    })
  } catch (e) {}

  // Header azul
  pdf.setFillColor(30, 64, 175)
  pdf.rect(0, 0, 210, 28, 'F')

  // Logo en header
  if (logoBase64) {
    pdf.addImage(logoBase64, 'PNG', 8, 4, 20, 20)
  }

  // Título en header
  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(16)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Reporte por curso', logoBase64 ? 35 : 14, 16)

  // Info empresa y fecha
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'normal')
  pdf.text(`${empresa.nombre}  ·  ${fechaHoy}`, logoBase64 ? 35 : 14, 23)

  let y = 40

  for (const curso of cursos) {
    const asigCurso = asignaciones.filter(a => a.curso_id === curso.id)
    const total = asigCurso.length
    const completaron = asigCurso.filter(a => a.completado).length
    const pct = total > 0 ? Math.round((completaron / total) * 100) : 0

    // Fondo gris para título del curso
    pdf.setFillColor(243, 244, 246)
    pdf.rect(14, y - 4, 182, 14, 'F')

    pdf.setFontSize(12)
    pdf.setTextColor(15, 23, 42)
    pdf.setFont('helvetica', 'bold')
    pdf.text(`${curso.titulo}`, 16, y + 4)

    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(100, 116, 139)
    pdf.text(`Progreso: ${pct}% · ${completaron}/${total} empleados completaron`, 16, y + 10)

    const rows = asigCurso.map(a => {
      const emp = empleados.find(e => e.id === a.empleado_id)
      const res = resultadosEval[curso.id]?.find((r: any) => r.empleado_id === a.empleado_id)
      return [
        emp?.nombre || 'Desconocido',
        emp?.departamento || 'Sin depto.',
        a.completado ? 'Completado' : 'Pendiente',
        res ? `${res.porcentaje}% (${res.aprobado ? 'Aprobado' : 'No aprobado'})` : 'Sin evaluación'
      ]
    })

    autoTable(pdf, {
      startY: y + 14,
      head: [['Empleado', 'Departamento', 'Estado', 'Evaluación']],
      body: rows,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235], fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [239, 246, 255] },
      margin: { left: 14, right: 14 },
    })

    y = (pdf as any).lastAutoTable.finalY + 12

    if (y > 260) {
      pdf.addPage()
      y = 20
    }
  }

  // Footer en cada página
  const totalPaginas = (pdf as any).internal.getNumberOfPages()
  for (let i = 1; i <= totalPaginas; i++) {
    pdf.setPage(i)
    pdf.setFillColor(30, 64, 175)
    pdf.rect(0, 287, 210, 10, 'F')
    pdf.setTextColor(255, 255, 255)
    pdf.setFontSize(8)
    pdf.text(`${empresa.nombre} · Reporte generado el ${fechaHoy} · Página ${i} de ${totalPaginas}`, 105, 293, { align: 'center' })
  }

  pdf.save(`reporte-cursos-${empresa.nombre}-${fechaHoy}.pdf`)
}

async function descargarReportePorEmpleado() {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const pdf = new jsPDF()
  const fechaHoy = new Date().toLocaleDateString('es-MX')

  // Cargar logo
  let logoBase64 = ''
  try {
    const res = await fetch('/logo.png')
    const blob = await res.blob()
    logoBase64 = await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.readAsDataURL(blob)
    })
  } catch (e) {}

  // Header teal
  pdf.setFillColor(13, 148, 136)
  pdf.rect(0, 0, 210, 28, 'F')

  // Logo en header
  if (logoBase64) {
    pdf.addImage(logoBase64, 'PNG', 8, 4, 20, 20)
  }

  // Título en header
  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(16)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Reporte por empleado', logoBase64 ? 35 : 14, 16)

  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'normal')
  pdf.text(`${empresa.nombre}  ·  ${fechaHoy}`, logoBase64 ? 35 : 14, 23)

  let y = 40

  for (const emp of empleados) {
    const asigEmp = asignaciones.filter(a => a.empleado_id === emp.id)
    const completaron = asigEmp.filter(a => a.completado).length

    // Fondo gris para título del empleado
    pdf.setFillColor(243, 244, 246)
    pdf.rect(14, y - 4, 182, 18, 'F')

    pdf.setFontSize(12)
    pdf.setTextColor(15, 23, 42)
    pdf.setFont('helvetica', 'bold')
    pdf.text(emp.nombre, 16, y + 4)

    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(100, 116, 139)
    pdf.text(`${emp.departamento || 'Sin departamento'} · ${emp.email}`, 16, y + 10)
    pdf.text(`Cursos completados: ${completaron}/${asigEmp.length}`, 16, y + 15)

    const rows = asigEmp.map(a => {
      const curso = cursos.find(c => c.id === a.curso_id)
      const res = resultadosEval[a.curso_id]?.find((r: any) => r.empleado_id === emp.id)
      return [
        curso?.titulo || 'Desconocido',
        a.completado ? 'Completado' : 'Pendiente',
        res ? `${res.porcentaje}% (${res.aprobado ? 'Aprobado' : 'No aprobado'})` : 'Sin evaluación'
      ]
    })

    autoTable(pdf, {
      startY: y + 18,
      head: [['Curso', 'Estado', 'Evaluación']],
      body: rows,
      theme: 'striped',
      headStyles: { fillColor: [13, 148, 136], fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [240, 253, 250] },
      margin: { left: 14, right: 14 },
    })

    y = (pdf as any).lastAutoTable.finalY + 12

    if (y > 260) {
      pdf.addPage()
      y = 20
    }
  }

  // Footer en cada página
  const totalPaginas = (pdf as any).internal.getNumberOfPages()
  for (let i = 1; i <= totalPaginas; i++) {
    pdf.setPage(i)
    pdf.setFillColor(13, 148, 136)
    pdf.rect(0, 287, 210, 10, 'F')
    pdf.setTextColor(255, 255, 255)
    pdf.setFontSize(8)
    pdf.text(`${empresa.nombre} · Reporte generado el ${fechaHoy} · Página ${i} de ${totalPaginas}`, 105, 293, { align: 'center' })
  }

  pdf.save(`reporte-empleados-${empresa.nombre}-${fechaHoy}.pdf`)
}

  async function cargarDatos(uid: string) {
    const empresaDoc = await getDoc(doc(db, 'empresas', uid))
    if (!empresaDoc.exists()) { router.push('/'); return }
    setEmpresa(empresaDoc.data())

    const empQ = query(collection(db, 'empleados'), where('empresa_id', '==', uid))
    const empSnap = await getDocs(empQ)
    const empData = empSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    setEmpleados(empData)

    const curQ = query(collection(db, 'cursos'), where('empresa_id', '==', uid))
    const curSnap = await getDocs(curQ)
    setCursos(curSnap.docs.map(d => ({ id: d.id, ...d.data() })))

    const asigQ = query(collection(db, 'asignaciones'), where('empresa_id', '==', uid))
    const asigSnap = await getDocs(asigQ)
    setAsignaciones(asigSnap.docs.map(d => ({ id: d.id, ...d.data() })))

    const invQ = query(collection(db, 'empleados_invitados'), where('empresa_id', '==', uid))
    const invSnap = await getDocs(invQ)
    setInvitados(invSnap.docs.map(d => ({ id: d.id, ...d.data() })))

    const evalQ = query(collection(db, 'evaluaciones'), where('empresa_id', '==', uid))
    const evalSnap = await getDocs(evalQ)
    const evalMap: Record<string, any> = {}
    evalSnap.docs.forEach(d => {
    evalMap[d.data().curso_id] = { id: d.id, ...d.data() }
    })
    setEvaluaciones(evalMap)

    const resEvalMap: Record<string, any[]> = {}
    for (const curso of curSnap.docs) {
    const resQ = query(
        collection(db, 'resultados_evaluacion'),
        where('curso_id', '==', curso.id)
    )
    const resSnap = await getDocs(resQ)
    if (!resSnap.empty) {
        resEvalMap[curso.id] = resSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    }
    }
    setResultadosEval(resEvalMap)

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

  async function crearCurso() {
    if (!tituloCurso.trim()) return
    setCreandoCurso(true)

    const cursoRef = await addDoc(collection(db, 'cursos'), {
        empresa_id: userId,
        titulo: tituloCurso.trim(),
        descripcion: descCurso.trim(),
        tiene_evaluacion: preguntasNuevas.length > 0,
        creado_at: new Date()
    })

    // Guardar preguntas si hay
    for (const pregunta of preguntasNuevas) {
        await addDoc(collection(db, 'preguntas'), {
        curso_id: cursoRef.id,
        empresa_id: userId,
        pregunta: pregunta.pregunta,
        tipo: pregunta.tipo,
        opciones: pregunta.opciones,
        respuesta_correcta: pregunta.respuesta_correcta
        })
    }

    setTituloCurso('')
    setDescCurso('')
    setPreguntasNuevas([])
    setMostrarFormCurso(false)
    setMostrarEval(false)
    await cargarDatos(userId)
    setCreandoCurso(false)
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

  async function agregarEmpleado() {
    if (!emailEmpleado.trim()) return
    setAgregandoEmp(true)
    setErrorEmp('')

    const existe = invitados.find(e => e.email === emailEmpleado.trim().toLowerCase())
    if (existe) {
      setErrorEmp('Este empleado ya fue agregado')
      setAgregandoEmp(false)
      return
    }

    await addDoc(collection(db, 'empleados_invitados'), {
      email: emailEmpleado.trim().toLowerCase(),
      departamento: deptoEmpleado.trim(),
      empresa_id: userId,
      empresa_nombre: empresa.nombre,
      creado_at: new Date()
    })

    setEmailEmpleado('')
    setDeptoEmpleado('')
    setMostrarFormEmp(false)
    await cargarDatos(userId)
    setAgregandoEmp(false)
  }

  async function subirEvaluacion(cursoId: string) {
  if (preguntasNuevas.length === 0) return
  setCreandoCurso(true)

  await addDoc(collection(db, 'evaluaciones'), {
    curso_id: cursoId,
    empresa_id: userId,
    preguntas: preguntasNuevas,
    creado_at: new Date()
  })

  // Marcar el curso como que tiene evaluación
  await updateDoc(doc(db, 'cursos', cursoId), {
    tiene_evaluacion: true
  })

  setPreguntasNuevas([])
  setCursoEvalAbierto(null)
  await cargarDatos(userId)
  setCreandoCurso(false)
}

  async function toggleAsignacion(empleadoId: string, cursoId: string) {
    const existe = asignaciones.find(
      a => a.empleado_id === empleadoId && a.curso_id === cursoId
    )

    if (existe) {
      await deleteDoc(doc(db, 'asignaciones', existe.id))
    } else {
      await addDoc(collection(db, 'asignaciones'), {
        empleado_id: empleadoId,
        curso_id: cursoId,
        empresa_id: userId,
        asignado_at: new Date()
      })
    }

    await cargarDatos(userId)
  }

  function progresoCurso(cursoId: string) {
    const asigCurso = asignaciones.filter(a => a.curso_id === cursoId)
    const completadas = asigCurso.filter(a => a.completado).length
    return { total: asigCurso.length, completadas }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-400 text-sm">Cargando...</p>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ backgroundImage: "url('/fondo_rol.png')", backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', backgroundColor: '#dde8f8', backgroundAttachment: 'fixed' }}>
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Logo" className="w-10 h-8 object-contain" />
          <span className="font-semibold text-gray-800">{empresa?.nombre}</span>
        </div>
        <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-800 transition">
          Cerrar sesión
        </button>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex gap-2 mb-8">
          {(['inicio', 'empleados', 'cursos', 'reportes'] as const).map(tab => (
            <button
                key={tab}
                onClick={() => setSeccion(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                seccion === tab
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
            >
                {tab === 'inicio' ? 'Inicio' : tab === 'empleados' ? 'Empleados' : tab === 'cursos' ? 'Cursos' : 'Reportes'}
            </button>
            ))}
        </div>

        {/* INICIO */}
        {seccion === 'inicio' && (
  <div className="flex flex-col gap-6">
    <h2 className="text-xl font-semibold text-gray-800">Resumen general</h2>

    {/* Tarjetas generales */}
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-white rounded-xl p-5 border border-gray-200">
        <p className="text-sm text-gray-500">Empleados</p>
        <p className="text-3xl font-semibold text-gray-800 mt-1">{empleados.length}</p>
      </div>
      <div className="bg-white rounded-xl p-5 border border-gray-200">
        <p className="text-sm text-gray-500">Cursos activos</p>
        <p className="text-3xl font-semibold text-gray-800 mt-1">{cursos.length}</p>
      </div>
      <div className="bg-white rounded-xl p-5 border border-gray-200">
        <p className="text-sm text-gray-500">Asignaciones</p>
        <p className="text-3xl font-semibold text-blue-600 mt-1">{asignaciones.length}</p>
      </div>
    </div>

    {/* Estadísticas por curso */}
    {cursos.length === 0 ? (
      <div className="bg-white rounded-xl p-8 border border-gray-200 text-center">
        <p className="text-gray-400 text-sm">Aún no hay cursos creados</p>
        <button onClick={() => setSeccion('cursos')} className="mt-3 text-sm text-blue-600 hover:underline">
          Crear primer curso →
        </button>
      </div>
    ) : (
      <div className="flex flex-col gap-4">
        {cursos.map(curso => {
          const asigCurso = asignaciones.filter(a => a.curso_id === curso.id)
          const completaron = asigCurso.filter(a => a.completado)
          const pendientes = asigCurso.filter(a => a.completado)
          const total = asigCurso.length
          const pctCompletado = total > 0 ? Math.round((completaron.length / total) * 100) : 0
          const pctPendiente = 100 - pctCompletado

          // Empleados que completaron y los que no
          const idsCompletaron = completaron.map(a => a.empleado_id)
          const idsPendientes = asigCurso.filter(a => !a.completado).map(a => a.empleado_id)

          return (
            <div key={curso.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-5">
                <div className="flex justify-between items-center mb-3">
                  <p className="font-medium text-gray-800">{curso.titulo}</p>
                  <span className="text-sm font-semibold text-blue-600">{pctCompletado}%</span>
                </div>

                {/* Barra de progreso */}
                <div className="w-full bg-gray-100 rounded-full h-3 mb-2">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all"
                    style={{ width: `${pctCompletado}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-400 mb-4">
                  <span>{completaron.length} completaron</span>
                  <span>{idsPendientes.length} pendientes</span>
                </div>

                {/* Resumen rápido */}
                {total === 0 ? (
                  <p className="text-xs text-gray-400">Sin empleados asignados</p>
                ) : pctCompletado === 100 ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <p className="text-sm text-green-700 font-medium">Todos los empleados completaron este curso</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {/* Quién completó */}
                    {idsCompletaron.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Completaron:</p>
                        <div className="flex flex-wrap gap-1">
                          {idsCompletaron.map(id => {
                            const emp = empleados.find(e => e.id === id)
                            return emp ? (
                              <span key={id} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                {emp.nombre}
                              </span>
                            ) : null
                          })}
                        </div>
                      </div>
                    )}
                    {/* Quién falta */}
                    {idsPendientes.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Pendientes:</p>
                        <div className="flex flex-wrap gap-1">
                          {idsPendientes.map(id => {
                            const emp = empleados.find(e => e.id === id)
                            return emp ? (
                              <span key={id} className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                                {emp.nombre}
                              </span>
                            ) : null
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Resultados de evaluaciones */}
              {resultadosEval[curso.id] && resultadosEval[curso.id].length > 0 && (
                <div className="border-t border-gray-100 p-5 bg-gray-50">
                  <p className="text-xs font-medium text-gray-500 mb-3">Resultados de evaluación:</p>
                  <div className="flex flex-col gap-2">
                    {resultadosEval[curso.id].map((res: any) => (
                      <div key={res.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-200">
                        <div>
                          <p className="text-sm text-gray-700">{res.empleado_nombre}</p>
                          <p className="text-xs text-gray-400">{res.correctas}/{res.total} correctas</p>
                        </div>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          res.aprobado
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-600'
                        }`}>
                          {res.porcentaje}% {res.aprobado ? '✓' : '✗'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    )}
  </div>
)}

        {/* EMPLEADOS */}
        {seccion === 'empleados' && (
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">Empleados</h2>
              <button
                onClick={() => setMostrarFormEmp(!mostrarFormEmp)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
              >
                + Agregar empleado
              </button>
            </div>

            {mostrarFormEmp && (
              <div className="bg-white rounded-xl p-5 border border-blue-200 flex flex-col gap-3">
                <p className="font-medium text-gray-800">Agregar empleado</p>
                <input
                  type="email"
                  value={emailEmpleado}
                  onChange={e => setEmailEmpleado(e.target.value)}
                  placeholder="Correo del empleado"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={deptoEmpleado}
                  onChange={e => setDeptoEmpleado(e.target.value)}
                  placeholder="Departamento (opcional)"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errorEmp && <p className="text-red-500 text-sm">{errorEmp}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={agregarEmpleado}
                    disabled={agregandoEmp || !emailEmpleado.trim()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
                  >
                    {agregandoEmp ? 'Guardando...' : 'Agregar'}
                  </button>
                  <button
                    onClick={() => { setMostrarFormEmp(false); setErrorEmp('') }}
                    className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 transition"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Empleados registrados */}
            {empleados.length > 0 && (
              <div className="flex flex-col gap-3">
                {empleados.map(emp => {
                  const asigEmp = asignaciones.filter(a => a.empleado_id === emp.id)
                  const comp = asigEmp.filter(a => a.completado).length
                  return (
                    <div key={emp.id} className="bg-white rounded-xl p-5 border border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-medium text-gray-800">{emp.nombre}</p>
                          <p className="text-sm text-gray-400">{emp.departamento || 'Sin departamento'} · {emp.email}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-800">{comp}/{asigEmp.length}</p>
                          <p className="text-xs text-gray-400">completados</p>
                        </div>
                      </div>
                      <div className="border-t border-gray-100 pt-3">
                        <p className="text-xs text-gray-500 mb-2">Cursos asignados:</p>
                        <div className="flex flex-wrap gap-2">
                          {cursos.map(curso => {
                            const tieneAsig = asignaciones.find(
                              a => a.empleado_id === emp.id && a.curso_id === curso.id
                            )
                            return (
                              <button
                                key={curso.id}
                                onClick={() => toggleAsignacion(emp.id, curso.id)}
                                className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                                  tieneAsig
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                }`}
                              >
                                {tieneAsig ? '✓ ' : '+ '}{curso.titulo}
                              </button>
                            )
                          })}
                          {cursos.length === 0 && (
                            <p className="text-xs text-gray-400">Crea cursos primero</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Invitados pendientes */}
            {invitados.filter(inv => 
            !empleados.find(e => e.email?.toLowerCase() === inv.email?.toLowerCase())
            ).length > 0 && (
            <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-gray-500 mt-2">Pendientes de registro:</p>
                {invitados
                .filter(inv => !empleados.find(e => e.email?.toLowerCase() === inv.email?.toLowerCase()))
                .map(inv => (
                    <div key={inv.id} className="bg-white rounded-xl p-4 border border-dashed border-gray-200 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-600">{inv.email}</p>
                        <p className="text-xs text-gray-400">{inv.departamento || 'Sin departamento'}</p>
                    </div>
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                        Pendiente
                    </span>
                    </div>
                ))
                }
            </div>
            )}

            {empleados.length === 0 && invitados.length === 0 && (
              <div className="bg-white rounded-xl p-8 border border-gray-200 text-center">
                <p className="text-gray-400 text-sm">Aún no hay empleados</p>
                <p className="text-xs text-gray-400 mt-1">Agrega el correo del empleado y luego él se registra</p>
              </div>
            )}
          </div>
        )}

        {/* CURSOS */}
        {seccion === 'cursos' && (
  <div className="flex flex-col gap-4">
    <div className="flex justify-between items-center">
      <h2 className="text-xl font-semibold text-gray-800">Cursos</h2>
      <button
        onClick={() => setMostrarFormCurso(!mostrarFormCurso)}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
      >
        + Nuevo curso
      </button>
    </div>

    {mostrarFormCurso && (
      <div className="bg-white rounded-xl p-5 border border-blue-200 flex flex-col gap-4">
        <p className="font-medium text-gray-800">Nuevo curso</p>
        <input
          type="text"
          value={tituloCurso}
          onChange={e => setTituloCurso(e.target.value)}
          placeholder="Título del curso"
          className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <textarea
          value={descCurso}
          onChange={e => setDescCurso(e.target.value)}
          placeholder="Descripción (opcional)"
          rows={3}
          className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <div className="flex gap-2">
          <button
            onClick={crearCurso}
            disabled={creandoCurso || !tituloCurso.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {creandoCurso ? 'Guardando...' : 'Guardar curso'}
          </button>
          <button
            onClick={() => setMostrarFormCurso(false)}
            className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 transition"
          >
            Cancelar
          </button>
        </div>
      </div>
    )}

    {cursos.length === 0 && !mostrarFormCurso ? (
      <div className="bg-white rounded-xl p-8 border border-gray-200 text-center">
        <p className="text-gray-400 text-sm">Aún no hay cursos creados</p>
      </div>
    ) : (
      <div className="flex flex-col gap-3">
        {cursos.map(curso => {
          const { total } = progresoCurso(curso.id)
          const eval_ = evaluaciones[curso.id]
          const mostrandoEval = cursoEvalAbierto === curso.id

          return (
            <div key={curso.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Info del curso */}
              <div className="p-5">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-800">{curso.titulo}</p>
                    {curso.descripcion && (
                      <p className="text-sm text-gray-400 mt-1">{curso.descripcion}</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 ml-4">{total} asignados</span>
                </div>

                {/* Botones de evaluación */}
                <div className="mt-4 flex gap-2">
                  {!eval_ ? (
                    <button
                      onClick={() => setCursoEvalAbierto(mostrandoEval ? null : curso.id)}
                      className="text-sm bg-amber-500 text-white px-4 py-1.5 rounded-lg hover:bg-amber-600 transition"
                    >
                      {mostrandoEval ? 'Cancelar' : 'Subir evaluación'}
                    </button>
                  ) : (
                    <button
                      onClick={() => setCursoEvalAbierto(mostrandoEval ? null : curso.id)}
                      className="text-sm border border-gray-200 text-gray-600 px-4 py-1.5 rounded-lg hover:bg-gray-50 transition"
                    >
                      {mostrandoEval ? 'Ocultar evaluación' : 'Ver evaluación'}
                    </button>
                  )}
                </div>
              </div>

              {/* Panel de evaluación */}
              {mostrandoEval && (
                <div className="border-t border-gray-100 p-5 bg-gray-50">
                  {eval_ ? (
                    // Mostrar evaluación existente (solo lectura)
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-700">Evaluación del curso</p>
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                          La evaluación no se puede modificar
                        </span>
                      </div>
                      {eval_.preguntas.map((preg: any, pi: number) => (
                        <div key={pi} className="bg-white rounded-xl p-4 border border-gray-200 flex flex-col gap-2">
                          <p className="text-sm font-medium text-gray-800">{pi + 1}. {preg.pregunta}</p>
                          <p className="text-xs text-gray-400">
                            {preg.tipo === 'multiple' ? 'Opción múltiple' : 'Verdadero / Falso'}
                          </p>
                          <div className="flex flex-col gap-1 mt-1">
                            {preg.opciones.map((op: string, oi: number) => (
                              <div
                                key={oi}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                                  preg.respuesta_correcta === oi
                                    ? 'bg-green-50 text-green-700 font-medium'
                                    : 'text-gray-600'
                                }`}
                              >
                                {preg.respuesta_correcta === oi ? '✓' : '○'} {op}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    // Formulario para subir evaluación
                    <div className="flex flex-col gap-4">
                      <p className="text-sm font-medium text-gray-700">Crear evaluación</p>

                      {preguntasNuevas.map((preg, pi) => (
                        <div key={pi} className="bg-white rounded-xl p-4 border border-gray-200 flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-500">
                              {preg.tipo === 'multiple' ? 'Opción múltiple' : 'Verdadero / Falso'}
                            </span>
                            <button
                              onClick={() => eliminarPregunta(pi)}
                              className="text-xs text-red-400 hover:text-red-600"
                            >
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
                            onClick={() => subirEvaluacion(curso.id)}
                            disabled={creandoCurso}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
                            >
                            {creandoCurso ? 'Guardando...' : 'Guardar evaluación'}
                            </button>
                        </div>
                        )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )}
  </div>
)}
      </div>

      {seccion === 'reportes' && (
  <div className="flex flex-col gap-6">
    <h2 className="text-xl font-semibold text-gray-800">Reportes</h2>

    <div className="grid grid-cols-2 gap-4">
      <div className="bg-white rounded-xl p-6 border border-gray-200 flex flex-col gap-3">
        <div>
          <p className="font-medium text-gray-800">Reporte por curso</p>
          <p className="text-sm text-gray-400 mt-1">
            Muestra qué empleados completaron cada curso y sus resultados de evaluación.
          </p>
        </div>
        <button
          onClick={descargarReportePorCurso}
          disabled={cursos.length === 0}
          className="mt-auto bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
        >
          Descargar PDF
        </button>
      </div>

      <div className="bg-white rounded-xl p-6 border border-gray-200 flex flex-col gap-3">
        <div>
          <p className="font-medium text-gray-800">Reporte por empleado</p>
          <p className="text-sm text-gray-400 mt-1">
            Muestra todos los cursos de cada empleado, su estado y resultados.
          </p>
        </div>
        <button
          onClick={descargarReportePorEmpleado}
          disabled={empleados.length === 0}
          className="mt-auto bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition"
        >
          Descargar PDF
        </button>
      </div>
    </div>

    {(cursos.length === 0 || empleados.length === 0) && (
      <p className="text-sm text-gray-400 text-center">
        Necesitas al menos un curso y un empleado para generar reportes.
      </p>
    )}
  </div>
)}
    </div>
  )
}