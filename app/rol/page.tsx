'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function SeleccionarRol() {
  const router = useRouter()

  useEffect(() => {
  const acceso = localStorage.getItem('acceso_fecha')
  if (!acceso) {
    router.push('/')
    return
  }
  const diasPasados = (new Date().getTime() - new Date(acceso).getTime()) / (1000 * 60 * 60 * 24)
  if (diasPasados >= 6) {
    localStorage.removeItem('acceso_fecha')
    router.push('/')
  }
}, [])

  function elegir(rol: string) {
  sessionStorage.setItem('rol', rol)
  router.push('/login')
}

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundImage: "url('/fondo_rol.png')", backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <div className="bg-white p-10 rounded-2xl shadow-md w-full max-w-sm flex flex-col items-center gap-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-800">¿Cómo ingresas?</h1>
          <p className="text-sm text-gray-500 mt-1">Selecciona tu tipo de acceso</p>
        </div>
        <div className="w-full flex flex-col gap-4">
          <button
            onClick={() => elegir('empresa')}
            className="w-full border-2 border-blue-600 text-blue-600 rounded-xl py-4 flex flex-col items-center gap-1 hover:bg-blue-50 transition"
          >
            <span className="text-2xl">🏢</span>
            <span className="font-semibold text-sm">Empresa</span>
            <span className="text-xs text-gray-400">Administra cursos y empleados</span>
          </button>
          <button
            onClick={() => elegir('empleado')}
            className="w-full border-2 border-teal-600 text-teal-600 rounded-xl py-4 flex flex-col items-center gap-1 hover:bg-teal-50 transition"
          >
            <span className="text-2xl">👤</span>
            <span className="font-semibold text-sm">Empleado</span>
            <span className="text-xs text-gray-400">Accede a tus cursos asignados</span>
          </button>
        </div>
      </div>
    </div>
  )
}