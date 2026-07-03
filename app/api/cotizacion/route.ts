import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  const datos = await req.json()

  const folio = `COT-${Date.now()}`

  try {
    // Correo de confirmación al cliente
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: datos.correo,
      subject: `Solicitud de cotización recibida · Folio ${folio}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1e40af; padding: 24px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 20px;">Solicitud recibida</h1>
          </div>
          <div style="background: white; padding: 24px; border: 1px solid #e5e7eb; border-radius: 0 0 12px 12px;">
            <p>Hola <strong>${datos.nombre}</strong>,</p>
            <p>Hemos recibido tu solicitud de cotización. Un asesor se pondrá en contacto contigo en las próximas 24 horas.</p>
            <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p style="margin: 0; font-size: 14px; color: #6b7280;">Folio de seguimiento</p>
              <p style="margin: 4px 0 0; font-size: 24px; font-weight: bold; color: #1e40af;">${folio}</p>
            </div>
            <p style="font-size: 14px; color: #6b7280;">Guarda este folio para dar seguimiento a tu solicitud.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="font-size: 12px; color: #9ca3af;">Resumen de tu solicitud:</p>
            <ul style="font-size: 13px; color: #374151;">
              <li>Empresa: ${datos.empresa}</li>
              <li>Empleados: ${datos.empleados}</li>
              <li>Sucursales: ${datos.sucursales}</li>
              <li>Tipo de capacitación: ${datos.tipoCapacitacion}</li>
              <li>Fecha estimada: ${datos.fechaImplementacion}</li>
            </ul>
          </div>
        </div>
      `
    })

    // Notificación interna a Capital Humano
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'enunciber@gmail.com',
      subject: `Nueva solicitud de cotización · ${folio}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #0d9488; padding: 24px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 20px;">Nueva solicitud de cotización</h1>
            <p style="color: #99f6e4; margin: 4px 0 0; font-size: 14px;">Folio: ${folio}</p>
          </div>
          <div style="background: white; padding: 24px; border: 1px solid #e5e7eb; border-radius: 0 0 12px 12px;">
            <h3 style="color: #374151;">Datos de la empresa</h3>
            <ul style="font-size: 14px; color: #374151;">
              <li><strong>Empresa:</strong> ${datos.empresa}</li>
              <li><strong>Responsable:</strong> ${datos.nombre}</li>
              <li><strong>Correo:</strong> ${datos.correo}</li>
              <li><strong>Teléfono:</strong> ${datos.telefono}</li>
              <li><strong>Giro:</strong> ${datos.giro}</li>
            </ul>
            <h3 style="color: #374151;">Datos del proyecto</h3>
            <ul style="font-size: 14px; color: #374151;">
              <li><strong>Empleados:</strong> ${datos.empleados}</li>
              <li><strong>Sucursales:</strong> ${datos.sucursales}</li>
              <li><strong>Tipo de capacitación:</strong> ${datos.tipoCapacitacion}</li>
              <li><strong>Modalidad:</strong> ${datos.modalidad}</li>
              <li><strong>Fecha estimada:</strong> ${datos.fechaImplementacion}</li>
            </ul>
            <h3 style="color: #374151;">Comentarios</h3>
            <p style="font-size: 14px; color: #374151; background: #f9fafb; padding: 12px; border-radius: 8px;">
              ${datos.comentarios || 'Sin comentarios adicionales'}
            </p>
            <div style="background: #fef3c7; padding: 12px; border-radius: 8px; margin-top: 16px;">
              <p style="margin: 0; font-size: 13px; color: #92400e;">
                Estado: <strong>Pendiente de revisión</strong>
              </p>
            </div>
          </div>
        </div>
      `
    })

    return NextResponse.json({ ok: true, folio })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ ok: false, error: 'Error al enviar correos' }, { status: 500 })
  }
}