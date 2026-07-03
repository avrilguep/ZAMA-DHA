'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import './inicio.css'

const CLAVE = 'ZAMADHA2026'
const DIAS_VALIDO = 6

const planes = [
  {
    nombre: 'Básico',
    precioMensual: 1499,
    precioAnual: 1199,
    usuarios: '25 usuarios',
    colorBorde: '#e5e7eb',
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
    colorBorde: '#2563eb',
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
    colorBorde: '#e5e7eb',
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
  const [mostrar, setMostrar] = useState(false)
  const [error, setError] = useState('')
  const [anual, setAnual] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const acceso = localStorage.getItem('acceso_fecha')
    if (acceso) {
      const fechaAcceso = new Date(acceso)
      const ahora = new Date()
      const diasPasados = (ahora.getTime() - fechaAcceso.getTime()) / (1000 * 60 * 60 * 24)
      if (diasPasados < DIAS_VALIDO) router.push('/rol')
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
    <div className="landing-bg">

      {/* Hero */}
      <div className="landing-hero">
        <img src="/logo.png" alt="Logo" className="w-100 h-50 object-contain" />

        <div className="text-center">
          <h1 className="landing-titulo">Plataforma de capacitación empresarial</h1>
          <p className="landing-subtitulo">Gestiona cursos, evaluaciones y constancias de tus empleados</p>
        </div>

        {/* Card login */}
        <div className="inicio-card" style={{ maxWidth: 380, width: '100%' }}>
          <p className="inicio-bienvenida" style={{ marginBottom: 4 }}>¡Bienvenido!</p>
          <p className="inicio-label">Ingresa la contraseña para continuar</p>

          <div className="inicio-input-wrapper">
            <input
              type={mostrar ? 'text' : 'password'}
              value={clave}
              onChange={e => { setClave(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleEntrar()}
              placeholder="Contraseña de acceso"
              className="inicio-input"
            />
            <button
              type="button"
              className="inicio-ojo"
              onClick={() => setMostrar(!mostrar)}
              aria-label="Mostrar contraseña"
            >
              {mostrar ? (
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M17.94 17.94A10.94 10.94 0 0112 20C7 20 2.73 16.39 1 12c.74-1.9 1.93-3.58 3.46-4.94M9.9 4.24A9.12 9.12 0 0112 4c5 0 9.27 3.61 11 8a11.05 11.05 0 01-1.06 2.06M1 1l22 22"/>
                </svg>
              ) : (
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>

          {error && <p className="inicio-error">{error}</p>}

          <button onClick={handleEntrar} className="inicio-btn">
            Entrar
          </button>
        </div>
      </div>

      {/* Planes */}
      <div className="landing-planes">
        <h2 className="landing-planes-titulo">Planes y Precios</h2>
        <p className="landing-planes-subtitulo">Elige el plan que mejor se adapte a tu empresa</p>

        {/* Toggle */}
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

        {/* Cards */}
        <div className="landing-grid">
          {planes.map(plan => (
            <div
              key={plan.nombre}
              className={`plan-card ${plan.destacado ? 'destacado' : ''}`}
              style={{ borderColor: plan.colorBorde }}
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

        {/* Cotización */}
        <div className="mt-12 text-center flex flex-col items-center gap-3">
          <p className="text-gray-500 text-sm">¿Tienes más de 500 empleados o necesitas algo especial? Puedes solicitar una cotización personalizada.</p>
          <button
            onClick={() => router.push('/cotizacion')}
            className="btn-cotizacion border-2 border-blue-600 text-blue-600 px-8 py-3 rounded-xl font-medium hover:bg-blue-50 transition"
          >
            Solicitar cotización
          </button>
        </div>
      </div>
    </div>
  )
}