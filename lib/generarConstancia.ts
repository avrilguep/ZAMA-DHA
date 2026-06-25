import jsPDF from 'jspdf'

interface DatosConstancia {
  empleadoNombre: string
  cursoTitulo: string
  empresaNombre: string
  fecha: string
  porcentaje: number
}

async function cargarImagenBase64(url: string): Promise<string> {
  const res = await fetch(url)
  const blob = await res.blob()
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.readAsDataURL(blob)
  })
}

export async function generarConstanciaPDF(datos: DatosConstancia) {
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  })

  const ancho = pdf.internal.pageSize.getWidth()
  const alto = pdf.internal.pageSize.getHeight()

  // Fondo blanco
  pdf.setFillColor(255, 255, 255)
  pdf.rect(0, 0, ancho, alto, 'F')

  // Borde exterior
  pdf.setDrawColor(30, 64, 175)
  pdf.setLineWidth(3)
  pdf.rect(8, 8, ancho - 16, alto - 16)

  // Borde interior
  pdf.setDrawColor(96, 165, 250)
  pdf.setLineWidth(0.5)
  pdf.rect(12, 12, ancho - 24, alto - 24)

  // Franja superior
  pdf.setFillColor(30, 64, 175)
  pdf.rect(8, 8, ancho - 16, 22, 'F')

  // Franja inferior
  pdf.setFillColor(30, 64, 175)
  pdf.rect(8, alto - 26, ancho - 16, 18, 'F')

  // Logo en franja superior
  try {
    const logoBase64 = await cargarImagenBase64('/logo.png')
    pdf.addImage(logoBase64, 'PNG', 14, 10, 16, 16)
  } catch (e) {
    // Si no carga el logo continúa sin él
  }

  // Nombre empresa en franja superior
  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(11)
  pdf.setFont('helvetica', 'bold')
  pdf.text(datos.empresaNombre.toUpperCase(), ancho / 2, 21, { align: 'center' })

  // Fecha en franja inferior
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'normal')
  pdf.text(`Fecha de expedición: ${datos.fecha}`, ancho / 2, alto - 17, { align: 'center' })

  // Círculos decorativos
  pdf.setFillColor(219, 234, 254)
  pdf.circle(30, 55, 8, 'F')
  pdf.circle(ancho - 30, 55, 8, 'F')
  pdf.circle(30, alto - 40, 8, 'F')
  pdf.circle(ancho - 30, alto - 40, 8, 'F')

  pdf.setFillColor(30, 64, 175)
  pdf.circle(30, 55, 4, 'F')
  pdf.circle(ancho - 30, 55, 4, 'F')
  pdf.circle(30, alto - 40, 4, 'F')
  pdf.circle(ancho - 30, alto - 40, 4, 'F')

  // Línea decorativa
  pdf.setDrawColor(219, 234, 254)
  pdf.setLineWidth(0.5)
  pdf.line(40, 46, ancho - 40, 46)

  // Título
  pdf.setTextColor(30, 64, 175)
  pdf.setFontSize(36)
  pdf.setFont('helvetica', 'bold')
  pdf.text('CONSTANCIA', ancho / 2, 64, { align: 'center' })

  // Subtítulo
  pdf.setFontSize(13)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(100, 116, 139)
  pdf.text('DE CURSO COMPLETADO', ancho / 2, 73, { align: 'center' })

  // Línea
  pdf.setDrawColor(219, 234, 254)
  pdf.line(40, 78, ancho - 40, 78)

  // "Se otorga a:"
  pdf.setFontSize(12)
  pdf.setTextColor(100, 116, 139)
  pdf.setFont('helvetica', 'normal')
  pdf.text('Se otorga la presente constancia a:', ancho / 2, 92, { align: 'center' })

  // Nombre empleado
  pdf.setFontSize(28)
  pdf.setTextColor(15, 23, 42)
  pdf.setFont('helvetica', 'bold')
  pdf.text(datos.empleadoNombre, ancho / 2, 108, { align: 'center' })

  // Línea bajo nombre
  const nombreAncho = pdf.getTextWidth(datos.empleadoNombre)
  pdf.setDrawColor(30, 64, 175)
  pdf.setLineWidth(1)
  pdf.line((ancho - nombreAncho) / 2, 112, (ancho + nombreAncho) / 2, 112)

  // "por haber completado:"
  pdf.setFontSize(12)
  pdf.setTextColor(100, 116, 139)
  pdf.setFont('helvetica', 'normal')
  pdf.text('por haber completado satisfactoriamente el curso:', ancho / 2, 124, { align: 'center' })

  // Nombre curso
  pdf.setFontSize(20)
  pdf.setTextColor(30, 64, 175)
  pdf.setFont('helvetica', 'bold')
  pdf.text(`"${datos.cursoTitulo}"`, ancho / 2, 138, { align: 'center' })

  // Resultado
  pdf.setFontSize(11)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(100, 116, 139)
  pdf.text(`Resultado de evaluación: ${datos.porcentaje}%`, ancho / 2, 150, { align: 'center' })

  // Badge aprobado
  pdf.setFillColor(220, 252, 231)
  pdf.roundedRect(ancho / 2 - 25, 155, 50, 10, 3, 3, 'F')
  pdf.setTextColor(21, 128, 61)
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'bold')
  pdf.text('APROBADO', ancho / 2, 162, { align: 'center' })

  // Firma
  pdf.setDrawColor(100, 116, 139)
  pdf.setLineWidth(0.5)
  pdf.line(ancho / 2 - 35, alto - 38, ancho / 2 + 35, alto - 38)
  pdf.setFontSize(10)
  pdf.setTextColor(100, 116, 139)
  pdf.setFont('helvetica', 'normal')
  pdf.text(datos.empresaNombre, ancho / 2, alto - 33, { align: 'center' })

  const nombreArchivo = `constancia-${datos.empleadoNombre.replace(/\s+/g, '-')}-${datos.cursoTitulo.replace(/\s+/g, '-')}.pdf`
  pdf.save(nombreArchivo)
}