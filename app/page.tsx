'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import './inicio.css'

const CLAVE = 'ZAMADHA2026'

export default function Bienvenida() {
  const [clave, setClave] = useState('')
  const [mostrar, setMostrar] = useState(false)
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
    <div className="inicio-bg">
      <div style={{ position: 'relative', width: '100%', maxWidth: 380, margin: '0 16px' }}>

        <img src="/logo.png" alt="Logo ZAMA DHA" className="inicio-logo" />

      <div className="inicio-card">
        <p className="inicio-bienvenida">¡Bienvenido!</p>

        <div className="inicio-form">
          <p className="inicio-label">Ingresa la contraseña para continuar</p>

          <div className="inicio-input-wrapper">
            <input
              type={mostrar ? 'text' : 'password'}
              value={clave}
              onChange={e => { setClave(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleEntrar()}
              placeholder="Contraseña"
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
      </div>
    </div>
  )
}