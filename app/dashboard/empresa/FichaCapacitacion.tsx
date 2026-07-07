'use client'

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface Props {
  capacitacion: any
  asistentes: any[]
  resultado?: any
  onCerrar: () => void
}

export default function FichaCapacitacion({ capacitacion, asistentes, resultado, onCerrar }: Props) {

  async function exportarPDF() {
    const pdf = new jsPDF()
    const ancho = pdf.internal.pageSize.getWidth()
    const fechaHoy = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })

    // Header
    pdf.setFillColor(30, 64, 175)
    pdf.rect(0, 0, ancho, 30, 'F')

    try {
      const res = await fetch('/logo.png')
      const blob = await res.blob()
      const logoBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(blob)
      })
      pdf.addImage(logoBase64, 'PNG', 8, 5, 18, 18)
    } catch (e) {}

    pdf.setTextColor(255, 255, 255)
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.text('FICHA DE CAPACITACIÓN', ancho / 2, 15, { align: 'center' })
    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Generado: ${fechaHoy}`, ancho / 2, 22, { align: 'center' })

    // Datos generales
    pdf.setTextColor(0)
    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Datos del curso', 14, 40)

    autoTable(pdf, {
      startY: 44,
      body: [
        ['Nombre del curso', capacitacion.nombre || ''],
        ['Objetivo', capacitacion.objetivo || 'No especificado'],
        ['Instructor', capacitacion.instructor || ''],
        ['Fecha', capacitacion.fecha || ''],
        ['Hora inicio', capacitacion.horaInicio || 'No especificada'],
        ['Hora fin', capacitacion.horaFin || 'No especificada'],
        ['Duración', `${capacitacion.duracion || 0} horas`],
        ['Modalidad', capacitacion.modalidad || ''],
        ['Departamento', capacitacion.departamento || 'General'],
        ['Cupo', capacitacion.cupo || 'Sin límite'],
        ['Estado', capacitacion.estado || ''],
      ],
      theme: 'grid',
      columnStyles: {
        0: { fontStyle: 'bold', fillColor: [239, 246, 255], cellWidth: 50 },
        1: { cellWidth: 'auto' }
      },
      styles: { fontSize: 9 },
      margin: { left: 14, right: 14 }
    })

    // Lista de asistentes
    const y = (pdf as any).lastAutoTable.finalY + 10

    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(0)
    pdf.text('Lista de asistentes', 14, y)

    autoTable(pdf, {
      startY: y + 4,
      head: [['#', 'Nombre', 'Departamento', 'Asistió', 'Firma']],
      body: asistentes.length > 0
      ? asistentes.map((a, i) => [
          i + 1,
          a.nombre || a.empleado_nombre || '',
          a.departamento || '',
          a.asistio === true ? 'Sí' : a.asistio === false ? 'No' : 'Asignado',
          ''
        ])
      : [['', 'Sin asistentes registrados', '', '', '']],
      theme: 'striped',
      headStyles: { fillColor: [30, 64, 175], fontSize: 9 },
      bodyStyles: { fontSize: 9, minCellHeight: 10 },
      columnStyles: {
        0: { cellWidth: 10 },
        4: { cellWidth: 35 }
      },
      margin: { left: 14, right: 14 }
    })

    // Evaluación
    if (resultado) {
      const y2 = (pdf as any).lastAutoTable.finalY + 10
      pdf.setFontSize(11)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Resultados de evaluación', 14, y2)

      autoTable(pdf, {
        startY: y2 + 4,
        head: [['Empleado', 'Correctas', 'Total', 'Porcentaje', 'Resultado']],
        body: resultado.map((r: any) => [
          r.empleado_nombre,
          r.correctas,
          r.total,
          `${r.porcentaje}%`,
          r.aprobado ? 'Aprobado' : 'No aprobado'
        ]),
        theme: 'striped',
        headStyles: { fillColor: [13, 148, 136], fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        margin: { left: 14, right: 14 }
      })
    }

    // Footer
    const totalPaginas = (pdf as any).internal.getNumberOfPages()
    for (let i = 1; i <= totalPaginas; i++) {
      pdf.setPage(i)
      pdf.setFillColor(30, 64, 175)
      pdf.rect(0, 287, ancho, 10, 'F')
      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(8)
      pdf.text(`Ficha de capacitación · ${capacitacion.nombre} · Página ${i} de ${totalPaginas}`, ancho / 2, 293, { align: 'center' })
    }

    pdf.save(`ficha-${capacitacion.nombre?.replace(/\s+/g, '-')}-${capacitacion.fecha}.pdf`)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="bg-blue-600 px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold text-lg">{capacitacion.nombre}</h2>
            <p className="text-blue-200 text-sm">{capacitacion.fecha} · {capacitacion.instructor}</p>
          </div>
          <button onClick={onCerrar} className="text-white hover:text-blue-200 text-xl">✕</button>
        </div>

        <div className="p-6 flex flex-col gap-6">

          {/* Datos generales */}
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Objetivo', capacitacion.objetivo || 'No especificado'],
              ['Modalidad', capacitacion.modalidad],
              ['Duración', `${capacitacion.duracion || 0} horas`],
              ['Departamento', capacitacion.departamento || 'General'],
              ['Hora inicio', capacitacion.horaInicio || 'No especificada'],
              ['Hora fin', capacitacion.horaFin || 'No especificada'],
              ['Cupo', capacitacion.cupo || 'Sin límite'],
              ['Estado', capacitacion.estado],
            ].map(([label, valor]) => (
              <div key={label} className="bg-gray-50 rounded-lg px-4 py-3">
                <p className="text-xs text-gray-400">{label}</p>
                <p className="text-sm font-medium text-gray-800 mt-0.5">{valor}</p>
              </div>
            ))}
          </div>

          {/* Lista de asistentes */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-3">
              Lista de asistentes ({asistentes.length})
            </p>
            {asistentes.length === 0 ? (
              <p className="text-sm text-gray-400">Sin asistentes registrados</p>
            ) : (
              <div className="flex flex-col gap-2">
                {asistentes.map((a, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2">
                    <div>
                      <p className="text-sm text-gray-700">{a.nombre || a.empleado_nombre}</p>
                      <p className="text-xs text-gray-400">{a.departamento}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      a.asistio === true ? 'bg-green-100 text-green-700' 
                      : a.asistio === false ? 'bg-red-100 text-red-600'
                      : 'bg-gray-100 text-gray-500'
                    }`}>
                      {a.asistio === true ? 'Asistió' : a.asistio === false ? 'No asistió' : 'Asignado'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Costos */}
          {capacitacion.costo_total > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3">Costos</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  ['Instructor', capacitacion.costo_instructor],
                  ['Material', capacitacion.costo_material],
                  ['Transporte', capacitacion.costo_transporte],
                  ['Plataforma', capacitacion.costo_plataforma],
                  ['Viáticos', capacitacion.costo_viaticos],
                  ['Otros', capacitacion.costo_otros],
                ].filter(([, val]) => parseFloat(val) > 0).map(([label, val]) => (
                  <div key={label} className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-400">{label}</p>
                    <p className="text-sm font-medium">${parseFloat(val).toLocaleString('es-MX')}</p>
                  </div>
                ))}
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 mt-2">
                <p className="text-sm font-semibold text-blue-700">
                  Total: ${capacitacion.costo_total.toLocaleString('es-MX')} MXN
                </p>
              </div>
            </div>
          )}

          {/* Botón exportar */}
          <button
            onClick={exportarPDF}
            className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 transition"
          >
            Exportar ficha en PDF
          </button>

        </div>
      </div>
    </div>
  )
}