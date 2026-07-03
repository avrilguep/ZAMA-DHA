'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { db } from '@/lib/firebase'
import { addDoc, collection } from 'firebase/firestore'

export default function Cotizacion() {
  const router = useRouter()
  const [enviando, setEnviando] = useState(false)
  const [folio, setFolio] = useState('')
  const [errores, setErrores] = useState<Record<string, string>>({})

  const [form, setForm] = useState({
    empresa: '',
    nombre: '',
    correo: '',
    telefono: '',
    giro: '',
    empleados: '',
    sucursales: '',
    tipoCapacitacion: '',
    modalidad: '',
    fechaImplementacion: '',
    comentarios: ''
  })

  function actualizar(campo: string, valor: string) {
    setForm(prev => ({ ...prev, [campo]: valor }))
    setErrores(prev => ({ ...prev, [campo]: '' }))
  }

  function validar() {
    const nuevosErrores: Record<string, string> = {}

    if (!form.empresa.trim()) nuevosErrores.empresa = 'Campo requerido'
    if (!form.nombre.trim()) nuevosErrores.nombre = 'Campo requerido'
    if (!form.correo.trim()) nuevosErrores.correo = 'Campo requerido'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo)) nuevosErrores.correo = 'Correo inválido'
    if (!form.telefono.trim()) nuevosErrores.telefono = 'Campo requerido'
    else if (!/^\d+$/.test(form.telefono)) nuevosErrores.telefono = 'Solo números'
    if (!form.giro.trim()) nuevosErrores.giro = 'Campo requerido'
    if (!form.empleados.trim()) nuevosErrores.empleados = 'Campo requerido'
    else if (parseInt(form.empleados) <= 500) nuevosErrores.empleados = 'Debe ser mayor a 500 empleados'
    if (!form.sucursales.trim()) nuevosErrores.sucursales = 'Campo requerido'
    if (!form.tipoCapacitacion.trim()) nuevosErrores.tipoCapacitacion = 'Campo requerido'
    if (!form.modalidad.trim()) nuevosErrores.modalidad = 'Campo requerido'
    if (!form.fechaImplementacion.trim()) nuevosErrores.fechaImplementacion = 'Campo requerido'

    setErrores(nuevosErrores)
    return Object.keys(nuevosErrores).length === 0
  }

  async function handleEnviar() {
    if (!validar()) return
    setEnviando(true)

    try {
      const res = await fetch('/api/cotizacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })

      const data = await res.json()

      if (data.ok) {
        // Guardar en Firestore
        await addDoc(collection(db, 'cotizaciones'), {
          ...form,
          folio: data.folio,
          estado: 'Pendiente de revisión',
          creado_at: new Date()
        })

        setFolio(data.folio)
      }
    } catch (e) {
      console.error(e)
    }

    setEnviando(false)
  }

  const campo = (label: string, key: string, tipo = 'text', placeholder = '') => (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <input
        type={tipo}
        value={form[key as keyof typeof form]}
        onChange={e => actualizar(key, e.target.value)}
        placeholder={placeholder}
        className={`border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errores[key] ? 'border-red-400' : 'border-gray-200'}`}
      />
      {errores[key] && <p className="text-red-500 text-xs">{errores[key]}</p>}
    </div>
  )

  if (folio) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-md p-10 max-w-md w-full flex flex-col items-center gap-6 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <span className="text-green-600 text-3xl">✓</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">¡Solicitud enviada!</h2>
          <p className="text-gray-500 text-sm mt-2">Un asesor se pondrá en contacto contigo en las próximas 24 horas.</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-6 py-4 w-full">
          <p className="text-sm text-gray-500">Folio de seguimiento</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{folio}</p>
        </div>
        <p className="text-xs text-gray-400">Revisa tu correo para más detalles.</p>
        <button
          onClick={() => router.push('/')}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Volver al inicio
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-6">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => router.push('/')} className="text-sm text-gray-400 hover:text-gray-600 mb-6 block">
          ← Volver
        </button>

        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="bg-blue-600 px-8 py-6">
            <h1 className="text-2xl font-bold text-white">Solicitar cotización</h1>
            <p className="text-blue-200 text-sm mt-1">Para empresas con más de 500 empleados o necesidades especiales</p>
          </div>

          <div className="p-8 flex flex-col gap-8">

            {/* Datos empresa */}
            <div className="flex flex-col gap-4">
              <h2 className="text-base font-semibold text-gray-800 border-b border-gray-100 pb-2">Datos de la empresa</h2>
              {campo('Nombre de la empresa *', 'empresa', 'text', 'Ej. Empresa SA de CV')}
              {campo('Nombre del responsable *', 'nombre', 'text', 'Tu nombre completo')}
              {campo('Correo electrónico *', 'correo', 'email', 'correo@empresa.com')}
              {campo('Teléfono *', 'telefono', 'text', '10 dígitos')}
              {campo('Giro de la empresa *', 'giro', 'text', 'Ej. Manufactura, Servicios, etc.')}
            </div>

            {/* Datos proyecto */}
            <div className="flex flex-col gap-4">
              <h2 className="text-base font-semibold text-gray-800 border-b border-gray-100 pb-2">Datos del proyecto</h2>
              {campo('Número de empleados *', 'empleados', 'number', 'Mínimo 501')}
              {campo('Número de sucursales *', 'sucursales', 'number', 'Ej. 5')}
              {campo('Tipo de capacitación requerida *', 'tipoCapacitacion', 'text', 'Ej. Seguridad, Ventas, Técnica...')}

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Modalidad *</label>
                <select
                  value={form.modalidad}
                  onChange={e => actualizar('modalidad', e.target.value)}
                  className={`border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errores.modalidad ? 'border-red-400' : 'border-gray-200'}`}
                >
                  <option value="">Selecciona una opción</option>
                  <option value="En línea">En línea</option>
                  <option value="Presencial">Presencial</option>
                  <option value="Híbrida">Híbrida</option>
                </select>
                {errores.modalidad && <p className="text-red-500 text-xs">{errores.modalidad}</p>}
              </div>

              {campo('Fecha estimada de implementación *', 'fechaImplementacion', 'date', '')}
            </div>

            {/* Comentarios */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Comentarios adicionales</label>
              <textarea
                value={form.comentarios}
                onChange={e => actualizar('comentarios', e.target.value)}
                placeholder="Describe tus necesidades específicas..."
                rows={4}
                className="border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <button
              onClick={handleEnviar}
              disabled={enviando}
              className="w-full bg-blue-600 text-white rounded-lg py-3 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {enviando ? 'Enviando...' : 'Enviar solicitud'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}