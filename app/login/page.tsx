'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [modo, setModo] = useState<'login' | 'registro'>('login')
  const [rol, setRol] = useState('')
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const rolGuardado = sessionStorage.getItem('rol')
    if (!rolGuardado) {
      router.push('/rol')
      return
    }
    setRol(rolGuardado)
    setMounted(true)
  }, [])

  const esEmpresa = rol === 'empresa'

  async function handleSubmit() {
    if (!rol) return
    setLoading(true)
    setError('')

    try {
      if (modo === 'registro') {
        const { user } = await createUserWithEmailAndPassword(auth, email, password)

        await setDoc(doc(db, 'perfiles', user.uid), {
          uid: user.uid,
          email,
          nombre,
          rol,
          creado_at: new Date()
        })

        console.log('rol al registrar:', rol)
        console.log('esEmpresa:', esEmpresa)


        if (esEmpresa) {
          await setDoc(doc(db, 'empresas', user.uid), {
            uid: user.uid,
            nombre,
            email,
            creado_at: new Date()
          })
        } else {
        console.log('Buscando invitación para:', email.toLowerCase())
        
        const invQ = query(
            collection(db, 'empleados_invitados'),
            where('email', '==', email.toLowerCase())
        )
        const invSnap = await getDocs(invQ)
        
        console.log('Invitaciones encontradas:', invSnap.size)
        console.log('Docs:', invSnap.docs.map(d => d.data()))

        let empresa_id = ''
        let departamento = ''

        if (!invSnap.empty) {
            const invData = invSnap.docs[0].data()
            empresa_id = invData.empresa_id
            departamento = invData.departamento
        }

        console.log('empresa_id a guardar:', empresa_id)

        await setDoc(doc(db, 'empleados', user.uid), {
            uid: user.uid,
            nombre,
            email,
            departamento,
            empresa_id,
            creado_at: new Date()
        })
        
        }

        sessionStorage.removeItem('rol')
        sessionStorage.removeItem('acceso')

        if (esEmpresa) {
          window.location.replace('/dashboard/empresa')
        } else {
          window.location.replace('/dashboard/empleado')
        }

      } else {
        const { user } = await signInWithEmailAndPassword(auth, email, password)
        const perfil = await getDoc(doc(db, 'perfiles', user.uid))

        if (!perfil.exists()) {
          setError('No se encontró tu perfil')
          setLoading(false)
          return
        }

        const rolPerfil = perfil.data().rol
        sessionStorage.removeItem('rol')
        sessionStorage.removeItem('acceso')

        if (rolPerfil === 'empresa') {
          window.location.replace('/dashboard/empresa')
        } else {
          window.location.replace('/dashboard/empleado')
        }
      }

    } catch (err: any) {
      const mensajes: Record<string, string> = {
        'auth/email-already-in-use': 'Este correo ya está registrado',
        'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
        'auth/user-not-found': 'Correo o contraseña incorrectos',
        'auth/wrong-password': 'Correo o contraseña incorrectos',
        'auth/invalid-credential': 'Correo o contraseña incorrectos',
      }
      setError(mensajes[err.code] || 'Ocurrió un error')
      setLoading(false)
    }
  }

  if (!mounted) return null

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#eaf2ff' }}>
      <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-sm flex flex-col gap-5">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">
            {modo === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Acceso como{' '}
            <span className={`font-medium ${esEmpresa ? 'text-blue-600' : 'text-teal-600'}`}>
              {esEmpresa ? 'empresa' : 'empleado'}
            </span>
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {modo === 'registro' && (
            <input
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder={esEmpresa ? 'Nombre de la empresa' : 'Tu nombre completo'}
              className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Correo electrónico"
            className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="Contraseña"
            className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`w-full text-white rounded-lg py-2 text-sm font-medium transition disabled:opacity-50 ${
              esEmpresa ? 'bg-blue-600 hover:bg-blue-700' : 'bg-teal-600 hover:bg-teal-700'
            }`}
          >
            {loading ? 'Cargando...' : modo === 'login' ? 'Entrar' : 'Registrarme'}
          </button>
        </div>

        <p className="text-sm text-center text-gray-500">
          {modo === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
          <button
            onClick={() => setModo(modo === 'login' ? 'registro' : 'login')}
            className="text-blue-600 hover:underline font-medium"
          >
            {modo === 'login' ? 'Regístrate' : 'Inicia sesión'}
          </button>
        </p>

        <button
          onClick={() => router.push('/rol')}
          className="text-xs text-gray-400 hover:text-gray-600 text-center transition"
        >
          ← Volver a selección de rol
        </button>
      </div>
    </div>
  )
}