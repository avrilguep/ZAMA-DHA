'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AvisoPrivacidad() {
  const [origen, setOrigen] = useState('/login')
  const router = useRouter()

  useEffect(() => {
    const o = sessionStorage.getItem('privacidad_origen')
    if (o === 'login') setOrigen('/login')
    else setOrigen('/')
  }, [])

  function handleVolver() {
    sessionStorage.removeItem('privacidad_origen')
    router.push(origen)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-6" style={{ backgroundImage: "url('/fondo_rol.png')", backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <div className="max-w-3xl mx-auto">
        <button
          onClick={handleVolver}
          className="text-sm text-gray-400 hover:text-gray-600 mb-6 block"
        >
          ← Volver
        </button>

        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="bg-blue-600 px-8 py-6">
            <h1 className="text-2xl font-bold text-white">Aviso de Privacidad</h1>
            <p className="text-blue-200 text-sm mt-1">Última actualización: {new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>

          <div className="p-8 flex flex-col gap-6 text-sm text-gray-600 leading-relaxed">

            <section className="flex flex-col gap-2">
              <h2 className="text-base font-semibold text-gray-900">1. Responsable del tratamiento de datos</h2>
              <p>De conformidad con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP), le informamos que los datos personales que nos proporcione serán tratados bajo la responsabilidad de la empresa que contrata esta plataforma.</p>
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="text-base font-semibold text-gray-900">2. Datos personales que recabamos</h2>
              <p>Recabamos los siguientes datos personales:</p>
              <ul className="list-disc list-inside flex flex-col gap-1 ml-2">
                <li>Nombre completo</li>
                <li>Correo electrónico</li>
                <li>Departamento</li>
                <li>Resultados de evaluaciones</li>
                <li>Historial de cursos completados</li>
                <li>Constancias generadas</li>
              </ul>
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="text-base font-semibold text-gray-900">3. Finalidades del tratamiento</h2>
              <p>Sus datos personales serán utilizados para las siguientes finalidades:</p>
              <ul className="list-disc list-inside flex flex-col gap-1 ml-2">
                <li>Gestionar su acceso a la plataforma de capacitación</li>
                <li>Asignar y registrar cursos de capacitación</li>
                <li>Generar constancias de cursos completados</li>
                <li>Elaborar reportes de capacitación para la empresa</li>
                <li>Cumplir con obligaciones legales ante la STPS</li>
              </ul>
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="text-base font-semibold text-gray-900">4. Transferencia de datos</h2>
              <p>Sus datos personales no serán transferidos a terceros sin su consentimiento, salvo en los casos previstos en el artículo 37 de la LFPDPPP o cuando sea requerido por autoridades competentes.</p>
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="text-base font-semibold text-gray-900">5. Derechos ARCO</h2>
              <p>Usted tiene derecho a Acceder, Rectificar, Cancelar u Oponerse al tratamiento de sus datos personales (derechos ARCO). Para ejercer estos derechos puede contactarnos a través del correo electrónico registrado en la plataforma.</p>
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="text-base font-semibold text-gray-900">6. Seguridad de los datos</h2>
              <p>Implementamos medidas de seguridad técnicas y administrativas para proteger sus datos personales contra daño, pérdida, alteración, destrucción o el uso, acceso o tratamiento no autorizado. Los datos se almacenan en servidores seguros de Google Firebase con cifrado en tránsito y en reposo.</p>
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="text-base font-semibold text-gray-900">7. Cookies</h2>
              <p>Esta plataforma utiliza almacenamiento local del navegador (localStorage y sessionStorage) para mantener su sesión activa. No utilizamos cookies de rastreo publicitario.</p>
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="text-base font-semibold text-gray-900">8. Cambios al aviso de privacidad</h2>
              <p>Nos reservamos el derecho de efectuar modificaciones o actualizaciones al presente aviso de privacidad. Dichas modificaciones estarán disponibles en esta misma página.</p>
            </section>

          </div>
        </div>
      </div>

      <div className="text-center py-8 border-t border-gray-200 mt-8">
        <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} · Plataforma de capacitación empresarial - ZAMA DHA·{' '}
            <a href="/privacidad" className="text-blue-600 hover:underline">
            Aviso de Privacidad
            </a>
        </p>
      </div>
    </div>
  )
}