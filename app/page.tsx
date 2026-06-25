'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const CLAVE = 'ZAMADHA2026'

export default function Bienvenida() {
  const [clave, setClave] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  function handleEntrar() {
    if (clave === CLAVE) {
      sessionStorage.setItem('acceso', 'true')
      router.push('/rol')
    } else {
      setError('Contraseña incorrecta')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-10 rounded-2xl shadow-md w-full max-w-sm flex flex-col items-center gap-6">
        <img src="/logo.png" alt="Logo" className="w-full h-80 object-contain" />
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-800">¡Bienvenido!</h1>
          <p className="text-sm text-gray-500 mt-1">Ingresa la contraseña para continuar</p>
        </div>
        <div className="w-full flex flex-col gap-3">
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
  )
}