'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const CLAVE = 'ZAMADHA2026'
const DIAS_VALIDO = 6

const planes = [
  {
    nombre: 'Básico',
    precioMensual: 1499,
    precioAnual: 1199,
    usuarios: '25 usuarios',
    color: 'border-gray-200',
    colorBtn: 'bg-gray-800 hover:bg-gray-900',
    destacado: false,
    beneficios: [
      '20 cursos disponibles',
      'Reportes básicos',
      'Certificados digitales',
      'Soporte por correo',
    ]
  },
  {
    nombre: 'Pro',
    precioMensual: 3999,
    precioAnual: 3199,
    usuarios: '100 usuarios',
    color: 'border-blue-600',
    colorBtn: 'bg-blue-600 hover:bg-blue-700',
    destacado: true,
    beneficios: [
      '100 cursos disponibles',
      'Reportes avanzados',
      'Dashboard administrativo',
      'Soporte por chat y correo',
    ]
  },
  {
    nombre: 'Enterprise',
    precioMensual: 8999,
    precioAnual: 7199,
    usuarios: '500 usuarios',
    color: 'border-gray-200',
    colorBtn: 'bg-gray-800 hover:bg-gray-900',
    destacado: false,
    beneficios: [
      'Cursos ilimitados',
      'Reportes personalizados',
      'Integración con otros sistemas',
      'Soporte 24/7',
    ]
  }
]

export default function Bienvenida() {
  const [clave, setClave] = useState('')
  const [error, setError] = useState('')
  const [anual, setAnual] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const acceso = localStorage.getItem('acceso_fecha')
    if (acceso) {
      const fechaAcceso = new Date(acceso)
      const ahora = new Date()
      const diasPasados = (ahora.getTime() - fechaAcceso.getTime()) / (1000 * 60 * 60 * 24)
      if (diasPasados < DIAS_VALIDO) {
        router.push('/rol')
      }
    }
  }, [])

  function handleEntrar() {
    if (clave === CLAVE) {
      localStorage.setItem('acceso_fecha', new Date().toISOString())
      router.push('/rol')
    } else {
      setError('Contraseña incorrecta')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Hero / Login */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-12 flex flex-col items-center gap-6">
          <img src="/logo.png" alt="Logo" className="w-200 h-50 object-contain" />
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">Plataforma de capacitación empresarial</h1>
            <p className="text-gray-500 mt-1">Gestiona cursos, evaluaciones y constancias de tus empleados</p>
          </div>

          {/* Login */}
          <div className="w-full max-w-sm flex flex-col gap-3 mt-2">
            <input
              type="password"
              value={clave}
              onChange={e => setClave(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleEntrar()}
              placeholder="Contraseña de acceso"
              className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              onClick={handleEntrar}
              className="bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 transition"
            >
              Entrar
            </button>
          </div>
        </div>
      </div>

      {/* Planes y Precios */}
      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-gray-900">Planes y Precios</h2>
          <p className="text-gray-500 mt-2">Elige el plan que mejor se adapte a tu empresa</p>

          {/* Toggle mensual/anual */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <span className={`text-sm font-medium ${!anual ? 'text-gray-900' : 'text-gray-400'}`}>Mensual</span>
            <button
              onClick={() => setAnual(!anual)}
              className={`w-12 h-6 rounded-full transition-colors ${anual ? 'bg-blue-600' : 'bg-gray-300'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${anual ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
            <span className={`text-sm font-medium ${anual ? 'text-gray-900' : 'text-gray-400'}`}>
              Anual <span className="text-green-600 text-xs font-semibold ml-1">20% descuento</span>
            </span>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-3 gap-6">
          {planes.map(plan => (
            <div
              key={plan.nombre}
              className={`bg-white rounded-2xl border-2 ${plan.color} p-6 flex flex-col gap-4 ${plan.destacado ? 'shadow-lg scale-105' : ''}`}
            >
              {plan.destacado && (
                <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full self-start">
                  Más popular
                </span>
              )}

              <div>
                <h3 className="text-lg font-bold text-gray-900">{plan.nombre}</h3>
                <p className="text-gray-500 text-sm mt-1">{plan.usuarios}</p>
              </div>

              <div>
                <span className="text-3xl font-bold text-gray-900">
                  ${(anual ? plan.precioAnual : plan.precioMensual).toLocaleString('es-MX')}
                </span>
                <span className="text-gray-400 text-sm"> MXN/mes</span>
                {anual && (
                  <p className="text-green-600 text-xs mt-1">
                    ${(plan.precioAnual * 12).toLocaleString('es-MX')} MXN al año
                  </p>
                )}
              </div>

              <ul className="flex flex-col gap-2 flex-1">
                {plan.beneficios.map(b => (
                  <li key={b} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-green-500 mt-0.5">✓</span>
                    {b}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => {
                  localStorage.setItem('acceso_fecha', new Date().toISOString())
                  router.push('/rol')
                }}
                className={`w-full text-white rounded-lg py-2 text-sm font-medium transition ${plan.colorBtn}`}
              >
                Contratar
              </button>
            </div>
          ))}
        </div>

        {/* Botón solicitar cotización */}
        <div className="mt-12 text-center flex flex-col items-center gap-3">
          <p className="text-gray-500 text-sm">¿Tienes más de 500 empleados o necesitas algo especial?</p>
          <button
            onClick={() => router.push('/cotizacion')}
            className="border-2 border-blue-600 text-blue-600 px-8 py-3 rounded-xl font-medium hover:bg-blue-50 transition"
          >
            Solicitar cotización
          </button>
        </div>
      </div>
    </div>
  )
}